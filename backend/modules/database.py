import copy
import io
import json
import os

import numpy as np
import redis
from dateutil import parser
from pathlib import Path

import flask
from bson import json_util, ObjectId

from flask import request, redirect
from matplotlib.backends.backend_template import FigureCanvas
from matplotlib.figure import Figure
from tslearn.barycenters import softdtw_barycenter, euclidean_barycenter
from tslearn.preprocessing import TimeSeriesResampler
from werkzeug.utils import secure_filename
import backend.helper.database as database
import backend.helper.clustering as clustering
from backend.helper.config import get_config

db_app = flask.Blueprint("db", __name__)

ALLOWED_EXTENSIONS = {'csv', 'txt'}


@db_app.get("bucket/list")
def flask_get_mongodb_buckets():
    db = flask.current_app.config["DB"]
    buckets = database.list_buckets(db)
    return database.serialize_mongodb(buckets)


@db_app.get("bucket/channels/<BID>")
def flask_get_mongodb_bucket_channels(BID):
    db = flask.current_app.config["DB"]
    if not database.verify_id(db, BID, "buckets"):
        return "Bucket not found", 404
    channels = database.bucket_channels(db, ObjectId(BID))
    return channels


@db_app.get("bucket/<bucket>")
def flask_get_mongodb_bucket(bucket):
    db = flask.current_app.config["DB"]
    if not database.verify_id(db, bucket, "buckets"):
        return "Bucket not found", 404
    bucket = database.get_bucket(db, ObjectId(bucket))
    return database.serialize_mongodb(bucket)


@db_app.post("bucket/create")
def flask_create_bucket():
    db = flask.current_app.config["DB"]
    name = json.loads(request.data).get("name", False)
    type_ = json.loads(request.data).get("type", "scoring")
    classification_granularity = json.loads(request.data).get("classification_granularity", "full")
    if not name:
        return "name is not set", 400
    if type_ != "scoring" and type_ != "classification":
        return "type must be either scoring or classification", 400
    database.create_bucket(db, name, type_, classification_granularity)
    return {"success": True}


@db_app.post("bucket/update")
def flask_update_bucket():
    db = flask.current_app.config["DB"]
    id_ = json.loads(request.data).get("id", False)

    if not id_:
        return "id is not set", 400
    if not database.verify_id(db, id_, "buckets"):
        return "Bucket not found", 404

    name = json.loads(request.data).get("name", False)
    threshold = json.loads(request.data).get("threshold", False)
    smoothing_window = json.loads(request.data).get("smoothing_window", False)
    classification_ensemble = json.loads(request.data).get("classification_ensemble", False)

    if name:
        database.rename_bucket(db, ObjectId(id_), name)
    if smoothing_window:
        database.set_smoothing_window(db, ObjectId(id_), smoothing_window)
    if threshold:
        database.set_threshold(db, ObjectId(id_), threshold)
    if classification_ensemble:
        database.set_classification_ensemble(db, ObjectId(id_), classification_ensemble)

    return {"success": True}


@db_app.delete("bucket/delete")
def flask_delete_bucket():
    db = flask.current_app.config["DB"]
    id_ = json.loads(request.data).get("id", False)
    if not id_:
        return "id is not set", 400
    if not database.verify_id(db, id_, "buckets"):
        return "Bucket not found", 404
    database.delete_bucket(db, ObjectId(id_))
    return {"success": True}


@db_app.get("bucket/<BID>/algorithms")
def flask_get_bucket_algorithms(BID):
    db = flask.current_app.config["DB"]
    algos = database.get_bucket_algorithms(db, ObjectId(BID))
    return database.serialize_mongodb(algos)


@db_app.post("bucket/<BID>/algorithms")
def flask_create_bucket_algorithm(BID):
    db = flask.current_app.config["DB"]
    name = json.loads(request.data).get("name", False)
    algo = json.loads(request.data).get("algo", False)
    if not name:
        return "name is not set", 400
    if not algo:
        return "algorithm not provided", 400
    conf = get_config()
    if algo not in conf["algorithms"]:
        return "algorithm not available", 400
    AlgoID = database.add_algorithm(db, ObjectId(BID), algo, name)
    params = json.loads(request.data).get("params", False)
    if params:
        base_conf = copy.deepcopy(conf["algorithms"][algo]["parameters"])
        for key in params:
            base_conf[key]["value"] = params[key]
        database.update_algorithm(db, ObjectId(AlgoID), {"parameters": base_conf})
    return {"success": True}


