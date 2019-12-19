var full_data = null;
const VALUES_URL = "records.json";
const TIME_OFFSET = 9;

const TABLE_TEMPLATE = "<span class='name'>${name}</span> wrote " +
	"<span class='words'>${words}</span> words " +
	"<span class='pace-text'>(<span class='pace'>${pace}</span> words/day)</span>";

function fetch_values(post_func) {
	fetch(VALUES_URL, {cache: 'no-store'})
		.then(function(res) { return res.json(); })
		.then(function(data) {
			full_data = data;
		})
		.then(post_func)
		.catch(error => console.error(error));
}

function show_values(selector) {
	let data = filter_values(full_data, selector);
	draw_detail(data);
	draw_graph_async(data);
}

function update_tab_color(selector) {

	let links = document.querySelectorAll("#tabs a");
	for(let l of links) {
		l.classList.add('hidden-tab');
	}

	let l = document.querySelector("#tabs a[href=\"#all\"]");
	if(selector == "#day" || selector == "#week") {
		l = document.querySelector("#tabs a[href=\"" + selector + "\"]");
	}

	l.classList.remove('hidden-tab');
}

function filter_values(data, selector) {

	const HOUR_IN_SEC = 60 * 60;
	const MARGIN = 10 * 60;

	let all_point_dates = data['record_points'];
	let all_deadline_dates = data['deadlines'].map(d => d['at']);
	let all_dates = all_point_dates.concat(all_deadline_dates);

	let latest_point_date = Math.max.apply(null, all_point_dates);
	let latest_date = Math.max.apply(null, all_dates);
	let oldest_date = Math.min.apply(null, all_dates);

	let min_date = null;
	let max_date = null;

	if(selector == "#day") {
		min_date = latest_point_date - 24 * HOUR_IN_SEC;
		max_date = latest_point_date;
	} else if(selector == "#week") {
		min_date = latest_point_date - 7 * 24 * HOUR_IN_SEC;
		max_date = latest_point_date;
	} else {
		min_date = oldest_date;
		max_date = latest_date;
	}

	function is_ok(d) {
		return (min_date - MARGIN) < d && d < (max_date + MARGIN);
	}

	let filtered = {
		"records": data["records"].map(r =>
			({
				"name": r["name"],
				"values": r["values"].filter((v, idx) => is_ok(data["record_points"][idx])),
			})),
		"record_points": data["record_points"].filter(p => is_ok(p)),
		"deadlines": data["deadlines"].filter(d => is_ok(d["at"])),
	};

	return filtered;
}

function draw_detail(data) {

	let elem = document.getElementById('records');

	if(elem.childElementCount <= 0) {
		for(let i = 0; i < data["records"].length; i += 1) {
			let e = document.createElement('div');
			e.classList.add('single-record');
			elem.appendChild(e);
		}
	}

	document.getElementById("member-count").textContent = data["records"].length.toString();

	// FIXME: this function asserts data["record_points"] is already sorted

	for(let r_idx = 0; r_idx < data["records"].length; r_idx += 1) {

		let record = data["records"][r_idx];
		let name = record["name"];
		let values = record["values"];
		let min_idx = values.findIndex((v) => v !== null);
		let max_idx = (values.length - 1) - values.slice().reverse().findIndex((v) => v !== null);

		let words_text = "N/A";
		let pace_text = "N/A";

		let is_empty = (min_idx < 0)

		if(!is_empty && min_idx !== max_idx) {
			let time_delta = data["record_points"][max_idx] - data["record_points"][min_idx];
			let word_delta = values[max_idx] - values[min_idx];
			let word_per_sec = word_delta / time_delta;
			let word_per_day = word_per_sec * 60 * 60 * 24;
			let pace_rounded = Math.round(word_per_day * 10) / 10;
			pace_text = pace_rounded.toString();
		}
		if(!is_empty) {
			words_text = values[max_idx].toString();
		}

		let vars = [["${words}", words_text], ["${pace}", pace_text], ["${name}", name]];
		let html = TABLE_TEMPLATE;

		for(let v of vars) {
			html = html.replace(v[0], v[1]);
		}

		let ch_elem = elem.childNodes.item(r_idx);
		ch_elem.innerHTML = html;
	}
}

function draw_graph_async(data) {
	google.charts.setOnLoadCallback(function(){draw_graph(data)});
}

function draw_graph(data) {

	let table = new google.visualization.DataTable();

	table.addColumn('date', 'date');
	table.addColumn({type: 'string', role: 'annotation'});
	for(let item of data['records']) {
		table.addColumn('number', item['name']);
		table.addColumn({type: 'string', role: 'style'});
	}

	for(let idx = 0; idx < data['record_points'].length; idx += 1) {

		let now = data['record_points'][idx];
		let annotation = null;

		for(let d of data['deadlines']) {
			if(now == d['at']) {
				annotation = d['name'];
				break;
			}
		}

		let row = [new Date(now * 1000), annotation];

		for(let item of data['records']) {
			let mid = false;
			if(idx - 1 >= 0 && idx + 1 < data['record_points'].length) {
				let p1 = item['values'][idx - 1];
				let p2 = item['values'][idx];
				let p3 = item['values'][idx + 1];
				mid = (p1 === p2) && (p2 === p3) && (p2 !== null);
			}
			row.push(item['values'][idx]);
			row.push(mid ? null : 'point { size: 3; }');
		}

		table.addRow(row);
	}

	for(let d of data['deadlines']) {
		if(data['record_points'].findIndex(function(elem){ return elem == d['at']; }) < 0) {
			row = [new Date(d['at'] * 1000), "deadline (" + d['name'] + ")"];
			for(let item of data['records']) {
				row.push(null);
				row.push(null);
			}
			table.addRow(row);
		}
	}

	let all_dates =
		data['record_points']
		.concat(data['deadlines'].map(d => d['at']));

	let min_date = new Date(Math.min.apply(null, all_dates) * 1000);
	let max_date = new Date(Math.max.apply(null, all_dates) * 1000);

	let max_words = 0;
	for(let item of data['records']) {
		max_words = Math.max(max_words, Math.max.apply(null, item['values']));
	}
	let max_words_ceiled = Math.ceil(max_words / 1000.0 + 1) * 1000.0;

	const options = {
		hAxis: {
			title: '',
			format: 'MM/dd HH:mm',
			viewWindow: { min: min_date, max: max_date },
		},
		vAxis: {
			title: '',
			ticks: Array.from({length: Math.round(max_words_ceiled / 1000.0) + 1}, (v, idx) => idx * 1000),
			viewWindow: { min: 0.0, max: max_words_ceiled },
		},
		legend: { position: 'right'},
		lineWidth: 2,
		pointSize: 1,
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

google.charts.load('current', {packages: ['corechart']});
document.addEventListener("DOMContentLoaded", function(event) {
	fetch_values(function(){show_values(location.hash);});
	window.addEventListener("hashchange", () => {
		update_tab_color(location.hash);
		show_values(location.hash);
	});
	update_tab_color(location.hash);
});
