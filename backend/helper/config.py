import json
from pathlib import Path

import pymongo
from bson import ObjectId
from pymongo.database import Database


def get_config():
    with open(f"{str(Path(__file__).parents[1])}/config.json", "r", encoding="utf-8") as f:
        return json.load(f)


def get_redis_keys():
    conf = get_config()
    return conf["scheduler"]["redis"]["keys"]
