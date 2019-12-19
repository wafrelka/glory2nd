#!/usr/bin/env python2
import sys, os, os.path, tempfile, shutil, datetime, json, traceback
from glory_count import count_words

class FixedOffset(datetime.tzinfo):
	def __init__(self, offset, name):
		self.__offset = datetime.timedelta(hours = offset)
		self.__name = name
	def utcoffset(self, dt):
		return self.__offset
	def tzname(self, dt):
		return self.__name
	def dst(self, dt):
		return datetime.timedelta(0)

TIME_FORMAT = r"%Y-%m-%dT%H:%M:%S"
TIMEZONE = FixedOffset(+9, "JST")
UNIX_EPOCH = datetime.datetime(1970, 1, 1).replace(tzinfo=FixedOffset(0, "UTC"))

def total_seconds(delta):
	return (delta.microseconds + (delta.seconds + delta.days * 24 * 3600) * 10**6) / 10**6

def parse_datetime(text):
	return datetime.datetime.strptime(text, TIME_FORMAT).replace(tzinfo=TIMEZONE)

def unixtime(dt):
	return int(total_seconds(dt - UNIX_EPOCH))

def load_config(conf_path):

	if not os.path.isfile(conf_path):
		raise Exception("config file cannot be found (path: '%s')" % conf_path)

	items = dict()

	with open(conf_path, 'r') as f:
		for line in f:
			line = line.strip()
			if line.startswith('#') or len(line) == 0:
				continue
			key, separator, value = line.strip().partition('=')
			if separator != '=':
				raise Exception("config file is broken (path: '%s')" % conf_path)
			key = key.strip()
			value = value.strip()
			items[key] = value

	return items

def format_record(now, name, words):
	return "%s %s %s" % (now.replace(microsecond=0).strftime(TIME_FORMAT), name, words)

def parse_record(txt):
	dt, sep1, rem = txt.partition(' ')
	name, sep2, words = rem.partition(' ')
	if sep1 != ' ' or sep2 != ' ':
		raise Exception("record is broken")
	return (parse_datetime(dt), name, int(words))

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
		f.flush()
		os.fsync(f.fileno())

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

def pack_all_records(records, deadlines, goal):

	record_points = sorted(set(unixtime(now) for now, _, _ in records))
	names = sorted(set(name for _, name, _ in records))
	record_dict = dict([((unixtime(now), name), words) for now, name, words in records])

	obj = {
		'deadlines': sorted([{ 'name': d[0], 'at': unixtime(d[1]) } for d in deadlines]),
		'record_points': record_points,
		'records': [{
			'name': name,
			'values': [record_dict.get((pt, name), None) for pt in record_points]
		} for name in names],
		'goal': goal,
	}

	return obj

def update_and_pack_records(config_path):

	now = datetime.datetime.now(tz=TIMEZONE)
	config = load_config(config_path)

	records_path = config["path/records"]
	if not os.path.isabs(records_path):
		config_dir = os.path.dirname(config_path)
		records_path = os.path.realpath(os.path.join(config_dir, records_path))

	deadlines = []
	targets = []
	goal = None

	for key, value in config.items():
		if key.startswith("deadline/"):
			deadlines.append((key.partition("/")[2], parse_datetime(value)))
		elif key.startswith("target/"):
			targets.append((key.partition("/")[2], value))
		elif key == "goal":
			goal = int(value)

	new_records = []

	# stop counting	if the all deadlines are over
	if len(deadlines) > 0 and (max(map(lambda d: d[1], deadlines)) + datetime.timedelta(minutes=5) < now):
		all_records = load_records(records_path)
		return pack_all_records(all_records, deadlines)

	for name, path in targets:
		try:
			words, missing_files = count_words(path)
		except Exception as exc:
			sys.stderr.write(traceback.format_exc())
			sys.stderr.write("warning: word counting is failed (path: '%s')\n" % path)
			continue
		new_records.append((now, name, words))
		if len(missing_files) > 0:
			sys.stderr.write("warning: some imported files are missing (path: '%s')\n" % path)

	append_records(records_path, new_records)

	all_records = load_records(records_path)
	return pack_all_records(all_records, deadlines, goal)

if __name__ == '__main__':

	if len(sys.argv) < 2:
		sys.stderr.write("usage: %s <config_path>\n" % sys.argv[0])
		exit(1)

	config_path = sys.argv[1]
	packed = update_and_pack_records(config_path)
	print '%s' % json.dumps(packed)
