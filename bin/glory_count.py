#!/usr/bin/env python2
import subprocess, re, os.path, os, sys

def parse_tex_file(tex_path, root_dir):

	FNULL = open(os.devnull, 'w')
	wc_proc = subprocess.Popen(['wc', '-w'],
		stdin=subprocess.PIPE,
		stdout=subprocess.PIPE,
		stderr=FNULL)

	replace_patterns = [
		(r'%.*', r''), # comment out
		(r'\\[^\s\{]*\{[^\}]*\}', r''), # \begin{center}
		(r'\\[^\s]*', r''), # \alpha
		(r'\[[^\]]*\]', r''), # \begin{figure}[htb]
		(r'_[^\s]+', r''),
		(r'\^[^\s]+', r''),
		(r'[\:\!\~]+', r''),
		(r'[\{\}\$\-\+\(\)\.\[\]\&\=\<\>\,]+', r' '),
	]

	with open(tex_path, 'r') as fp:

		# Glory2nd excludes 'eabstract' in word counting
		# different from original Glory ('word-count.pl')
		excluded_sections = ['jabstract', 'eabstract']
		section_states = dict(map(lambda e: (e, False), excluded_sections))

		for line in fp:

			for s in excluded_sections:
				if s in line:
					if 'begin' in line:
						section_states[s] = True
					if 'end' in line:
						section_states[s] = False

			if any(section_states.values()):
				continue

			for pat in replace_patterns:
				line = re.sub(pat[0], pat[1], line)

			wc_txt = line
			if sys.version_info[0] >= 3:
				wc_txt = bytes(line, encoding='utf-8')
			wc_proc.stdin.write(wc_txt)

	wc_proc.stdin.close()
	count = int(wc_proc.stdout.read())
	# print("debug: path = %s, count = %d" % (tex_path, count))

	deps = []

	dep_cmds = [r"^(.*)\\input\{([^\}]+)\}", r"^(.*)\\include\{([^\}]+)\}"]
	dep_res = [re.compile(cmd) for cmd in dep_cmds]

	with open(tex_path) as fp:

		for line in fp:

			for r in dep_res:

				mo = r.match(line.strip())

				if mo is None:
					continue

				before = mo.group(1)
				path = mo.group(2)

				if '%' in before:
					continue

				# Glory2nd supports auto '.tex' extension completion
				# different from original Glory ('word-count.pl')
				if not path.endswith('.tex'):
					path = path + '.tex'

				# Glory2nd supports absolute paths
				# different from original Glory ('word-count.pl')
				if not os.path.isabs(path):
					path = os.path.realpath(os.path.join(root_dir, path))

				deps.append(path)

	return (count, deps)

def count_words(root_tex_path):

	root_tex_path = os.path.realpath(root_tex_path)
	root_dir = os.path.dirname(root_tex_path)
	unchecked = [root_tex_path]
	texs = {}
	missing_files = []

	while len(unchecked) > 0:

		path = unchecked.pop()
		if path in texs:
			continue

		if os.path.exists(path):
			tex = parse_tex_file(path, root_dir)
		else:
			tex = (0, [])
			missing_files.append(path)
		texs[path] = tex

		for dep in tex[1]:
			unchecked.append(dep)

	def count(cur, stack):
		if cur in stack:
			raise Exception("dependency loop detected")
		stack.append(cur)
		w = texs[cur][0]
		for d in texs[cur][1]:
			w += count(d, stack)
		assert(stack.pop() == cur)
		return w

	return (count(root_tex_path, []), missing_files)

if __name__ == '__main__':

	paths = sys.argv[1:]
	for p in paths:
		words, missing_files = count_words(p)
		print("%s: %s words" % (p, words))
		if len(missing_files) > 0:
			print("  warning: some files are missing")
			for m in missing_files:
				print("  * %s" % m)
