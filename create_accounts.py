#!/usr/bin/env python3
"""Recreate admin and adminIT accounts in local MongoDB."""
import datetime
import bcrypt
from pymongo import MongoClient

MONGODB_URI = "mongodb://localhost:27017"
DB_NAME     = "radiology_platform"

ACCOUNTS = [
    {"email": "admin@radio.com",   "role": "admin",   "nom": "Admin",   "prenom": "Radio"},
    {"email": "adminit@radio.com", "role": "adminIT", "nom": "AdminIT", "prenom": "Radio"},
]
PASSWORD = "Admin123!!"

client = MongoClient(MONGODB_URI)
users  = client[DB_NAME]["users"]

hashed = bcrypt.hashpw(PASSWORD.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
now    = datetime.datetime.utcnow().isoformat()

for acc in ACCOUNTS:
    users.delete_one({"email": acc["email"]})
    users.insert_one({
        "email":     acc["email"],
        "password":  hashed,
        "role":      acc["role"],
        "nom":       acc["nom"],
        "prenom":    acc["prenom"],
        "genre":     "",
        "status":    "validated",
        "avatar":    None,
        "createdAt": now,
        "updatedAt": now,
    })
    print(f"[OK] {acc['role']:8s}  {acc['email']}  /  {PASSWORD}")

client.close()
