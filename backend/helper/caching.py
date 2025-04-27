import json
import os
import pickle

import numpy as np
import redis

from backend.helper.config import get_config

conf = get_config()
redis_host = conf["scheduler"]["redis"]["host"]
if os.environ.get('DOCKER', "False") == 'True':
    redis_host = "anoscout_redis"
r = redis.Redis(host=redis_host, port=conf["scheduler"]["redis"]["port"], db=1)

CACHE_CLUSTERING = conf["cache"]["keys"]["CLUSTERING"]
CACHE_DTW = conf["cache"]["keys"]["DTW"]


def invalidate_caches(BID: str):
    for key in r.scan_iter(f"{CACHE_CLUSTERING}:{BID}:*"):
        r.delete(key)
    for key in r.scan_iter(f"{CACHE_DTW}:{BID}:*"):
        r.delete(key)


def store_cluster_tree(BID: str, tree, anomalies_or_timeseries: str):
    if r is not None:
        r.set(f"{CACHE_CLUSTERING}:{str(BID)}:{anomalies_or_timeseries}", json.dumps(tree))


def get_cluster_tree(BID: str, key: str, anomalies_or_timeseries: str):
    if key not in conf["cache"]["keys"]:
        raise KeyError("Cache key not found")
    if r is not None:
        cache = r.get(f'{conf["cache"]["keys"][key]}:{str(BID)}:{anomalies_or_timeseries}')
        if cache is not None:
            return json.loads(cache)
    return None


def store_dtw_matrix(BID: str, dtw: np.array, anomalies_or_timeseries: str):
    if r is not None:
        r.set(f"{CACHE_DTW}:{str(BID)}:{anomalies_or_timeseries}", pickle.dumps(dtw))


def get_dtw_matrix(BID: str, anomalies_or_timeseries: str):
    if r is not None:
        cache = r.get(f'{CACHE_DTW}:{str(BID)}:{anomalies_or_timeseries}')
        if cache is not None:
            dtw = pickle.loads(cache)
            return dtw
    return None


if __name__ == '__main__':
    invalidate_caches("68078e56ed3882b302ae3b2a")
