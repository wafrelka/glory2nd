#!/bin/sh

set -ue

GLORY_DEST_USER="glory-dest"
GLORY_DEST_DIR="/var/www/html/glory"

work_dir="$(dirname "$0")"
cd "$work_dir"

config_path="config.txt"
records_path="data/records.txt"
records_json_path="data/records.json"
glory_dest="$GLORY_DEST_USER:$GLORY_DEST_DIR"

mkdir -p "$(dirname "$records_path")"
mkdir -p "$(dirname "$records_json_path")"

echo "generating records..."
sudo python2 "bin/glory_record.py" "$config_path" "$records_path" "$records_json_path"
echo "generated"

echo "transferring files..."
ssh "$GLORY_DEST_USER" mkdir -p "$GLORY_DEST_DIR" > /dev/null
scp -r "html/glory-online.html" "$glory_dest/glory-online.html" > /dev/null
scp -r "html/glory-online.css" "$glory_dest/glory-online.css" > /dev/null
scp -r "html/glory-online.js" "$glory_dest/glory-online.js" > /dev/null
scp -r "$records_json_path" "$glory_dest/records.json" > /dev/null
echo "transferred"
