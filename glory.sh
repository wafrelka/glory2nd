#!/bin/sh

set -ue

echo_usage() {
	echo "usage: $0 <config_path> <rsync_destination>" >&2
}

if [ "$#" -ne "2" ]; then
	echo_usage
	exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "$0")"; pwd)"
config_path="$1"
scp_dest="$2"

echo "===> config_path = $config_path, scp_destination = $scp_dest"

files_path="$(mktemp -d)"
work_dir="$(dirname "$0")"
chmod 755 "$files_path"

echo "===> generating records..."
"$SCRIPT_DIR/bin/glory_record.py" "$config_path" > "$files_path/records.json"
echo "===> generated"

echo "===> transferring files..."
cp "$SCRIPT_DIR/html/glory-online.html" "$files_path"
cp "$SCRIPT_DIR/html/glory-online.css" "$files_path"
cp "$SCRIPT_DIR/html/glory-online.js" "$files_path"
rsync -av "$files_path/" "$scp_dest"
echo "===> transferred"

rm -r "$files_path"
