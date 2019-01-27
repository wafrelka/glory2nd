#!/bin/sh

set -ue

echo_usage() {
	echo "usage: $0 <config_path> <data_dir> <scp_dest_user>:<scp_dest_dir>" >&2
}

if [ "$#" -ne "3" ]; then
	echo_usage
	exit 1
fi

config_path="$1"
data_dir="$2"
scp_dest="$3"
scp_user="$(echo "$scp_dest" | cut -s -d ':' -f 1)"
scp_path="$(echo "$scp_dest" | cut -s -d ':' -f 2)"

if [ -z "$scp_user" ] || [ -z "$scp_path" ]; then
	echo_usage
	exit 1
fi

echo "config_path = $config_path, data_dir = $data_dir, scp_dest = $scp_user:$scp_path"

records_path="${data_dir}/records.txt"
records_json_path="${data_dir}/records.json"
work_dir="$(dirname "$0")"

cd "$work_dir"

mkdir -p "$(dirname "$records_path")"
mkdir -p "$(dirname "$records_json_path")"

echo "generating records..."
sudo python2 "./bin/glory_record.py" "$config_path" "$records_path" "$records_json_path"
echo "generated"

echo "transferring files..."
ssh "$scp_user" mkdir -p "$scp_path" > /dev/null
scp -r "html/glory-online.html" "$scp_dest/glory-online.html" > /dev/null
scp -r "html/glory-online.css" "$scp_dest/glory-online.css" > /dev/null
scp -r "html/glory-online.js" "$scp_dest/glory-online.js" > /dev/null
scp -r "$records_json_path" "$scp_dest/records.json" > /dev/null
echo "transferred"
