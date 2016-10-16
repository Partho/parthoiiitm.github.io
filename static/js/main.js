queue()
    .defer(d3.csv, "./static/data/jan.csv")
    .await(makeGraphs);

function makeGraphs(error, recordsJson) {
	
	//Clean data
	var records = recordsJson;
	var formatDate = d3.time.format("%d/%m/%Y");
	
	records.forEach(function(d, i) {
		d.index = i;
        d.date = formatDate.parse(d.date);
		d.origin_long = +d.origin_long;
		d.origin_lat = +d.origin_lat;
		d.dest_long = +d.dest_long;
		d.dest_lat = +d.dest_lat;
	});

	//Create a Crossfilter instance
	var ndx = crossfilter(records);

	//Define Dimensions
	var allDim = ndx.dimension(function(d) {return d;});
	var dateDim = ndx.dimension(function(d) { return d.date; });
	var cancelDim = ndx.dimension(function(d) { return d.CancellationCode; });
	var originDim = ndx.dimension(function(d) { return d.origin_place; });

	function getTops(source_group) {
	    return {
	        all: function () {
	            return source_group.top(10);
	        }
	    };
	}
	

	//Group Data
	var all = ndx.groupAll();
	var dateGroup = dateDim.group();
	var cancelGroup = cancelDim.group();
	var originGroup = originDim.group();
	var topOriginGroup = getTops(originGroup);


	//Define values (to be used in charts)
	var minDate = dateDim.bottom(1)[0]["date"];
	var maxDate = dateDim.top(1)[0]["date"];


    //Charts
    var numberRecordsND = dc.numberDisplay("#number-records-nd");
	var timeChart = dc.barChart("#time-chart");
	var cancelChart = dc.rowChart("#cancel-row-chart");
	var originPlaceChart = dc.rowChart("#origin-place-row-chart");


	numberRecordsND
		.formatNumber(d3.format("d"))
		.valueAccessor(function(d){return d; })
		.group(all);


	timeChart
		.width(750)
		.height(140)
		.margins({top: 10, right: 50, bottom: 20, left: 20})
		.dimension(dateDim)
		.group(dateGroup)
		.transitionDuration(500)
		.x(d3.time.scale().domain([minDate, maxDate]))
		.elasticY(true)
		.yAxis().ticks(0);

	cancelChart
        .width(400)
        .height(140)
        .dimension(cancelDim)
        .group(cancelGroup)
        .ordering(function(d) { return -d.value })
        .elasticX(true)
        .xAxis().ticks(4);

    originPlaceChart
        .width(400)
        .height(309)
        .dimension(originDim)
        .group(topOriginGroup)
        .ordering(function(d) { return -d.value })
        .elasticX(true)
        .xAxis().ticks(5);


	var drawMap = function(){

		var map = new Datamap({
		  element: document.getElementById('map'),
		  scope: 'usa',
		  geographyConfig: {
		    popupOnHover: false,
		    highlightOnHover: false
		  },
		  width:600,
		  height:400,
		  fills: {
		    defaultFill: "#ABDDA4",
		    Weather:'#0571B0',
		    NAS: 'orange',
		    Carrier: 'black',
		    //Security: 'red'
		  }
		});

		return map;
	};

	var map = drawMap();

	var geoData = [];
	_.each(allDim.top(Infinity), function (d) {  
		var col;
		if(d.CancellationCode === 'Weather'){
        	col = '#0571B0'
        }
        else if(d.CancellationCode === 'NAS'){
        	col = 'orange'
        }
        else if(d.CancellationCode === 'Carrier'){
        	col = 'black'
        }
        else{
        	col = 'red'
        }

		geoData.push({ flight: d.flightName,
					   options: {strokeColor: col},
					   origin: {latitude: d.origin_lat, longitude: d.origin_long, name:d.origin_place}, 
					   destination: { latitude: d.dest_lat, longitude: d.dest_long, name:d.dest_place } });
	});

	map.arc(geoData,  {strokeWidth: 0.7, arcSharpness: 1.6, popupOnHover: true, popupTemplate: function(geography, data) {

	        	return '<div class="hoverinfo"><strong>Flight: '+data.flight+' </strong><br>' + data.origin.name + ' -> ' + data.destination.name + '</div>';
	        }
	});

	map.legend();



	//Update the map if any dc chart get filtered
	dcCharts = [timeChart, cancelChart, originPlaceChart];

	_.each(dcCharts, function (dcChart) {
		dcChart.on("filtered", function (chart, filter) {
			
			$("#map").parent().append( "<div id='map'></div>");
        	$("#map").remove();

            map = drawMap();
			geo_Data = [];
			  _.each(allDim.top(Infinity), function (d) { 

			  	var col;
				if(d.CancellationCode === 'Weather'){
		        	col = '#0571b0'
		        }
		        else if(d.CancellationCode === 'NAS'){
		        	col = 'orange'
		        }
		        else if(d.CancellationCode === 'Carrier'){
		        	col = 'black'
		        }
		        else{
		        	col = 'red'
		        }


				geo_Data.push({ flight: d.flightName,
					options: {strokeColor: col},
					origin: {latitude: d.origin_lat, longitude: d.origin_long, name:d.origin_place}, 
					destination: { latitude: d.dest_lat, longitude: d.dest_long, name:d.dest_place } });
		      });

	        map.arc(geo_Data,  {strokeWidth: 0.7, arcSharpness: 1.6 ,  popupOnHover: true, popupTemplate: function(geography, data) {

	        		return '<div class="hoverinfo"><strong>Flight: '+data.flight+' </strong><br>' + data.origin.name + ' -> ' + data.destination.name + '</div>';
	        	}
	        });
	        map.legend();

		});
	});

	dc.renderAll();

};