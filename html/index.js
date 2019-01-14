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

function fetch_values(post_func) {
	fetch(VALUES_URL, {cache: 'no-store'})
		.then(function(res) { return res.json(); })
		.then(function(data) {
			full_data = data;
		})
		.then(post_func)
		.catch(error => console.error(error));
}

function show_values() {
	data = filter_values(full_data);
	draw_detail(data);
	draw_graph_async(data);
}

function filter_values(full_data) {
	// FIXME: implement
	return full_data;
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
	for(let item of data['records']) {
		table.addColumn('number', item['name']);
	}

	for(let idx = 0; idx < data['record_points'].length; idx += 1) {

		let now = str2date(data['record_points'][idx]);
		let row = [now];

		for(let item of data['records']) {
			row.push(item['values'][idx]);
		}

		table.addRow(row);
	}

	let max_words = 0;
	for(let item of data['records']) {
		max_words = Math.max(max_words, Math.max.apply(null, item['values']));
	}
	let max_words_ceiled = Math.ceil(max_words / 1000.0 + 1) * 1000.0;

	const options = {
		hAxis: { title: '', format: 'MM/dd hh:mm' },
		vAxis: {
			title: '',
			ticks: Array.from({length: Math.round(max_words_ceiled / 1000.0) + 1}, (v, idx) => idx * 1000),
			viewWindow: { min: 0.0, max: max_words_ceiled },
		},
		legend: { position: 'right'},
		lineWidth: 3,
		pointSize: 6,
		chartArea: { left: '10%', top: '5%', right: '20%', bottom: '10%' },
		fontSize: 16,
		backgroundColor: { fill: 'transparent' },
	};

	let elem = document.getElementById('graph');
	let chart = new google.visualization.LineChart(elem);

	let date_formatter = new google.visualization.DateFormat({
		pattern: "yyyy/MM/dd hh:mm"
	});
	date_formatter.format(table, 0);
	chart.draw(table, options);
}

google.charts.load('current', {packages: ['corechart']});
document.addEventListener("DOMContentLoaded", function(event) {
	fetch_values(function(){show_values();});
});
