import json

import flask
import numpy as np
from bson import ObjectId
from flask import request
from sklearn.decomposition import PCA
from sklearn.manifold import TSNE, Isomap
from sklearn.preprocessing import MinMaxScaler

import backend.helper.database as database
import backend.helper.clustering as cluster
import backend.helper.caching as caching

anomalies_app = flask.Blueprint("anomalies", __name__)


@anomalies_app.post("extract/<BID>")
def flask_extract_anomalies_bucket(BID):
    db = flask.current_app.config["DB"]
    if not database.verify_id(db, BID, "buckets"):
        return "Bucket not found", 404
    ts_list = database.list_timeseries(db, ObjectId(BID))
    bucket = database.get_bucket(db, ObjectId(BID))
    for ts in ts_list:
        print(f"Processing {ts['name']}")
        database.delete_anomalies(db, ts["_id"], delete_manual_anomalies=False)
        database.extract_anomalies(db, ts["_id"], ObjectId(BID))
    return {"success": True}


@anomalies_app.get("bucket/<BID>")
def flask_get_anomalies_bucket(BID):
    db = flask.current_app.config["DB"]
    if not database.verify_id(db, BID, "buckets"):
        return "Bucket not found", 404
    include_ts_data = True if request.args.get('include_ts_data', False) == "true" else False
    only_manual = True if request.args.get('only_manual', False) == "true" else False
    only_bookmarked = True if request.args.get('only_bookmarked', False) == "true" else False
    anomalies = database.get_anomalies(db, BID=ObjectId(BID), include_ts_data=include_ts_data, only_manual=only_manual,
                                       only_bookmarked=only_bookmarked)
    return database.serialize_mongodb(anomalies)


@anomalies_app.get("ts/<TID>")
def flask_get_anomalies_ts(TID):
    db = flask.current_app.config["DB"]
    if not database.verify_id(db, TID, "timeSeries"):
        return "Timeseries not found", 404
    include_ts_data = request.args.get('include_ts_data', False)
    return database.serialize_mongodb(database.get_anomalies(db, TID=ObjectId(TID), include_ts_data=include_ts_data))


@anomalies_app.delete("anomaly/<AID>")
def flask_delete_anomaly(AID):
    db = flask.current_app.config["DB"]
    if not database.verify_id(db, AID, "anomalies"):
        return "Anomaly not found", 404
    anomaly = database.get_anomaly(db, ObjectId(AID), include_ts_data=False)
    if not anomaly["manual"]:
        return "Only manually created anomalies can be deleted", 400
    database.delete_specific_anomaly(db, ObjectId(AID))
    return {"success": True}


@anomalies_app.get("anomaly/<AID>")
def flask_get_anomaly(AID):
    db = flask.current_app.config["DB"]
    if not database.verify_id(db, AID, "anomalies"):
        return "Anomaly not found", 404
    extension = float(request.args.get('extension', 2))
    return database.serialize_mongodb(database.get_anomaly(db, ObjectId(AID), extension=extension))


@anomalies_app.post("anomaly/update/<AID>")
def flask_update_anomaly(AID):
    db = flask.current_app.config["DB"]
    if not database.verify_id(db, AID, "anomalies"):
        return "Anomaly not found", 404
    rating = json.loads(request.data).get('rating', None)
    keep = json.loads(request.data).get('keep', None)
    bookmark = json.loads(request.data).get('bookmark', None)
    database.update_specific_anomaly(db, ObjectId(AID), rating, keep, bookmark)
    return {"success": True}


@anomalies_app.get("scatter/<BID>")
def flask_scatter_anomaly(BID):
    db = flask.current_app.config["DB"]
    if not database.verify_id(db, BID, "buckets"):
        return "Bucket not found", 404
    data = database.get_anomalies_for_explore(db, ObjectId(BID))
    if len(data) == 0:
        return []
    dtw_mat = cluster.dtw_matrix(BID)
    tsne = TSNE(
        n_components=2,
        metric="precomputed",
        n_jobs=1,
        init="random",
        random_state=42,
        perplexity=min(40, dtw_mat.shape[0] - 1)
    )
    isomap = Isomap(
        n_components=2,
        metric="precomputed",
        n_neighbors=None,
        radius=1
    )
    pos = isomap.fit_transform(dtw_mat)
    pos = MinMaxScaler().fit_transform(pos).tolist()
    for i, anomaly in enumerate(data):
        anomaly["projected"] = {"x": pos[i][0], "y": pos[i][1]}
    return database.serialize_mongodb(data)


@anomalies_app.get("ratings/<BID>")
def flask_get_ratings(BID):
    db = flask.current_app.config["DB"]
    if not database.verify_id(db, BID, "buckets"):
        return "Bucket not found", 404
    data = database.get_ratings(db, ObjectId(BID))
    return database.serialize_mongodb(data)


@anomalies_app.post("anomaly/add")
def flask_add_anomaly():
    db = flask.current_app.config["DB"]
    add_data = json.loads(request.data)
    if not database.verify_id(db, add_data["TID"], "timeSeries"):
        return "Timeseries not found", 404
    database.add_anomaly(db, add_data)
    return {"success": True}


@anomalies_app.post("nominal/add")
def flask_add_nominal():
    db = flask.current_app.config["DB"]
    add_data = json.loads(request.data)
    if not database.verify_id(db, add_data["TID"], "timeSeries"):
        return "Timeseries not found", 404
    res = database.toggle_nominal(db, add_data)
    return {"success": True, "action": res}


