#!/bin/sh

set -ue

GLORY_DEST_USER="glory-dest"
GLORY_DEST_DIR="/var/www/html/glory"

work_dir="$(dirname "$0")"
cd "$work_dir"

thesis_file_list_path="thesis_file_list.txt"
records_path="data/records.txt"
records_json_path="data/records.json"
glory_dest="$GLORY_DEST_USER:$GLORY_DEST_DIR"

mkdir -p "$(dirname "$records_path")"
mkdir -p "$(dirname "$records_json_path")"

echo "generating records..."
sudo python2 "bin/glory_record.py" "$thesis_file_list_path" "$records_path" "$records_json_path"
echo "generated"

echo "transferring files..."
ssh "$GLORY_DEST_USER" mkdir -p "$GLORY_DEST_DIR" > /dev/null
scp -r "html/index.html" "$glory_dest/index.html" > /dev/null
scp -r "html/index.css" "$glory_dest/index.css" > /dev/null
scp -r "html/index.js" "$glory_dest/index.js" > /dev/null
scp -r "$records_json_path" "$glory_dest/records.json" > /dev/null
echo "transferred"
