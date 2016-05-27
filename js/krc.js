//to do
// put dropdowns into separate divs to break on mobile
// turn radio buttons to buttons

//Nepal
/*
var config = {
	aggregators: ['Round'],
	color:'#b71c1c',
	colorbutton:'#EF5350',
	colorfont:'#ffffff',
	mapcolors:['#cccccc','#FFCDD2','#E57373','#F44336','#B71C1C'],
	locations:'Location',
	datafile:'data/resultsnepal.csv',
	geomfile:'data/nepal_adm3_simplified.geojson',
	joinAttr:'DISTRICT'

}
*/
//krc

var config = {
	aggregators: [],
	color:'#b71c1c',
	colorbutton:'#EF5350',
	colorfont:'#ffffff',
	mapcolors:['#cccccc','#FFCDD2','#E57373','#F44336','#B71C1C'],
	locations:'Location',
	datafile:'data/resultskrc.csv',
	geomfile:'data/krc_wards.geojson',
	joinAttr:'NAME'
}

//unicef

/*var config = {
	aggregators: ['Sex'],
	color:'#b71c1c',
	mapcolors:['#cccccc','#FFCDD2','#E57373','#F44336','#B71C1C'],
	locations:'Location',
	datafile:'data/resultsunicef.csv',
	geomfile:'data/krc_wards.geojson'
	joinAttr:'NAME'
}*/

var map;
var overlay;
var mapon = false;


// load data for dashboard

function loadData(){

	var dataCall = $.ajax({ 
	    type: 'GET', 
	    url: config.datafile, 
	    dataType: 'text',
	});

	var geomCall = $.ajax({ 
	    type: 'GET', 
	    url: config.geomfile, 
	    dataType: 'json',
	});

	$.when(dataCall,geomCall).then(function(dataArgs,geomArgs){
		initDash(d3.csv.parse(dataArgs[0]),geomArgs[0]);
	});

}

// loaded data pass to dash and crossfilter created to obtain questions
// crossfilter also used to get subset of filtered question

function initDash(data,geom){

	// crossfilter of data
	cf = crossfilter(data);

	// questions dimensionalised and grouped
	cf.questionsDim = cf.dimension(function(d){return d['Question']});

	cf.questionsGroup = cf.questionsDim.group();

	// get list of unique questions
	var questions = cf.questionsGroup.all().map(function(v,i){
		return v.key;
	});

	// generated question list and if clicked generated graph for question
	questions.forEach(function(q,i){
		$('#questions').append('<div id="question'+i+'" class="questionbox">'+q+'</div>');
		$('#question'+i).on('click',function(){
			cf.questionsDim.filter(q);
			$('#question').html(q);
			genQuestion(cf.questionsDim.top(Infinity));
			if($(window).width()<940){
				$(".questionbox").hide();
				$("#collapse").show();
			}
		})
	});

	// render first question be default

	cf.questionsDim.filter(questions[0]);
	$('#question').html(questions[0]);
	createMap(geom);
	genQuestion(cf.questionsDim.top(Infinity));
	
}

// question initialisation

function genQuestion(data){

	// create crossfilter of subset
	var cf = crossfilter(data);
	cf.data = data;
	cf.aggs = [];
	
	// create answer dimension
	cf.answersDim = cf.dimension(function(d){return d['Answer']});
	
	// aggregators are the dimensions for filtering.  These include the location, answers and aggregators element
	aggregators = [config.locations,'Answer'].concat(config.aggregators);

	//create crossfilter dimension for each aggregator
	aggregators.forEach(function(agg,i){
		cf.aggs[agg] = {};
		cf.aggs[agg].dim = cf.dimension(function(d){return d[agg]});
		cf.aggs[agg].values = cf.aggs[agg].dim.group().all().map(function(v,i){return v.key;});	
	});

	// create groups to display graphs + map
	cf.answersGroup = cf.aggs['Answer'].dim.group().reduceSum(function(d){return d['Count']});
	cf.locationsGroup = cf.aggs[config.locations].dim.group().reduceSum(function(d){return d['Count']});
	
	// drop down generated for graphs (map has answers, but not locations in dropdown)
	genDropdowns(cf,[config.locations].concat(config.aggregators));
	
	// data for graph
	var data = cf.answersGroup.all();

	// get total of respondents
	var total=0;
	data.forEach(function(d){
			total+=d.value
	});

	$('#total').html(total+' respondants');

	// set radio buttons to default graph
	$("input[type=radio][name=chart][value=bar]").prop('checked',true);
	
	//make sure graphs is showing and map isn't
	$('#graph').show();
	$('#map').hide();

	// draw default graph
	drawGraph(data,false);

	//add radio buttons for chart type
	//$('#charts').html('<div class="radio"><input class="charttype" type="radio" name="chart" value="bar" checked><span class="rightspace"> Bar Chart</span></div><div class="radio"><input class="charttype" type="radio" name="chart" value="barper"><span class="rightspace"> Bar Chart (percent)</span></div><div class="radio"><input class="charttype" type="radio" name="chart" value="ci"><span class="rightspace"> 95% confidence intervals </span></div><div class="radio"><input class="charttype" type="radio" name="chart" value="map"> Map</div>');
	$('#charts').html('<div><button id="barchart" class="chartbutton btn btn-default">Bar chart</button><button id="barper" class="chartbutton btn btn-default">Bar chart (percent)</button><button id="cichart" class="chartbutton btn btn-default">Confidence intervals</button><button id="mapchart" class="chartbutton btn btn-default">Map</button></div>');
	$('.chartbutton').css({
			'background-color':config.color,
			'color':config.colorfont});
		$('.questbutton').css({
			'background-color':config.color,
			'color':config.colorfont});
	//redraw graph on window change
	$(window).on('resize',function(){
		drawGraph(data,false);
	});

	// generate new graph/map for radio button change
	$('.charttype').on('change',function(){changeRadio(cf);});

	$('.chartbutton').on('click',function(e){
		changeChart(cf,e.currentTarget.id);
	})
}

