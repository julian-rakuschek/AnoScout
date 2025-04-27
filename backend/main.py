import os
from pathlib import Path

import flask
import pymongo
from flask_cors import CORS

from modules.scheduler_queue import queue_app
from modules.database import db_app
from modules.anomalies import anomalies_app
from modules.algoVis import algoVis_app
import helper.database as database

app = flask.Flask(__name__)
app.config['SECRET_KEY'] = "hi mum"
cors = CORS(app, supports_credentials=True)
app.config['CORS_HEADERS'] = 'Content-Type'
app.config['DB'] = database.get_db()

app.register_blueprint(db_app, url_prefix="/api/db")
app.register_blueprint(queue_app, url_prefix="/api/queue")
app.register_blueprint(anomalies_app, url_prefix="/api/anomalies")
app.register_blueprint(algoVis_app, url_prefix="/api/algovis")


@app.route("/")
@app.route("/<path:path>")
def flask_main(path=None):
    dist_path = os.path.join(Path(__file__).parents[1], "frontend", "dist")
    if path is not None and os.path.exists(os.path.join(dist_path, path)):
        dist_path = os.path.join(dist_path, path)
        return flask.send_file(dist_path)
    return flask.send_from_directory(dist_path, "index.html")



if __name__ == '__main__':
    app.run(debug=True)
