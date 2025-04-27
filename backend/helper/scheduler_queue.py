import json

import redis
from bson import ObjectId
from pymongo.database import Database

from backend.helper.config import get_redis_keys, get_config
from backend.helper.database import list_timeseries


def get_queue_list(redis_client, queue):
    return [item.decode('utf-8') for item in redis_client.lrange(queue, 0, -1)]


def get_bucket_status(redis_client, bucket):
    redis_keys = get_redis_keys()
    r_key = f"{redis_keys['ANOMALY_CALC_STATUS']}:{bucket}"
    if not redis_client.exists(r_key):
        return {"message": "idle", "current": 0, "total": 0}
    return json.loads(redis_client.get(r_key))


def get_currently_executing(redis_client, channel):
    return {key.decode().replace(f"{channel}:", ""): json.loads(redis_client.get(key)) for key in redis_client.scan_iter(f"{channel}:*")}


def clear_currently_executing(redis_client, channel):
    for key in redis_client.scan_iter(f"{channel}:*"):
        redis_client.delete(key)


def enqueue_bucket(redis_client, bid):
    redis_keys = get_redis_keys()
    if (bid not in get_queue_list(redis_client, redis_keys["ANOMALY_CALC_QUEUE"])
            and bid not in get_currently_executing(redis_client, redis_keys["ANOMALY_CALC_STATUS"])):
        redis_client.rpush(redis_keys["ANOMALY_CALC_QUEUE"], bid)


def filter_processing_dict(db: Database, bucket: str, proc_dict):
    ts_list = [str(ts["_id"]) for ts in list_timeseries(db, ObjectId(bucket))]
    result = {}
    for ts in ts_list:
        if ts in proc_dict:
            result[ts] = proc_dict[ts]
    if bucket in proc_dict:
        result[bucket] = proc_dict[bucket]
    return result


if __name__ == '__main__':
    conf = get_config()
    r = redis.Redis(host=conf["scheduler"]["redis"]["host"], port=conf["scheduler"]["redis"]["port"], db=1)
    res = get_bucket_status(r, "67ea58e9b37c191974439796")
    print(res)