// action on choosing new graph type

function changeChart(cf,chart){

		//data for graphs
		var data = cf.answersGroup.all();

		//data for map
		var mapData = cf.locationsGroup.all();
			totalperlocation = {};
			mapData.forEach(function(d){
				totalperlocation[d.key] =d.value;
		});
		currentChart = chart;
		// draw correct graph type and change dropdowns if appropriate
        if(chart=='cichart'){			
			$('#graph').show();
			$('#map').hide(); 
			if(mapon){
				mapon = false;
				updateDropdowns(cf,config.locations);
			}			
			confidenceGraph(data);
			$(window).on('resize',function(){
				confidenceGraph(data);
			});
		} else if(chart=='barchart'){
			$('#graph').show();
			$('#map').hide();
			if(mapon){
				mapon = false;
				updateDropdowns(cf,config.locations);
			}			
			drawGraph(data,false);
			$(window).on('resize',function(){
				drawGraph(data,false);
			});
		} else if(chart=='barper'){			
			$('#graph').show();
			$('#map').hide();
			if(mapon){
				mapon = false;
				updateDropdowns(cf,config.locations);
			}
			drawGraph(data,true);
			$(window).on('resize',function(){
				console.log('resize');
				drawGraph(data,true);
			});			
		}  else if(chart=='mapchart'){
			$('#graph').hide();
			$('#map').show();
			updateDropdowns(cf,'Answer');
			mapon = true;
			updateMap(cf.locationsGroup.all(),cf);
			map.invalidateSize();
			map.fitBounds(overlay.getBounds());		
		} 		
	}

// generate drop downs	

function genDropdowns(cf,aggs){

	$('#aggregators').html('');
	aggs.forEach(function(agg,i){
		createDropdown(cf.aggs[agg].values,cf,i,agg);
	});

	$('#aggregators').append('<div class="col-md-4"><span id="total"></span></div>');

	
}

// function to change dropdown on graph/map switch

function updateDropdowns(cf,agg){

	// clear filters

	cf.aggs['Answer'].dim.filter();
	cf.aggs[config.locations].dim.filter();

	// list of values created
	answers = cf.aggs[agg].values;

	// if locations include answer for no filter otherwise filter to first answer
	if(agg!="Answer"){
		answers = ['No filter'].concat(answers);
	} else {
		cf.aggs[agg].dim.filter(answers[0]);
	}

	// create html drop down
	var html = agg+': <select id="aggchange" class="rightspace">';

	answers.forEach(function(a){
		html = html + '<option value="'+a+'">'+a+'</option> ';
	});

	html = html + '</option>';

	// insert new dropdown
	$('#changeagg').html(html);


	//add on change event on drop down
	$('#aggchange').on('change',function(){
		if(this.value=='No filter'){
			cf.aggs[agg].dim.filter();
		} else {
			cf.aggs[agg].dim.filter(this.value);
		}
		var data = cf.answersGroup.all();
		if(currentChart=='cichart'){
			confidenceGraph(data);		
		} else if(currentChart=='bar'){
			drawGraph(data,false);		
		} else if(currentChart=='barper'){
			drawGraph(data,true);
		} else if(currentChart=='mapchart'){
			var data = cf.locationsGroup.all();
			var total=0;
			data.forEach(function(d){
				total+=d.value
			});
			$('#total').html(total+' respondants');
			
			updateMap(cf.locationsGroup.all(),cf);
		}		
	});		
}



