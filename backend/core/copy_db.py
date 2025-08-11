import requests

# Remote and local CouchDB URLs with authentication
remote_base = "http://root:root@192.168.0.9:5984"
local_base = "http://root:root@localhost:5984"

# List of databases to replicate
databases = [
    "aud_bundles",
    "aud_chunks",
    "aud_documents",
    "aud_paras",
    "aud_pdf",
    "aud_users"
]

for db in databases:
    try:
        # 1️⃣ Ensure the local DB exists (create if not)
        r = requests.put(f"{local_base}/{db}")
        if r.status_code == 201:
            print(f"📂 Created local DB '{db}'.")
        elif r.status_code == 412:
            print(f"📂 Local DB '{db}' already exists.")

        # 2️⃣ Replicate from remote to local
        payload = {
            "source": f"{remote_base}/{db}",
            "target": db
        }
        r = requests.post(f"{local_base}/_replicate", json=payload)

        if r.status_code in (200, 202):
            print(f"✅ Replication of '{db}' successful.")
        else:
            print(f"❌ Failed '{db}' — Status: {r.status_code}, Response: {r.text}")

    except Exception as e:
        print(f"🔥 Error replicating '{db}': {e}")
