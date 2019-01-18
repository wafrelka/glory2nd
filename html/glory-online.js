var full_data = null;
const VALUES_URL = "records.json";
const TIME_OFFSET = 9;

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
			row.push(item['values'][idx]);
		}

		table.addRow(row);
	}

	for(let d of data['deadlines']) {
		if(data['record_points'].findIndex(function(elem){ return elem == d['at']; }) < 0) {
			row = [new Date(d['at'] * 1000), "deadline (" + d['name'] + ")"];
			for(let item of data['records']) {
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
		timeZone: TIME_OFFSET,
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
