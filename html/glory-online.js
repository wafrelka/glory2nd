const VALUES_URL = "records.json";
const TIME_OFFSET = 9;
const TABLE_MARGIN_SEC = 10 * 60;

function to_hour(sec) {
	return Math.floor(sec / 3600);
}

function format_date(date) {

	if(date === null) {
		return "N/A";
	}

	let pad2 = (n) => (n.toString().padStart(2, "0"));
	let pad4 = (n) => (n.toString().padStart(4, "0"));

	let yyyy = pad4(date.getFullYear());
	let mo = pad2(date.getMonth() + 1);
	let dd = pad2(date.getDate());
	let hh = pad2(date.getHours());
	let mm = pad2(date.getMinutes());

	return `${yyyy}/${mo}/${dd} ${hh}:${mm}`;
}

async function fetch_values() {
	let resp = await fetch(VALUES_URL, { cache: 'no-store' });
	let obj = await resp.json();
	return obj;
}

function show_values(data, selector) {
	let filtered = filter_values(data, selector);
	draw_detail(filtered);
	google.charts.setOnLoadCallback(() => { draw_graph(filtered); });
}

function update_tab_class(selector) {

	let links = document.querySelectorAll("#tabs a");
	for(let l of links) {
		l.classList.add('hidden-tab');
	}

	if(selector !== "#day" && selector !== "#week" && selector !== "#half") {
		selector = "#all";
	}
	let l = document.querySelector(`#tabs a[href=\"${selector}\"]`);
	l.classList.remove('hidden-tab');
}

function filter_values(data, selector) {

	let record_points = data.record_points;
	let deadline_points = data.deadlines.map(d => d.at);
	let all_points = record_points.concat(deadline_points);

	let latest_record_point = Math.max(...record_points);
	let latest_point = Math.max(...all_points);
	let oldest_point = Math.min(...all_points);

	let min_point = null;
	let max_point = null;

	if(selector == "#day") {
		min_point = latest_record_point - 24 * 60 * 60;
		max_point = latest_record_point;
	} else if(selector == "#week") {
		min_point = latest_record_point - 7 * 24 * 60 * 60;
		max_point = latest_record_point;
	} else if(selector == "#half") {
		min_point = latest_record_point - 12 * 60 * 60;
		max_point = latest_record_point;
	} else {
		min_point = oldest_point;
		max_point = latest_point;
	}

	let is_ok = (d) =>
		((min_point - TABLE_MARGIN_SEC) < d && d < (max_point + TABLE_MARGIN_SEC));

	let filtered = {
		records: data.records.map(r =>
			({
				name: r.name,
				values: r.values.filter((_, i) => is_ok(data.record_points[i])),
			})),
		record_points: data.record_points.filter(p => is_ok(p)),
		deadlines: data.deadlines.filter(d => is_ok(d.at)),
		goal: data.goal,
	};

	return filtered;
}

function draw_detail(data) {

	let list_elem = document.getElementById('records');
	let template = document.querySelector("#single-record.template");

	for(e of document.querySelectorAll("#single-record:not(.template)")) {
		e.parentNode.removeChild(e);
	}
	for(let _ of data.records) {
		let e = template.cloneNode(true);
		e.classList.remove("template");
		list_elem.appendChild(e);
	}

	let member_count_text = data.records.length.toString();
	document.getElementById("member-count").textContent = member_count_text;

	let last_updated_point = Math.max(0, ...data.record_points);
	let last_updated = (last_updated_point === 0) ? null : new Date(last_updated_point * 1000);
	let last_updated_text = format_date(last_updated);
	document.getElementById("last-updated").textContent = last_updated_text;

	// FIXME: this function assumes data.record_points is already sorted

	for(let record_idx = 0; record_idx < data.records.length; record_idx += 1) {

		let record = data.records[record_idx];
		let elem = list_elem.children.item(record_idx + 1);

		let name = record.name;
		let values = record.values;
		let min_idx = values.findIndex(v => (v !== null));
		let max_idx = (values.length - 1) - values.slice().reverse().findIndex(v => (v !== null));

		let words_text = "N/A";
		let pace_text = "N/A";

		let is_empty = (min_idx < 0);

		if(!is_empty && min_idx !== max_idx) {
			let time_delta = data.record_points[max_idx] - data.record_points[min_idx];
			let word_delta = values[max_idx] - values[min_idx];
			let word_per_sec = word_delta / time_delta;
			let word_per_day = word_per_sec * 24 * 60 * 60;
			pace_text = word_per_day.toFixed(1);
		}
		if(!is_empty) {
			words_text = values[max_idx].toString();
		}

		let vars = [
			["${words}", words_text],
			["${pace}", pace_text],
			["${name}", name],
		];
		let f = (g, e, k, v) => {
			if(e instanceof Text) {
				e.textContent = e.textContent.replace(k, v);
			}
			for(let c of e.childNodes) {
				g(g, c, k, v);
			}
		};

		for(let v of vars) {
			f(f, elem, v[0], v[1]);
		}
	}
}

