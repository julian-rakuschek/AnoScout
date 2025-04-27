import flask
from bson import ObjectId
from flask import request

import backend.helper.database as database
from backend.anomaly_detection.Classification.KDE import KDE
from backend.anomaly_detection.Classification.OCNN import OCNN

algoVis_app = flask.Blueprint("algoVis", __name__)


@algoVis_app.get("OCNN/<BID>/<channel>")
def flask_ocnn(BID, channel):
    j = int(request.args.get('j', 1))
    k = int(request.args.get('k', 1))
    segments = OCNN(ObjectId(BID), channel, j, k, 10).compute_all_segments()
    for s in segments:
        s["values"] = s["values"].tolist()
        s["dbr"] = s["dbr"].tolist()
    return database.serialize_mongodb(segments)


@algoVis_app.get("KDE/<BID>/<channel>")
def flask_kde(BID, channel):
    bandwidth = float(request.args.get('bandwidth', 5))
    threshold = float(request.args.get('threshold', 0.7))
    result = KDE(ObjectId(BID), channel, bandwidth, threshold).get_grid_scoring()
    result["xx"] = result["xx"].tolist()
    result["yy"] = result["yy"].tolist()
    result["zz"] = result["zz"].tolist()
    result["components"] = result["components"].tolist()
    for s in result["segments"]:
        s["values"] = s["values"].tolist()
        s["dbr"] = s["dbr"].tolist()
    return database.serialize_mongodb(result)

@algoVis_app.get("KDE/<BID>/<channel>/heatmap")
def flask_kde_heatmap(BID, channel):
    bandwidth = float(request.args.get('bandwidth', 1))
    threshold = float(request.args.get('threshold', 0.2))
    img_width = int(request.args.get('img_width', 1000))
    img_height = int(request.args.get('img_height', 1000))
    result = KDE(ObjectId(BID), channel, bandwidth, threshold)
    img = result.vis_2d_grid_2(img_width, img_height)
    return flask.send_file(img, mimetype='image/png')
