import json
import os
import threading
import time
from datetime import datetime

import redis
from bson import ObjectId
from pymongo.database import Database

import backend.anomaly_detection.Classification.KDE as KDE
import backend.anomaly_detection.Classification.OCNN as OCNN
import backend.helper.database as database
from backend.anomaly_detection.AnomalyScoring import score_timeseries
from backend.helper.config import get_config, get_redis_keys

conf = get_config()
redis_keys = get_redis_keys()
ANOMALY_CALC_QUEUE = redis_keys["ANOMALY_CALC_QUEUE"]
ANOMALY_CALC_STATUS = redis_keys["ANOMALY_CALC_STATUS"]
ANOMALY_CALC_ERRORED = redis_keys["ANOMALY_CALC_ERRORED"]
os.chdir(os.path.abspath(os.path.dirname(__file__)))
log_file_global = open(conf["scheduler"]["logfile"], "a")

def log(log_file, type_, message):
    timestamp = datetime.now().isoformat()
    if conf["scheduler"]["logging_enabled"]:
        log_file.write(f"[{timestamp}] [{type_}] {message}\n")
        log_file.flush()
    print(f"[{timestamp}] [{type_}] {message}")

def processClassificationBucket(BID: ObjectId, r: redis.Redis, db: Database):
    algorithms = database.get_bucket_algorithms(db, BID)
    channels = database.bucket_channels(db, BID)
    status = {"message": "preparing", "current": 0, "total": channels * len(algorithms)}
    r_key = f"{ANOMALY_CALC_STATUS}:{str(BID)}"
    r.set(r_key, json.dumps(status))
    for channel in channels:
        for algo in algorithms:
            log(log_file_global, f"CLASSIFICATION", f"{str(BID)} - {algo['name']}")
            status["message"] = f"{channel} {algo['name']}"
            r.set(r_key, json.dumps(status))
            algorithm_config = {k: algo["parameters"][k]["value"] for k in algo["parameters"]}
            if algo["algorithm"] == "J-K-NN":
                OCNN.classify_bucket(db, BID, channel, algorithm_config, algo["_id"])
            elif algo["algorithm"] == "KDE":
                KDE.classify_bucket(db, BID, channel, algorithm_config, algo["_id"])
            else:
                raise Exception(f"Unknown algorithm {algo['algorithm']}")
            status["current"] += 1
            r.set(r_key, json.dumps(status))
    status["message"] = f"Done"
    r.set(r_key, json.dumps(status))
    log(log_file_global, f"CLASSIFICATION", f"{str(BID)} - DONE")

def processScoringBucket(BID: ObjectId, r: redis.Redis, db: Database):
    algorithms = database.get_bucket_algorithms(db, BID)
    ts_list = database.list_timeseries(db, BID)
    status = {"message": "preparing", "current": 0, "total": len(ts_list) * len(algorithms)}
    r_key = f"{ANOMALY_CALC_STATUS}:{str(BID)}"
    r.set(r_key, json.dumps(status))

    for algo in algorithms:
        algorithm_config = {k: algo["parameters"][k]["value"] for k in algo["parameters"]}
        if algo["type"] != "scoring":
            continue
        for ts in ts_list:
            log(log_file_global, f"SCORING", f"{ts['name']} - {algo['name']}")
            status["message"] = f"{ts['name']} {algo['name']}"
            r.set(r_key, json.dumps(status))
            score_timeseries(db, ts["_id"], algorithm_config, algo["algorithm"], algo["_id"])
            status["current"] += 1
            r.set(r_key, json.dumps(status))
    status["message"] = f"Done"
    r.set(r_key, json.dumps(status))
    log(log_file_global, f"SCORING", f"{str(BID)} - DONE")

# ----------------------------------------------------------------------------------------------------------------------
class AnomalyCalculatorScheduler(threading.Thread):
    def __init__(self, redis_instance: redis.Redis, db: Database):
        threading.Thread.__init__(self)
        self.redis = redis_instance
        self.db = db
        self.redis.delete(ANOMALY_CALC_QUEUE)
        for key in r.scan_iter(f"{ANOMALY_CALC_STATUS}:*"):
            r.delete(key)
        for key in r.scan_iter(f"{ANOMALY_CALC_ERRORED}:*"):
            r.delete(key)
        log(log_file_global, "ANOMALY SCHEDULER", "Initialized")

    def run(self):
        while True:
            # Check if the queue is empty
            if not self.redis.lrange(ANOMALY_CALC_QUEUE, 0, 0):
                time.sleep(0.5)
                continue
            item = self.redis.lpop(ANOMALY_CALC_QUEUE)
            if item is None:
                continue
            bid = item.decode('utf-8')
            self.redis.lrem(ANOMALY_CALC_QUEUE, 0, bid)
            log(log_file_global, f"SCHEDULER", f"Handling anomaly calculation for bucket {bid}")
            bucket = database.get_bucket(self.db, ObjectId(bid))
            try:
                if bucket["type"] == "scoring":
                    processScoringBucket(ObjectId(bid), self.redis, self.db)
                else:
                    processClassificationBucket(ObjectId(bid), self.redis, self.db)
            except Exception as e:
                status = {"message": "error", "current": 0, "total": 0, "error": str(e)}
                r_key = f"{ANOMALY_CALC_STATUS}:{bid}"
                r.set(r_key, json.dumps(status))


# ----------------------------------------------------------------------------------------------------------------------
if __name__ == "__main__":
    try:
        redis_host = conf["scheduler"]["redis"]["host"]
        if os.environ.get('DOCKER', "False") == 'True':
            redis_host = "anoscout_redis"
        r = redis.Redis(host=redis_host, port=conf["scheduler"]["redis"]["port"], db=1)
        db: Database = database.get_db()
        clientCalculator = AnomalyCalculatorScheduler(r, db)
        clientCalculator.start()
        clientCalculator.join()
    except KeyboardInterrupt:
        print('\033[31;1;4mInterrupted\033[0m')
        log(log_file_global, "SCHEDULER", "Received Keyboard Interrupt\n"
                                          "--------------------------------------------------------")
        log_file_global.close()
        # the normal exit(0) is not sufficient to kill all threads, os._exit(0) is a bit more brutal
        os._exit(0)
