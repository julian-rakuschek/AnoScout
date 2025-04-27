import os

import flask
import redis
from bson import ObjectId

import backend.helper.database as database
import backend.helper.scheduler_queue as scheduler_queue

from backend.helper.config import get_redis_keys, get_config

queue_app = flask.Blueprint("scheduler_queue", __name__)
conf = get_config()
redis_host = conf["scheduler"]["redis"]["host"]
if os.environ.get('DOCKER', "False") == 'True':
    redis_host = "anoscout_redis"
r = redis.Redis(host=redis_host, port=conf["scheduler"]["redis"]["port"], db=1)

redis_keys = get_redis_keys()

ANOMALY_CALC_QUEUE = redis_keys["ANOMALY_CALC_QUEUE"]
ANOMALY_CALC_STATUS = redis_keys["ANOMALY_CALC_STATUS"]
ANOMALY_CALC_ERRORED = redis_keys["ANOMALY_CALC_ERRORED"]


@queue_app.get("/")
def flask_get_queue():
    return scheduler_queue.get_queue_list(r, ANOMALY_CALC_QUEUE)


@queue_app.post("enqueue/<bucket>")
def flask_enqueue_bucket(bucket):
    db = flask.current_app.config["DB"]
    if not database.verify_id(db, bucket, "buckets"):
        return "Bucket not found", 404
    scheduler_queue.enqueue_bucket(r, bucket)
    return {"success": True}


@queue_app.get("status/<bucket>")
def flask_bucket_status(bucket):
    db = flask.current_app.config["DB"]
    if not database.verify_id(db, bucket, "buckets"):
        return "Bucket not found", 404
    return scheduler_queue.get_bucket_status(r, bucket)


@queue_app.post("reset/<bucket>")
def flask_bucket_reset_status(bucket):
    db = flask.current_app.config["DB"]
    if not database.verify_id(db, bucket, "buckets"):
        return "Bucket not found", 404
    r.delete(f"{ANOMALY_CALC_STATUS}:{bucket}")
    r.delete(f"{ANOMALY_CALC_ERRORED}:{bucket}")
    return {"success": True}


@queue_app.get("errored/<bucket>")
def flask_queue_errored(bucket):
    db = flask.current_app.config["DB"]
    if not database.verify_id(db, bucket, "buckets"):
        return "Bucket not found", 404
    proc_dict = {
        **scheduler_queue.get_currently_executing(r, ANOMALY_CALC_ERRORED)
    }
    db = flask.current_app.config["DB"]
    return scheduler_queue.filter_processing_dict(db, bucket, proc_dict)

