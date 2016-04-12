var config = {
	agggregators: [],
	color:'#b71c1c'
}

function loadData(){
	$.ajax(
		{
			url: "data/results.csv",
			success: function(result){
        		initDash(d3.csv.parse(result));
    		}
    	});
}

function initDash(data){
	cf = crossfilter(data);
	cf.questionsDim = cf.dimension(function(d){return d['Question']});
	//cf.answersDim = cf.dimension(function(d){return d['Answer']});
	//cf.placesDim = cf.dimension(function(d){return d['Location']});

	cf.questionsGroup = cf.questionsDim.group();

	var questions = cf.questionsGroup.all().map(function(v,i){
		return v.key;
	});

	questions.forEach(function(q,i){
		$('#questions').append('<div id="question'+i+'" class="questionbox">'+q+'</div>');
		$('#question'+i).on('click',function(){
			cf.questionsDim.filter(q);
			$('#graph').html('');
			$('#question').html(q);
			genQuestion(cf.questionsDim.top(Infinity));
		})
	});

	cf.questionsDim.filter(questions[0]);
	$('#question').html(questions[0]);
	genQuestion(cf.questionsDim.top(Infinity));
}

function genQuestion(data){

	var cf = crossfilter(data);
	cf.answersDim = cf.dimension(function(d){return d['Answer']});
	cf.answersGroup = cf.answersDim.group().reduceSum(function(d){return d['Count']});
	var data = cf.answersGroup.all();

	var margin = {top: 40, right: 30, bottom: 150, left: 50},
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

	y.domain([0,maxy]);

	var svg = d3.select("#graph").append("svg")
		.attr("width", width + margin.left + margin.right)
		.attr("height", height + margin.top + margin.bottom)
		.append("g")
		.attr("transform", "translate(" + margin.left + "," + margin.top + ")");


    svg.append("g")
		.attr("class", "x axis baraxis")
		.attr("transform", "translate(0," + height + ")")
		.call(xAxis)
		.selectAll("text")  
		.style("text-anchor", "end")
		 .attr("transform", function(d) {
		    return "rotate(-35)" 
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
	    	return y(d.value)+25;	    		
	    })
	    .text(function(d){
	        return d3.format(".3d")(d.value);
	    })
	    .style("text-anchor", "middle")
	    .attr("class","numberlabel")
	    .attr("fill",function(d) {if(height-y(d.value)<30){
	    		return '#000000'
	    	}
	    	return '#ffffff';	    		
	    });

}


var cf;
loadData();