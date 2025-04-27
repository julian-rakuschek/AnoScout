import numpy as np
from tqdm import tqdm

import backend.helper.database as database

def pump_into_anoscout(bucket_name):
    db = database.get_db()
    existing_bucket = db["buckets"].find_one({"name": bucket_name})
    if existing_bucket:
        database.delete_bucket(db, existing_bucket["_id"])
    BID = database.create_bucket(db, bucket_name, "classification", "full")

    data = np.loadtxt("Wafer_TRAIN.txt")
    time_series = data[:, 1:]
    labels = data[:, 0]

    for idx, ts in tqdm(enumerate(time_series)):
        # if idx > 200:
        #     break
        name = f"{str(idx).zfill(4)}-{"Anomaly" if labels[idx] == -1 else "Normal"}"
        TID = database.create_timeseries_entry(db, BID, name, ["value-0"])
        items = [{"value-0": t} for t in ts]
        database.import_timeseries(db, items, TID, BID)


if __name__ == '__main__':
    pump_into_anoscout("Wafer")
