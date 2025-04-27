import os

import pymongo
from pymongo.database import Database

from backend.helper.config import get_config
from backend.helper.database import init_db

conf = get_config()
url = conf["mongo"]["url"]
if os.environ.get('DOCKER', "False") == 'True':
    url = "mongodb://anoscout_mongodb:27017/"
conn = pymongo.MongoClient(url)
db: Database = conn[conf["mongo"]["db"]]
if 'AnoScoutDB' not in conn.list_database_names():
    init_db(db)
