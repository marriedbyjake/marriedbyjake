"""Upload the prepared image manifest to R2 with bounded concurrency.

Run only after cms:prepare, against the configured account and intended bucket.
The keys contain content hashes, so retrying the same snapshot is idempotent.
"""
import concurrent.futures
import hashlib
import json
import os
from pathlib import Path
import subprocess
import time

root = Path(__file__).resolve().parent.parent
config = json.loads((root / "wrangler.jsonc").read_text())
bucket = next(binding["bucket_name"] for binding in config["r2_buckets"] if binding["binding"] == "MEDIA")
manifest = json.loads((root / ".emdash/media-manifest.json").read_text())
env = {**os.environ, "CLOUDFLARE_ACCOUNT_ID": config["account_id"]}
wrangler = str(root / "node_modules/.bin/wrangler")

def upload(item):
    source = Path(item["file"])
    if hashlib.sha256(source.read_bytes()).hexdigest() != item["sha256"]:
        raise RuntimeError(f"Source changed since preparation: {source.name}")
    for attempt in range(3):
        result = subprocess.run([
            wrangler, "r2", "object", "put", f"{bucket}/{item['key']}",
            "--file", str(source), "--content-type", item["mimeType"], "--remote",
        ], cwd=root, env=env, capture_output=True, text=True)
        if result.returncode == 0:
            return item["key"]
        if attempt == 2:
            raise RuntimeError(f"Upload failed for {source.name}: {result.stderr[-500:]}")
        time.sleep(2 ** attempt)

items = list({item["key"]: item for item in manifest}.values())
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
    for count, future in enumerate(concurrent.futures.as_completed([pool.submit(upload, item) for item in items]), 1):
        future.result()
        if count % 25 == 0 or count == len(items):
            print(f"Uploaded {count}/{len(items)} objects", flush=True)
print(json.dumps({"bucket": bucket, "objects": len(items), "bytes": sum(item["size"] for item in items)}))