function createDropdown(answers,cf,i,agg){
	if(agg!="Answer"){
		answers = ['No filter'].concat(answers);
	} else {
		cf.aggs[agg].dim.filter(answers[0]);
	}
	if(agg=="Answer" || agg==config.locations){
		var html = '<div class="col-md-4"><span id="changeagg">'+agg+': <select id="aggchange" class="rightspace">';
		var id = 'change';
	} else {
		var html = '<div class="col-md-4">'+agg+': <select id="agg'+i+'" class="rightspace">';
		var id = i;
	}

	answers.forEach(function(a){
		html = html + '<option value="'+a+'">'+a+'</option> ';
	});

	html = html + '</select>';
	if(agg=="Answer" || agg==config.locations){
		html = html +"</span>"
	}
	html += '</div>';
	$('#aggregators').append(html);

	$('#agg'+id).on('change',function(){
		if(this.value=='No filter'){
			cf.aggs[agg].dim.filter();
		} else {
			cf.aggs[agg].dim.filter(this.value);
		}
		var data = cf.answersGroup.all();
		var total=0;
			data.forEach(function(d){
				total+=d.value
			});
		if(currentChart=='cichart'){
			$('#total').html(total+' respondants');
			confidenceGraph(data);		
		} else if(currentChart=='barchart'){
			$('#total').html(total+' respondants');
			drawGraph(data);		
		} else if(currentChart=='barper'){
			$('#total').html(total+' respondants');
			drawGraph(data,true);
		} else if(currentChart=='mapchart'){
			var data = cf.locationsGroup.all();
			var total=0;
			data.forEach(function(d){
				total+=d.value
			});
			$('#total').html(total+' respondants');
			updateMap(cf.locationsGroup.all(),cf);
		}		
	});
}

function drawGraph(data,percent){

	$('#graph').html('');

	data = shortenKey(data);

	var total=0
	data.forEach(function(d){
		total += d.value;
	});

	var margin = {top: 40, right: 30, bottom: 200, left: 50},
		width = $("#graph").width() - margin.left - margin.right,
		height =  450 - margin.top - margin.bottom;
		
 	var x = d3.scale.ordinal()
        .rangeRoundBands([0, width]);

    var y = d3.scale.linear()
        .range([height,0]); 

    var xAxis = d3.svg.axis()
        .scale(x)
        .orient("bottom");
      
	x.domain(data.map(function(d) {return d.key; }));

	var maxy = d3.max(data,function(d){
		return d.value;
	});

	y.domain([0,maxy*1.1]);

	var svg = d3.select("#graph").append("svg")
		.attr("width", width + margin.left + margin.right)
		.attr("height", height + margin.top + margin.bottom)
		.append("g")
		.attr("transform", "translate(" + margin.left + "," + margin.top + ")");


    svg.append("g")
		.attr("class", "x axis baraxis")
		.attr("transform", "translate(0," + (height+15) + ")")
		.call(xAxis)
		.selectAll("text")  
		.style("text-anchor", "end")
		 .attr("transform", function(d) {
		    return "rotate(-50)" 
		});			    		    

	svg.append("g").selectAll("rect")
	    .data(data)
	    .enter()
	    .append("rect") 
	    .attr("x", function(d,i) { return x(d.key)+3; })
	    .attr("width", x.rangeBand()-6)
	    .attr("y", function(d){return y(d.value);})
	    .attr("height", function(d) {return height-y(d.value);})
	    .attr("fill",config.color);

	svg.append("g").selectAll("text")
	    .data(data)
	    .enter()
	    .append("text") 
	    .attr("x", function(d){return x(d.key)+x.rangeBand()/2})
	    .attr("y", function(d) {if(height-y(d.value)<30){
	    		return y(d.value)-10;
	    	}
	    	if(x.rangeBand()<60){
	    		return y(d.value)-10;
	    	}
	    	return y(d.value)+25;	    		
	    })
	    .text(function(d){
	    	if(percent){
	    		return d3.format(".1%")(d.value/total);
	    	} else {
	    		return d3.format(".3d")(d.value);
	    	}	        
	    })
	    .style("text-anchor", "middle")
	    .attr("class",function(d){
	    	if(x.rangeBand()>60){
	    		return "numberlabel"
	    	} else {
	    		return "numberlabelsmall"
	    	}
	    })
	    .attr("fill",function(d) {if(height-y(d.value)<30){
	    		return '#000000'
	    	}
	    	if(x.rangeBand()<60){
	    		return '#000000'
	    	}
	    	return '#ffffff';	    		
	    });
}

