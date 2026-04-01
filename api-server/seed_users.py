"""
Script to seed initial users into MongoDB.
Run: python seed_users.py
"""
import datetime
import sys

try:
    import bcrypt
    from pymongo import MongoClient
except ImportError:
    print("Installing dependencies...")
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "bcrypt", "pymongo"])
    import bcrypt
    from pymongo import MongoClient

MONGO_URI = "mongodb://localhost:27017"
DB_NAME   = "radiology_platform"

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

users_to_seed = [
    {
        "email":    "adminit@radio.com",
        "password": "Admin123!",
        "role":     "adminIT",
        "status":   "validated",
        "nom":      "IT",
        "prenom":   "Admin",
    },
    {
        "email":    "admin@radio.com",
        "password": "Admin123!",
        "role":     "admin",
        "status":   "validated",
        "nom":      "Principal",
        "prenom":   "Admin",
    },
    {
        "email":    "medecin@radio.com",
        "password": "Medecin123!",
        "role":     "doctor",
        "status":   "validated",
        "nom":      "Dupont",
        "prenom":   "Jean",
    },
]

def main():
    try:
        client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=3000)
        client.server_info()
    except Exception as e:
        print(f"❌ Cannot connect to MongoDB at {MONGO_URI}")
        print(f"   Error: {e}")
        print("   Make sure MongoDB is running.")
        sys.exit(1)

    db  = client[DB_NAME]
    col = db["users"]
    now = datetime.datetime.utcnow().isoformat()

    created = 0
    skipped = 0

    for u in users_to_seed:
        if col.find_one({"email": u["email"]}):
            print(f"[SKIP] Already exists: {u['email']}")
            skipped += 1
            continue

        doc = {
            "email":     u["email"],
            "password":  hash_password(u["password"]),
            "role":      u["role"],
            "status":    u["status"],
            "nom":       u["nom"],
            "prenom":    u["prenom"],
            "createdAt": now,
        }
        col.insert_one(doc)
        print(f"[OK]   Created: {u['email']}  (role: {u['role']}, password: {u['password']})")
        created += 1

    print(f"\nDone — {created} created, {skipped} skipped.")
    print("\n--- Login credentials ---")
    for u in users_to_seed:
        print(f"  {u['role']:10}  {u['email']:30}  password: {u['password']}")

if __name__ == "__main__":
    main()
