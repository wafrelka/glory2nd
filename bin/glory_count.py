import subprocess, re, os.path, os

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

	with open(tex_path) as fp:

		enabled = True

		for line in fp:

			if ('begin' in line) and ('jabstract' in line):
				enabled = False
			elif ('end' in line) and ('jabstract' in line):
				enabled = True

			if not enabled:
				continue

			for pat in replace_patterns:
				line = re.sub(pat[0], pat[1], line)

			wc_proc.stdin.write(line)

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

				# different from 'word-count.pl'
				# original: '.tex' not in path
				if not path.endswith('.tex'):
					path = path + '.tex'

				# different from 'word-count.pl'
				# original: expand `path` even if it is absolute
				if not os.path.isabs(path):
					path = os.path.realpath(os.path.join(root_dir, path))

				deps.append(path)

	return (count, deps)

def count_words(root_tex_path):

	root_tex_path = os.path.realpath(root_tex_path)
	root_dir = os.path.dirname(root_tex_path)
	unchecked = [root_tex_path]
	texs = {}

	while len(unchecked) > 0:

		path = unchecked.pop()
		if path in texs:
			continue

		tex = parse_tex_file(path, root_dir)
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

	return count(root_tex_path, [])