function draw_graph(data) {

	let records = data.records;
	let points = data.record_points;
	let deadlines = data.deadlines;

	let all_points = points.concat(deadlines.map(d => d.at));
	let min_point = Math.min(...all_points);
	let max_point = Math.max(...all_points);
	if(min_point === max_point) {
		min_point = max_point - 1;
	}

	let table = new google.visualization.DataTable();

	table.addColumn('date', 'date');
	table.addColumn({type: 'string', role: 'annotation'});
	for(let r of records) {
		table.addColumn('number', r.name);
		table.addColumn({type: 'string', role: 'style'});
	}

	let emphasis_points = Array.from({length: records.length}, () => []);

	for(let pos = 0; pos < points.length; pos += 1) {
		for(let i = 0; i < records.length; i += 1) {
			let xs = records[i].values;
			let prev_diff = (pos == 0 || xs[pos - 1] !== xs[pos]);
			let next_diff = (pos == (points.length - 1) || xs[pos + 1] !== xs[pos]);
			emphasis_points[i].push(prev_diff || next_diff);
		}
	}

	const ten_days = 10 * 24 * 60 * 60
	const too_long = (max_point - min_point) > ten_days;

	for(let pos = 0; pos < points.length; pos += 1) {

		let now = points[pos];
		let deadline = deadlines.find(d => (now === d.at));
		let no_emphasis = emphasis_points.every((a) => !a[pos]);
		let hour_border = (pos == 0) || (to_hour(points[pos]) != to_hour(points[pos - 1]));

		let skip = (deadline === undefined && no_emphasis && (!hour_border && too_long));

		if(skip) {
			continue;
		}

		let annotation = null;
		if(deadline !== undefined) {
			annotation = `deadline (${deadline.name})`;
		}
		let row = [new Date(now * 1000), annotation];

		for(let idx = 0; idx < records.length; idx += 1) {
			row.push(records[idx].values[pos]);
			row.push(emphasis_points[idx][pos] ? null : 'point { size: 0; }');
		}

		table.addRow(row);
	}

	for(let deadline of deadlines) {
		let record = points.find(p => (p === deadline.at));
		if(record === undefined) {
			let row = [new Date(deadline.at * 1000), `deadline (${deadline.name})`];
			for(let _ of records) {
				row.push(null, null);
			}
			table.addRow(row);
		}
	}

	let max_words = 0;
	for(let record of records) {
		max_words = Math.max(max_words, ...(record.values));
	}
	let max_words_ceiled = Math.ceil(max_words / 1000.0 + 1) * 1000.0;
	if(data.goal !== null) {
		max_words_ceiled = Math.max(max_words_ceiled, data.goal);
	}
	let word_ticks = Math.round(max_words_ceiled / 1000.0) + 1;

	const options = {
		hAxis: {
			title: '',
			format: 'MM/dd HH:mm',
			viewWindow: {
				min: new Date(min_point * 1000),
				max: new Date(max_point * 1000),
			},
		},
		vAxis: {
			title: '',
			ticks: Array.from({length: word_ticks}, (_, i) => (i * 1000)),
			viewWindow: {
				min: 0.0,
				max: max_words_ceiled,
			},
		},
		legend: { position: 'right'},
		lineWidth: 2,
		pointSize: 3,
		chartArea: { left: '10%', top: '5%', right: '20%', bottom: '10%' },
		fontSize: 16,
		backgroundColor: { fill: 'transparent' },
		annotations: { style: 'line' }
	};

	let elem = document.getElementById('graph');
	let chart = new google.visualization.LineChart(elem);

	let date_formatter = new google.visualization.DateFormat({
		pattern: "yyyy/MM/dd HH:mm",
		timeZone: TIME_OFFSET,
	});
	date_formatter.format(table, 0);
	chart.draw(table, options);
}

async function setup() {

	update_tab_class(location.hash);
	window.addEventListener("hashchange", () => {
		update_tab_class(location.hash);
	});

	let data = await fetch_values();

	show_values(data, location.hash);
	window.addEventListener("hashchange", () => {
		show_values(data, location.hash);
	});
}

google.charts.load('current', {packages: ['corechart']});
document.addEventListener("DOMContentLoaded", () => { setup(); });
