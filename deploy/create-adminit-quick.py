#!/usr/bin/env python3
import sys, os, datetime
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'api-server', 'django'))
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), '..', 'api-server', 'django', '.env'))
import bcrypt
from pymongo import MongoClient

MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
MONGODB_DB  = os.getenv("MONGODB_DB_NAME", "radiology_platform")

EMAIL    = "adminit@reportease.com"
PASSWORD = "AdminIT123!!"

client = MongoClient(MONGODB_URI)
users  = client[MONGODB_DB]["users"]

users.delete_one({"email": EMAIL})

now = datetime.datetime.utcnow().isoformat()
users.insert_one({
    "email":     EMAIL,
    "password":  bcrypt.hashpw(PASSWORD.encode(), bcrypt.gensalt()).decode(),
    "role":      "adminIT",
    "nom":       "AdminIT",
    "prenom":    "Super",
    "genre":     "",
    "status":    "validated",
    "avatar":    None,
    "createdAt": now,
    "updatedAt": now,
})
print(f"[✔] AdminIT created: {EMAIL} / {PASSWORD}")