@anomalies_app.get("nominals/bucket/<BID>")
def flask_get_nominals_bucket(BID):
    db = flask.current_app.config["DB"]
    if not database.verify_id(db, BID, "buckets"):
        return "Bucket not found", 404
    ts_list = database.list_timeseries(db, ObjectId(BID))
    include_ts_data = True if request.args.get('include_ts_data', False) == "true" else False
    nominals = []
    for ts in ts_list:
        nominals.extend(database.get_nominals(db, ts["_id"], include_ts_data))
    return database.serialize_mongodb(nominals)


@anomalies_app.get("nominals/ts/<tid>")
def flask_get_nominals(tid):
    db = flask.current_app.config["DB"]
    if not database.verify_id(db, tid, "timeSeries"):
        return "Timeseries not found", 404
    include_ts_data = True if request.args.get('include_ts_data', False) == "true" else False
    data = database.get_nominals(db, ObjectId(tid), include_ts_data)
    return database.serialize_mongodb(data)


@anomalies_app.get("nominal/<nid>")
def flask_get_nominal(nid):
    db = flask.current_app.config["DB"]
    if not database.verify_id(db, nid, "nominals"):
        return "Nominal not found", 404
    include_ts_data = True if request.args.get('include_ts_data', False) == "true" else False
    data = database.get_nominal(db, ObjectId(nid), include_ts_data)
    return database.serialize_mongodb(data)


@anomalies_app.delete("nominal/<NID>")
def flask_delete_nominal(NID):
    db = flask.current_app.config["DB"]
    if not database.verify_id(db, NID, "nominals"):
        return "Nominal not found", 404
    database.delete_specific_nominal(db, ObjectId(NID))
    return {"success": True}


@anomalies_app.delete("nominal/date")
def flask_delete_nominal_by_date():
    db = flask.current_app.config["DB"]
    delete_data = json.loads(request.data)
    if not database.verify_id(db, delete_data["TID"], "timeSeries"):
        return "Timeseries not found", 404
    database.delete_nominal_by_date(db, delete_data)
    return {"success": True}


@anomalies_app.get("cluster/<BID>")
def flask_get_cluster(BID):
    cache = caching.get_cluster_tree(BID, "CLUSTERING", "anomalies")
    if cache is not None:
        return cache

    db = flask.current_app.config["DB"]
    if not database.verify_id(db, BID, "buckets"):
        return "Bucket not found", 404
    hier_clust, json_tree = cluster.cluster(BID)
    caching.store_cluster_tree(BID, json_tree, "anomalies")
    return json_tree


@anomalies_app.post("anomaly/reset/<BID>")
def flask_reset_ratings(BID):
    db = flask.current_app.config["DB"]
    if not database.verify_id(db, BID, "buckets"):
        return "Bucket not found", 404
    ts_list = database.list_timeseries(db, ObjectId(BID))
    for ts in ts_list:
        database.reset_ratings(db, ts["_id"])
    return {"success": True}


@anomalies_app.post("anomaly/view/<AID>")
def flask_increase_view(AID):
    db = flask.current_app.config["DB"]
    if not database.verify_id(db, AID, "anomalies"):
        return "Anomaly not found", 404
    database.increase_view(db, ObjectId(AID))
    return {"success": True}


@anomalies_app.post("views/reset/<BID>")
def flask_reset_views(BID):
    db = flask.current_app.config["DB"]
    if not database.verify_id(db, BID, "buckets"):
        return "Bucket not found", 404
    database.reset_views(db, ObjectId(BID))
    return {"success": True}


@anomalies_app.get("dissimilarities/<BID>")
def flask_dissimilarities(BID):
    db = flask.current_app.config["DB"]
    if not database.verify_id(db, BID, "buckets"):
        return "Bucket not found", 404
    k = int(request.args.get('k', 3))
    only_unrated = True if request.args.get('only_unrated', False) == "true" else False
    return database.dissimilar_recommender(db, ObjectId(BID), k, only_unrated)


@anomalies_app.get("recommender/collab/<BID>")
def flask_collab_recommender(BID):
    db = flask.current_app.config["DB"]
    if not database.verify_id(db, BID, "buckets"):
        return "Bucket not found", 404
    k = int(request.args.get('k', 5))
    collab_filter = database.collab_filtering(db, ObjectId(BID), k)
    return database.serialize_mongodb(collab_filter)


@anomalies_app.get("recommender/severities/<BID>")
def flask_severities_recommender(BID):
    db = flask.current_app.config["DB"]
    if not database.verify_id(db, BID, "buckets"):
        return "Bucket not found", 404
    sev_sort_result = database.severities_sort(db, ObjectId(BID))
    return database.serialize_mongodb(sev_sort_result)


@anomalies_app.get("heatmap/<BID>/<channel>/<mode>")
def flask_heatmap(BID, channel, mode):
    db = flask.current_app.config["DB"]
    if not database.verify_id(db, BID, "buckets"):
        return "Bucket not found", 404
    return database.get_heatmap_data(db, ObjectId(BID), channel, mode)


@anomalies_app.get("binary/<AID>")
def flask_binary_anomalies(AID):
    db = flask.current_app.config["DB"]
    segments = flask.request.args.get("segments", None)
    if segments is not None:
        segments = int(segments)
    if not database.verify_id(db, AID, "anomalies"):
        return "Anomaly not found", 404
    return database.get_binary_anomaly_ts(db, ObjectId(AID), n_segments=segments)


@anomalies_app.get("project/<BID>")
def flask_project(BID):
    dtw_mat = cluster.dtw_matrix(BID)
    tsne = TSNE(
        n_components=2,
        metric="precomputed",
        n_jobs=1,
        init="random"
    )
    pos = tsne.fit_transform(dtw_mat)
    return pos.tolist()
