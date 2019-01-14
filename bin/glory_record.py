import sys, os.path, tempfile, shutil, datetime, json, traceback
from glory_count import count_words

def load_targets(conf_path):

	if not os.path.isfile(conf_path):
		raise Exception("config file cannot be found (path: '%s')" % conf_path)

	targets = []

	with open(conf_path, 'r') as f:
		for line in f:
			if line.startswith('#'):
				continue
			name, separator, path = line.rstrip().partition(' ')
			if separator != ' ':
				raise Exception("config file is broken (path: '%s')" % conf_path)
			targets.append((name, path))

	return targets

def format_record(now, name, words):
	return "%s %s %s" % (now.replace(microsecond=0).isoformat(), name, words)

# returns `now` as a string
def parse_record(txt):
	now, sep1, rem = txt.partition(' ')
	name, sep2, words = rem.partition(' ')
	if sep1 != ' ' or sep2 != ' ':
		raise Exception("record is broken")
	return (now, name, int(words))

def append_records(records_path, new_records):

	txt = ""
	for now, name, words in new_records:
		formatted = format_record(now, name, words)
		txt = txt + formatted + "\n"

	base_dir = os.path.dirname(records_path)

	# create a temporary file
	tmp_fd, tmp_path = tempfile.mkstemp(suffix=".tmp", prefix="new_records_file_", dir=base_dir)
	os.close(tmp_fd)

	if os.path.isfile(records_path):
		# shutil.copy2 copies the metadata (creation date, ...)
		shutil.copy2(records_path, tmp_path)

	with open(tmp_path, 'a') as f:
			f.write(txt)

	# os.rename is atomic
	os.rename(tmp_path, records_path)

def load_records(records_path):

	records = []

	with open(records_path, 'r') as f:
		for idx, line in enumerate(f):
			try:
				now, name, words = parse_record(line.rstrip())
			except:
				raise Exception("record is broken (path: '%s', line: %d)" % (records_path, idx + 1))
			records.append((now, name, words))

	return records

def save_json_file(json_path, records):

	record_points = sorted(set(now for now, _, _ in records))
	names = sorted(set(name for _, name, _ in records))
	record_dict = dict([((now, name), words) for now, name, words in records])

	obj = {
		'record_points': sorted(record_points),
		'records': [{
			'name': name,
			'values': [record_dict.get((pt, name), None) for pt in record_points]
		} for name in names]
	}

	with open(json_path, 'w') as f:
		json.dump(obj, f)

def main(target_conf_path, records_path, json_path):

	now = datetime.datetime.now()
	targets = load_targets(target_conf_path)
	new_records = []

	for name, path in targets:
		try:
			words = count_words(path)
		except Exception as exc:
			sys.stderr.write(traceback.format_exc())
			sys.stderr.write("warning: word counting is failed (path: '%s')\n" % path)
			continue
		new_records.append((now, name, words))

	append_records(records_path, new_records)

	all_records = load_records(records_path)
	save_json_file(json_path, all_records)

if __name__ == '__main__':

	if len(sys.argv) < 4:
		sys.stderr.write("usage: %s <target_conf_path> <records_path> <json_path>\n" % sys.argv[0])
		exit(1)

	target_conf_path = sys.argv[1]
	records_path = sys.argv[2]
	json_path = sys.argv[3]

	main(target_conf_path, records_path, json_path)