@db_app.get("bucket/<BID>/score_distribution/<channel>")
def flask_bucket_score_distribution(BID, channel):
    db = flask.current_app.config["DB"]
    hist = database.get_score_distribution(db, ObjectId(BID), channel)
    return hist


@db_app.get("bucket/<BID>/cluster/<channel>")
def flask_cluster_bucket(BID, channel):
    hier_clust, json_tree = clustering.cluster(ObjectId(BID), "timeseries", channel)
    return database.serialize_mongodb(json_tree)


@db_app.get("bucket/<BID>/minmax/<channel>")
def flask_bucket_minmax(BID, channel):
    db = flask.current_app.config["DB"]
    if not database.verify_id(db, BID, "buckets"):
        return "Bucket not found", 404
    min_value, max_value, histogram = database.bucket_minmax(db, ObjectId(BID), channel)
    return {"min": min_value, "max": max_value, "hist": histogram}


@db_app.post("algorithms/<AlgoID>/weight/<weight>")
def flask_update_algo_weight(AlgoID, weight):
    db = flask.current_app.config["DB"]
    database.update_algorithm(db, ObjectId(AlgoID), {"weight": float(weight)})
    return {"success": True}


@db_app.post("algorithms/<AlgoID>/params")
def flask_update_algo_params(AlgoID):
    db = flask.current_app.config["DB"]
    params = json.loads(request.data).get("params", False)
    if params:
        print(params)
        database.update_algorithm(db, ObjectId(AlgoID), {"parameters": params})
    return {"success": True}


@db_app.delete("algorithms/<AlgoID>")
def flask_delete_algo(AlgoID):
    db = flask.current_app.config["DB"]
    database.delete_algorithm(db, ObjectId(AlgoID))
    return {"success": True}


@db_app.get("ts/list/<bucket_id>")
def flask_get_ts_of_bucket(bucket_id):
    db = flask.current_app.config["DB"]
    if not database.verify_id(db, bucket_id, "buckets"):
        return "Bucket not found", 404
    ts = database.list_timeseries(db, ObjectId(bucket_id))
    return database.serialize_mongodb(ts)


@db_app.get("ts/<timeseries_id>")
def flask_get_ts(timeseries_id):
    db = flask.current_app.config["DB"]
    if not database.verify_id(db, timeseries_id, "timeSeries"):
        return "Timeseries not found", 404
    ts = database.get_timeseries(db, ObjectId(timeseries_id))
    return database.serialize_mongodb(ts)


@db_app.post("ts/update")
def flask_update_ts():
    db = flask.current_app.config["DB"]
    id_ = json.loads(request.data).get("id", False)
    name = json.loads(request.data).get("name", False)

    if not id_:
        return "id is not set", 400
    if not database.verify_id(db, id_, "timeSeries"):
        return "Timeseries not found", 404
    if name:
        database.rename_timeseries(db, ObjectId(id_), name)

    return {"success": True}


@db_app.delete("ts/delete")
def flask_delete_ts():
    db = flask.current_app.config["DB"]
    id_ = json.loads(request.data).get("id", False)
    if not id_:
        return "id is not set", 400
    if not database.verify_id(db, id_, "timeSeries"):
        return "Timeseries not found", 404
    database.delete_timeseries(db, ObjectId(id_))
    return {"success": True}


@db_app.post("ts/import")
def flask_import_ts():
    db = flask.current_app.config["DB"]

    def allowed_file(filename):
        return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

    if request.method == "POST":
        if 'file' not in request.files:
            print("No file part")
            return redirect(request.url)
        file = request.files['file']
        bucket = request.form["bucket"]
        if file.filename == "":
            return "Filename must not be empty", 400
        if not allowed_file(file.filename):
            return "This file extension is not allowed", 400
        if file:
            filename = secure_filename(file.filename).replace(".csv", "")
            file_content = file.read()
            items, channels = database.parse_csv(file_content.decode())
            ts = database.create_timeseries_entry(db, ObjectId(bucket), filename, channels)
            try:
                database.import_timeseries(db, items, ts, ObjectId(bucket))
            except Exception as e:
                print(e)
                database.delete_timeseries(db, ts)
                return "Error importing timeseries", 500
            return filename, 200
        return "File upload failed", 400
    elif request.method == "GET":
        return "Hi", 200


@db_app.get("ts/channels/<timeseries>")
def flask_channels(timeseries):
    db = flask.current_app.config["DB"]
    if not database.verify_id(db, timeseries, "timeSeries"):
        return "Timeseries not found", 404
    channels = database.get_timeseries_channels(db, ObjectId(timeseries))
    return channels


