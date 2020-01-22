const VALUES_URL = "records.json";
const TIME_OFFSET = 9;
const TABLE_MARGIN_SEC = 10 * 60;

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

	let table = new google.visualization.DataTable();

	table.addColumn('date', 'date');
	table.addColumn({type: 'string', role: 'annotation'});
	for(let record of data.records) {
		table.addColumn('number', record.name);
		table.addColumn({type: 'string', role: 'style'});
	}

	for(let idx = 0; idx < data.record_points.length; idx += 1) {

		let now = data.record_points[idx];
		let annotation = null;
		let mid = (idx - 1 >= 0 && idx + 1 < data.record_points.length);

		let deadline = data.deadlines.find(d => (now === d.at));
		if(deadline !== undefined) {
			annotation = `deadline (${deadline.name})`;
		}

		let row = [new Date(now * 1000), annotation];

		for(let record of data.records) {
			let no_diff = false;
			if(mid) {
				let p1 = record.values[idx - 1];
				let p2 = record.values[idx];
				let p3 = record.values[idx + 1];
				no_diff = (p1 === p2) && (p2 === p3) && (p2 !== null);
			}
			row.push(record.values[idx]);
			row.push(no_diff ? 'point { size: 1; }' : null);
		}

		table.addRow(row);
	}

	for(let deadline of data.deadlines) {
		let record = data.record_points.find(p => (p === deadline.at));
		if(record === undefined) {
			let row = [new Date(deadline.at * 1000), `deadline (${deadline.name})`];
			for(let _ of data.records) {
				row.push(null, null);
			}
			table.addRow(row);
		}
	}

	let all_points = data.record_points.concat(data.deadlines.map(d => d.at));
	let min_point = Math.min(...all_points);
	let max_point = Math.max(...all_points);
	if(min_point === max_point) {
		min_point = max_point - 1;
	}

	let max_words = 0;
	for(let record of data.records) {
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