function confidenceGraph(data,confidence){
	var total = 0;
	confidence = 1.96;

	data = shortenKey(data);

	data.forEach(function(d){
		total += d.value;
	});

	data.forEach(function(d){
		var p = d.value/total;
		var se = Math.pow((p*(1-p)/total),0.5);
		ci = d.value/total - confidence*se
		ci3 = 1-1/(total/3);
		d.lower = Math.min(ci,ci3);
		if(d.lower<0){d.lower=0};
		ci = d.value/total + confidence*se;
		ci3 = 1/(total/3);
		d.upper = Math.max(ci,ci3);
		if(d.upper>1){d.upper=1};
	});
	$('#graph').html('');

	var margin = {top: 40, right: 30, bottom: 200, left: 50},
		width = $("#graph").width() - margin.left - margin.right,
		height =  450 - margin.top - margin.bottom;
		
 	var x = d3.scale.ordinal()
        .rangeRoundBands([0, width]);

    var y = d3.scale.linear()
        .range([height,0]); 

    var xAxis = d3.svg.axis()
        .scale(x)
        .orient("bottom");
      
	x.domain(data.map(function(d) {return d.key; }));

	var maxy = d3.max(data,function(d){
		return d.value/total;
	});

	var maxuy = d3.max(data,function(d){
		return d.upper;
	});

	y.domain([0,Math.max(maxy*1.1,maxuy)]);	

	var svg = d3.select("#graph").append("svg")
		.attr("width", width + margin.left + margin.right)
		.attr("height", height + margin.top + margin.bottom)
		.append("g")
		.attr("transform", "translate(" + margin.left + "," + margin.top + ")");


    svg.append("g")
		.attr("class", "x axis baraxis")
		.attr("transform", "translate(0," + (height+15) + ")")
		.call(xAxis)
		.selectAll("text")  
		.style("text-anchor", "end")
		 .attr("transform", function(d) {
		    return "rotate(-50)" 
		});

	svg.append("g").selectAll("rect")
	    .data(data)
	    .enter()
	    .append("rect") 
	    .attr("x", function(d,i) { return x(d.key)+3; })
	    .attr("width", x.rangeBand()-6)
	    .attr("y", function(d){return y(d.value/total);})
	    .attr("height", function(d) {return height-y(d.value/total);})
	    .attr("fill","#eeeeee");					    		    

	svg.append("g").selectAll("line")
	    .data(data)
	    .enter()
	    .append("line") 
	    .attr("x1", function(d,i) { return x(d.key)+x.rangeBand()*0.35; })
	    .attr("x2", function(d,i) { return x(d.key)+x.rangeBand()*0.65; })
	    .attr("y1", function(d){return y(d.upper);})
	    .attr("y2", function(d) {return y(d.upper);})
	    .attr("stroke-width",1)
	    .attr("stroke",config.color);

	svg.append("g").selectAll("line")
	    .data(data)
	    .enter()
	    .append("line") 
	    .attr("x1", function(d,i) { return x(d.key)+x.rangeBand()*0.35; })
	    .attr("x2", function(d,i) { return x(d.key)+x.rangeBand()*0.65; })
	    .attr("y1", function(d){return y(d.lower);})
	    .attr("y2", function(d) {return y(d.lower);})
	    .attr("stroke-width",1)
	    .attr("stroke",config.color);

	svg.append("g").selectAll("line")
	    .data(data)
	    .enter()
	    .append("line") 
	    .attr("x1", function(d,i) { return x(d.key)+x.rangeBand()/2; })
	    .attr("x2", function(d,i) { return x(d.key)+x.rangeBand()/2; })
	    .attr("y1", function(d){return y(d.lower);})
	    .attr("y2", function(d) {return y(d.upper);})
	    .attr("stroke-width",1)
	    .attr("stroke",config.color)
	    .style("stroke-dasharray", ("3, 3"));	    	    

	svg.append("g").selectAll("line")
	    .data(data)
	    .enter()
	    .append("line") 
	    .attr("x1", function(d,i) { return x(d.key)+3; })
	    .attr("x2", function(d,i) { return x(d.key)+x.rangeBand()-3; })
	    .attr("y1", function(d){return y(d.value/total);})
	    .attr("y2", function(d) {return y(d.value/total);})
	    .attr("stroke-width",1)
	    .attr("stroke",config.color);

	svg.append("g").selectAll("text")
	    .data(data)
	    .enter()
	    .append("text") 
	    .attr("x", function(d){return x(d.key)+x.rangeBand()/2})
	    .attr("y", function(d) {return y(d.upper)-10;})
	    .text(function(d){
	    	return d3.format(".1%")(d.upper);        
	    })
	    .style("text-anchor", "middle")
	    .attr("class",function(d){
	    	if(x.rangeBand()>60){
	    		return "numberlabel"
	    	} else {
	    		return "numberlabelsmall"
	    	}
	    })
	    .attr("fill",function(d) {return '#000000';});

	svg.append("g").selectAll("text")
	    .data(data)
	    .enter()
	    .append("text") 
	    .attr("x", function(d){return x(d.key)+x.rangeBand()/2})
	    .attr("y", function(d) {return y(d.lower)+25;})
	    .text(function(d){
	    	return d3.format(".1%")(d.lower);        
	    })
	    .style("text-anchor", "middle")
	    .attr("class",function(d){
	    	if(x.rangeBand()>60){
	    		return "numberlabel"
	    	} else {
	    		return "numberlabelsmall"
	    	}
	    })
	    .attr("fill",function(d) {return '#000000';});	    
}