@db_app.get("ts/query/<timeseries>")
def flask_query_timeseries(timeseries):
    db = flask.current_app.config["DB"]
    if not database.verify_id(db, timeseries, "timeSeries"):
        return "Timeseries not found", 404
    from_ = request.args.get('from', None)
    to = request.args.get('to', None)
    channel = request.args.get('channel', None)
    if channel is None:
        return "Missing channel", 400
    if from_ is not None:
        from_ = parser.parse(from_)
    if to is not None:
        to = parser.parse(to)
    n_segments = request.args.get("n_segments", None)
    if n_segments is not None:
        n_segments = int(n_segments)
    data = database.query_timeseries(db, ObjectId(timeseries), from_=from_, to_=to, n_segments=n_segments, channel=channel)
    return data


@db_app.post("ts/query/list")
def flask_query_timeseries_list():
    db = flask.current_app.config["DB"]
    ts_list = json.loads(flask.request.data)
    if len(ts_list) == 0:
        return []
    channel = request.args.get('channel', None)
    n_segments = int(request.args.get("n_segments", 1000))
    BID = request.args.get("BID", None)
    if not database.verify_id(db, BID, "buckets"):
        return "Bucket not found", 404
    bucket = database.get_bucket(db, ObjectId(BID))
    ts_values = database.query_ts_list(db, ts_list, channel, n_segments)

    scores, ratios = database.query_ts_list_anomaly_scores(db, ts_list, channel, n_segments=100)
    ratios = [{"algo": r["algo"], "ratio": r["score_sum"]} for r in ratios]
    if bucket["type"] == "classification":
        ratios = database.query_ts_list_classifications(db, ts_list, channel)
    ts_values["barycenter_scores"] = scores
    ts_values["sensitivity"] = ratios
    return ts_values


@db_app.post("ts/query/list/image")
def flask_query_timeseries_list_image():
    ts_data = json.loads(flask.request.data)
    if "barycenter_scores" in ts_data:
        del ts_data["barycenter_scores"]
    if "sensitivity" in ts_data:
        del ts_data["sensitivity"]
    axis = str(request.args.get("axis", "false")) == "true"
    fig = Figure()
    fig.set_size_inches(10, 4)
    ax = fig.subplots()
    if not axis:
        ax.set_axis_off()
    if "barycenter_values" in ts_data:
        ax.set_xlim([0, len(ts_data["barycenter_values"])])
    for key, value in ts_data.items():
        if key == "barycenter_values" and len(ts_data.keys()) - 1 == 1:
            continue
        color = "#304ffe" if key == "barycenter_values" else "black"
        alpha = 1 if key == "barycenter_values" or len(ts_data.keys()) - 1 == 1 else 0.2
        linewidth = 4 if key == "barycenter_values" else 1
        ax.plot(value, color=color, alpha=alpha, linewidth=linewidth)
    buf = io.BytesIO()
    fig.savefig(buf, format='png', bbox_inches='tight', dpi=100)
    buf.seek(0)
    fig.clf()
    return flask.send_file(
        buf,
        as_attachment=False,
        download_name='heatmap.png',
        mimetype='image/png'
    )


@db_app.get("ts/classifications/<timeseries>")
def flask_get_classifications(timeseries):
    db = flask.current_app.config["DB"]
    if not database.verify_id(db, timeseries, "timeSeries"):
        return "Timeseries not found", 404
    channel = request.args.get('channel', None)
    if channel is None:
        return "Missing channel", 400
    classifications = database.get_classifications(db, ObjectId(timeseries), channel)
    return database.serialize_mongodb(classifications)


@db_app.get("ts/classifications/<timeseries>/segments")
def flask_get_classifications_per_segment(timeseries):
    db = flask.current_app.config["DB"]
    if not database.verify_id(db, timeseries, "timeSeries"):
        return "Timeseries not found", 404
    channel = request.args.get('channel', None)
    if channel is None:
        return "Missing channel", 400
    classifications = database.get_classifications_per_segment(db, ObjectId(timeseries), channel)
    return database.serialize_mongodb(classifications)


@db_app.get("ts/zoomlevel/<timeseries>")
def flask_zoomlevel_timeseries(timeseries):
    db = flask.current_app.config["DB"]
    if not database.verify_id(db, timeseries, "timeSeries"):
        return "Timeseries not found", 404
    from_ = request.args.get('from', None)
    to = request.args.get('to', None)
    from_ = parser.parse(from_) if from_ is not None else None
    to = parser.parse(to) if from_ is not None else None
    return flask.jsonify(database.calculate_zoom_level(db, ObjectId(timeseries), from_, to))
