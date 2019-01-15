var full_data = null;
const VALUES_URL = "records.json";

function str2date(s) {
	const year = parseInt(s.substring(0, 4));
	const month = parseInt(s.substring(5, 7)) - 1;
	const day = parseInt(s.substring(8, 10));
	const hour = parseInt(s.substring(11, 13));
	const minute = parseInt(s.substring(14, 16));
	const second = parseInt(s.substring(17, 19));
	return new Date(year, month, day, hour, minute, second);
}

function between(cur, left, right) {
	return (left <= cur) && (cur <= right);
}

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

	const HOUR_IN_MS = 1000 * 60 * 60;

	let all_point_dates = data['record_points'].map(s => str2date(s));
	let all_deadline_dates = data['deadlines'].map(d => str2date(d['at']));
	let all_dates = all_point_dates.concat(all_deadline_dates);

	let latest_point_date = new Date(Math.max.apply(null, all_point_dates));
	let latest_date = new Date(Math.max.apply(null, all_dates));
	let oldest_date = new Date(Math.min.apply(null, all_dates));

	let min_date = null;
	let max_date = null;

	if(selector == "#day") {
		min_date = latest_point_date - HOUR_IN_MS * (24 + 1);
		max_date = latest_point_date - (-HOUR_IN_MS) * 1;
	} else if(selector == "#week") {
		min_date = latest_point_date - HOUR_IN_MS * 24 * (7 + 1);
		max_date = latest_point_date - (-HOUR_IN_MS) * 24 * 1;
	} else {
		min_date = oldest_date - HOUR_IN_MS * 24;
		max_date = latest_date - (-HOUR_IN_MS) * 24;
	}

	min_date = new Date(min_date);
	max_date = new Date(max_date);

	let filtered = {
		"records": data["records"].map(r =>
			({
				"name": r["name"],
				"values": r["values"].filter((v, idx) =>
					between(str2date(data["record_points"][idx]), min_date, max_date)
				),
			})),
		"record_points": data["record_points"].filter(p => between(str2date(p), min_date, max_date)),
		"deadlines": data["deadlines"].filter(d => between(str2date(d["at"]), min_date, max_date)),
	};

	return filtered;
}

function draw_detail(data) {
	let elem = document.getElementById('detail');
	// FIXME: implement
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
	}

	for(let idx = 0; idx < data['record_points'].length; idx += 1) {

		let now = str2date(data['record_points'][idx]);
		let annotation = null;

		for(let d of data['deadlines']) {
			if(now == d['at']) {
				annotation = d['name'];
				break;
			}
		}

		let row = [now, annotation];

		for(let item of data['records']) {
			row.push(item['values'][idx]);
		}

		table.addRow(row);
	}

	let all_dates =
		data['record_points']
		.concat(data['deadlines'].map(d => d['at']))
		.map(s => str2date(s));

	let HOUR_IN_MS = 1000 * 60 * 60;
	let min_date = new Date(Math.min.apply(null, all_dates));
	let max_date = new Date(Math.max.apply(null, all_dates) + HOUR_IN_MS * 6);

	for(let d of data['deadlines']) {
		if(data['record_points'].findIndex(function(elem){ return elem == d['at']; }) < 0) {
			row = [str2date(d['at']), "deadline (" + d['name'] + ")"];
			for(let item of data['records']) {
				row.push(null);
			}
			table.addRow(row);
		}
	}

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
		pointSize: 2,
		chartArea: { left: '10%', top: '5%', right: '20%', bottom: '10%' },
		fontSize: 16,
		backgroundColor: { fill: 'transparent' },
		annotations: { style: 'line' }
	};

	let elem = document.getElementById('graph');
	let chart = new google.visualization.LineChart(elem);

	let date_formatter = new google.visualization.DateFormat({
		pattern: "yyyy/MM/dd HH:mm",
		timeZone: 9,
	});
	date_formatter.format(table, 0);
	chart.draw(table, options);
}

google.charts.load('current', {packages: ['corechart']});
document.addEventListener("DOMContentLoaded", function(event) {
	fetch_values(function(){show_values(location.hash);});
	let links = document.querySelectorAll("#tabs a");
	for (l of links) {
		l.addEventListener("click", function(ev) {
			update_tab_color(ev.target.hash);
			show_values(ev.target.hash);
		});
	}
	update_tab_color(location.hash);
});