function createMap(geom){
	var base_hotosm = L.tileLayer(
        'http://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png',{
        attribution: '&copy; OpenStreetMap contributors, <a href="http://hot.openstreetmap.org/">Humanitarian OpenStreetMap Team</a>'}
    );

	map = L.map('map',{
				center: [0,0],
		        zoom: 3,
		        layers: [base_hotosm]
			});

	var style = {
	    fillColor: "#eeeeee",
	    color: "#eeeeee",
	    weight: 1,
	    opacity: 0.8,
	    fillOpacity: 0.6
	};

	overlay = L.geoJson(geom,{style:style,onEachFeature:onEachFeature}).addTo(map);

	var legend = L.control({position: 'bottomright'});

	legend.onAdd = function (map) {

	    var div = L.DomUtil.create('div', 'info legend'),
	        labels = ['No survey','0% <= x < 10%','10% <= x < 20%','20% <= x < 40%' ,'40% <= x'];

	    for (var i = 0; i < labels.length; i++) {
	        div.innerHTML +='<i style="background:' + config.mapcolors[i] + '"></i> ' + labels[i] + '<br />';
	    }

	    return div;
	};

	legend.addTo(map);

	var info = L.control();

	info.onAdd = function (map) {
	    this._div = L.DomUtil.create('div', 'info');
	    this.update();
	    return this._div;
	};

	info.update = function (props) {
	    this._div.innerHTML = (props ?'<b>' + props[config.joinAttr] + '</b><br />' + Math.round(props.Svalue*100)+'%': 'Hover location for details');
	};

	info.addTo(map);		
	
	$('#map').hide();

	function onEachFeature(feature, layer) {
    	layer.on({
	        mouseover: highlightFeature,
	        mouseout: resetHighlight
    	});
	}

	function highlightFeature(e) {
	    info.update(e.target.feature.properties);
	}

	function resetHighlight(e) {
	    info.update();
	}
}

function shortenKey(data){
	data.forEach(function(d){
		if(d.key.length>32){
			d.key = d.key.substring(0,30)+'...';
		}
	})
	return data
}

function updateMap(data,cf){
	var total = 0;
	confidence = 1.96;
	var hash = {};

	data.forEach(function(d){
		hash[d.key] = d.value;
	});
	cf.aggs['Answer'].dim.filter();
	var mapData = cf.locationsGroup.all();
	totalperlocation = {};
	mapData.forEach(function(d){
		totalperlocation[d.key] =d.value;
	});
	cf.aggs['Answer'].dim.filter($('#aggchange').val());
	overlay.setStyle(style);

	function style(feature){
		feature.properties.Svalue = 'N/A';
		if(feature.properties[config.joinAttr] in hash){
			feature.properties.Svalue = hash[feature.properties[config.joinAttr]]/totalperlocation[feature.properties[config.joinAttr]];
			var num = hash[feature.properties[config.joinAttr]]/totalperlocation[feature.properties[config.joinAttr]];
			if(num>0.4){
				var color = config.mapcolors[4];
			} else if (num>0.2) {
				var color = config.mapcolors[3];
			} else if (num>0.1){
				var color = config.mapcolors[2];
			} else{
				var color = config.mapcolors[1];
			}
			
		} else {
			var color = config.mapcolors[0];
		}
		return {color: color,
				fillColor:color}
	}

}

var cf;
var currentChart='barchart';
$('#collapse').hide();
$('#expand').on('click',function(){
	$('.questionbox').show();
	$('#collapse').hide();
});
loadData();