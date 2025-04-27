import json
import math

import dtaidistance
import numpy as np
import scipy.cluster.hierarchy as hierarchy
import scipy.spatial.distance as ssd
from bson import ObjectId
from sklearn.preprocessing import MinMaxScaler

import backend.helper.caching as caching
import backend.helper.database as database


def get_anomaly_data_for_clustering(BID):
    db = database.get_db()
    anomalies = database.get_anomalies(db, BID=ObjectId(BID), include_ts_data=True)
    tsData, meta = [], []
    length_score_norm = []
    for anomaly in anomalies:
        tsData.append(np.array([ts["value"] for ts in anomaly["ts_data"]], dtype='float'))
        meta.append({
            "AID": str(anomaly["_id"]),
            "score": anomaly["score"],
            "length": anomaly["length"],
            "rating": anomaly["rating"],
        })
        length_score = math.sqrt(pow(anomaly["length"], 2) + pow(anomaly["score"], 2))
        length_score_norm.append(length_score)
    if len(length_score_norm) > 0:
        length_score_norm = list(MinMaxScaler().fit_transform(np.array(length_score_norm).reshape(-1, 1)))
    for idx, item in enumerate(meta):
        item["length_score"] = float(length_score_norm[idx])
    return tsData, meta


def get_ts_data_for_clustering(BID, channel):
    db = database.get_db()
    data = database.get_all_bucket_ts(db, BID, channel)
    tsData, meta = [], []
    for ts in data:
        values = np.array(ts["values"])
        meta.append({
            "TID": str(ts["_id"]),
            "name": ts["name"],
        })
        tsData.append(values)
    return tsData, meta


def get_clustering_data(BID, anomalies_or_timeseries="anomalies", channel=None):
    if anomalies_or_timeseries == "anomalies":
        tsData, meta = get_anomaly_data_for_clustering(BID)
    elif anomalies_or_timeseries == "timeseries":
        if channel is None:
            raise ValueError("channel must be specified")
        tsData, meta = get_ts_data_for_clustering(BID, channel)
    else:
        raise ValueError("unknown anomalies or timeseries type")
    return tsData, meta


def dtw_matrix(BID, tsData=None, anomalies_or_timeseries="anomalies", channel=None):
    y = caching.get_dtw_matrix(BID, anomalies_or_timeseries)
    if y is not None:
        return y
    if tsData is None:
        tsData, _ = get_clustering_data(BID, anomalies_or_timeseries, channel)
    y = dtaidistance.dtw.distance_matrix_fast(tsData)
    caching.store_dtw_matrix(BID, y, anomalies_or_timeseries)
    return y


def cluster(BID, anomalies_or_timeseries="anomalies", channel=None):
    tsData, meta = get_clustering_data(BID, anomalies_or_timeseries, channel)
    if len(tsData) == 0:
        return None, {}

    def convert_tree(node):
        if node.left is None and node.right is None:
            return {"id": node.id, "meta": meta[node.id]}
        left = convert_tree(node.left)
        right = convert_tree(node.right)
        return {"id": node.id, "dist": node.dist, "left": left, "right": right}

    y = dtw_matrix(BID, tsData, anomalies_or_timeseries, channel)
    distArray = ssd.squareform(y)
    hier_clust = hierarchy.linkage(distArray, method="ward")
    linkage_tree = hierarchy.to_tree(hier_clust)
    json_tree = convert_tree(linkage_tree)
    return hier_clust, json_tree



if __name__ == "__main__":
    BID = "67e51223793e540b137faae6"
    hier_clust, json_tree = cluster(ObjectId(BID), "timeseries", "value")
    # with open("res.json", "w") as f:
    #     f.write(json.dumps(json_tree, indent=4))
    # hier_clust, json_tree = cluster(BID)
    # caching.store_cluster_tree(BID, json_tree)
    # print(json_tree)
    # cluster(BID)
