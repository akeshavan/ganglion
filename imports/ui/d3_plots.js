import "./module_templates.js"

do_scatter = function(data, minvalX, maxvalX, minvalY, maxvalY, dom_id, entry_type){
    // console.log("you ran the do_scatter function")
	// console.log($("#chart svg"))
	//
	//
	// _.defer(function () {
	//
	// 	console.log("testing randomData")
	// 	console.log(randomData(1,40))
	//
	// 	console.log("testing Meteor Call")
	// 	console.log("result from meteor call is", result)
	// 	console.log("nv.log", nv.log(result), nv.log(randomData(1,200)))//Meteor.call("getScatterData", "qa", "anat_fber", "anat_cnr", {}, function(error, result){console.log("error is", error, "result is", result)}))
	//
	//
	// 	var chart;
	// 	    nv.addGraph(function() {
	// 	        chart = nv.models.scatterChart()
	// 	            .showDistX(true)
	// 	            .showDistY(true)
	// 	            .duration(300)
	// 	            .color(d3.scale.category10().range())
	// 			//.useInteractiveGuideline(true);
	// 	        chart.dispatch.on('renderEnd', function(){
	// 	            console.log('render complete');
	// 	        });
	// 	        chart.xAxis.tickFormat(d3.format('.02f'));
	// 	        chart.yAxis.tickFormat(d3.format('.02f'));
	// 			chart.tooltipContent(function(key,y,e,graph){
	// 							//console.log(key,"y",y,"e",e,"",graph)
	// 			                return key;
	// 			            });
	// 			//chart.tooltip.contentGenerator(function(d){console.log(d)})
	// 	        // d3.select('#chart svg')
	// 			d3.select(dom_id)
	// 	            //.datum(nv.log(randomData(1,200)))
	// 				.datum(result)
	// 	            .call(chart);
	// 	        nv.utils.windowResize(chart.update);
	// 	        chart.dispatch.on('stateChange', function(e) { nv.log('New State:', JSON.stringify(e)); });
	// 	        return chart;
	// 	    }, function(){
	//
    //             /*(d3.selectAll(".nv-point").on("click", function(d){
    //                 console.log("data is", d)
    //                 //addPapaya(d.info, d.info.entry_type, template_instance)
    //                 //Session.set("currentViewerInfo", d.info)
    //             })*/
	//
	// 				$(document).on("click", dom_id, function(e){
	// 					var idx = e.target.__data__.point
	//
	// 					console.log("maybe you clicked, ", idx)
	// 					Session.set("subject_selected_from_scatter",result[0].values[idx].info.name)
	// 				})
	//
	// 	    });
	// 	    function randomData(groups, points) { //# groups,# points per group
	// 	        var data = [],
	// 	            shapes = ['circle'],
	// 	            random = d3.random.normal();
	// 	        for (i = 0; i < groups; i++) {
	// 	            data.push({
	// 	                key: 'Group ' + i,
	// 	                values: [],
	// 	                slope: Math.random() - .01,
	// 	                intercept: Math.random() - .5
	// 	            });
	// 	            for (j = 0; j < points; j++) {
	// 	                data[i].values.push({
	// 	                    x: random(),
	// 	                    y: random(),
	// 	                    size: Math.random(),
	// 	                    shape: shapes[j % shapes.length]
	// 	                });
	// 	            }
	// 	        }
	// 	        return data;
	// 	    }
	// })

			//TODO: put in check that says "if clicked on left, put left on y-axis, right on x-axis"
			// else if clicked on a right metric, put in right on x-axis and corresponding left metric
			// on y-axis

			// if you already created the scatter, don't create another one.
			if (d3.select('#d3_scatterplot').empty()) {
				// data that you want to plot, I've used separate arrays for x and y values
				var xdata = [5, 10, 15, 20],
				    ydata = [3, 17, 4, 6];

				// size and margins for the chart
				var margin = {top: 20, right: 15, bottom: 60, left: 60}
				  , width = 960 - margin.left - margin.right
				  , height = 500 - margin.top - margin.bottom;

				// x and y scales, I've used linear here but there are other options
				// the scales translate data values to pixel values for you
				var x = d3.scale.linear()
				          .domain([0, d3.max(xdata)])  // the range of the values to plot
				          .range([ 0, width ]);        // the pixel range of the x-axis

				var y = d3.scale.linear()
				          .domain([0, d3.max(ydata)])
				          .range([ height, 0 ]);

				// the chart object, includes all margins
				var chart = d3.select('.d3scatterplot')
				.append('svg:svg')
				.attr('width', width + margin.right + margin.left)
				.attr('height', height + margin.top + margin.bottom)
				.attr('class', 'chart')
				.attr('id', 'd3_scatterplot')

				// the main object where the chart and axis will be drawn
				var main = chart.append('g')
				.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')')
				.attr('width', width)
				.attr('height', height)
				.attr('class', 'main')

				// draw the x axis
				var xAxis = d3.svg.axis()
				.scale(x)
				.orient('bottom');

				main.append('g')
				.attr('transform', 'translate(0,' + height + ')')
				.attr('class', 'main axis date')
				.call(xAxis);

				// draw the y axis
				var yAxis = d3.svg.axis()
				.scale(y)
				.orient('left');

				main.append('g')
				.attr('transform', 'translate(0,0)')
				.attr('class', 'main axis date')
				.call(yAxis);

				// draw the graph object
				var g = main.append("svg:g");

				g.selectAll("scatter-dots")
				  .data(ydata)  // using the values in the ydata array
				  .enter().append("svg:circle")  // create a new circle for each value
				      .attr("cy", function (d) { return y(d); } ) // translate y value to a pixel
				      .attr("cx", function (d,i) { return x(xdata[i]); } ) // translate x value
				      .attr("r", 10) // radius of circle
				      .style("opacity", 0.6); // opacity of circle
			}
}


do_d3_date_histogram = function (result, dom_id) {
	console.log('doing d3_date_histogram histogram')
    // Defer to make sure we manipulate DOM
    _.defer(function () {
      // Use this as a global variable
      window.d3vis = {}
      //d3.select(dom_id).selectAll("rect").data([]).exit().remove()
      //d3.select(dom_id).selectAll("text").data([]).exit().remove()
      d3.select(dom_id).selectAll("svg").data([]).exit().remove("svg")
      Deps.autorun(function () {

        // On first run, set up the visualiation
        if (Deps.currentComputation.firstRun) {



            var width = 960,
                height = 136,
                cellSize = 17; // cell size

          window.d3vis.margin = {top: 15, right: 5, bottom: 15, left: 5},
          window.d3vis.width = width - window.d3vis.margin.left - window.d3vis.margin.right,
          window.d3vis.height = height - window.d3vis.margin.top - window.d3vis.margin.bottom;
           }

        var formatter = d3.time.format("%Y%m%d")

        //var result = ReactiveMethod.call("getDateHist", selector)
            var valid_vals = result.filter(function(d){
                if (d["_id"]){
                    return true
                    }
                else
                {return false}
                })
            var hist_array = {}
            valid_vals.map(function(d){hist_array[d["_id"]] = d["count"]})
            var scan_dates = valid_vals.map(function(d){return d["_id"]})
            var values = Object.keys(hist_array)
            //console.log(values)
            var lowest = 0
            var highest = _.max(hist_array)

            var minYear = _.min(values).toString().substring(0,4)

            minYear = _.max([minYear,1997])
            maxYear = _.max([2016, maxYear])

            var maxYear = _.max(values).toString().substring(0,4)

            //console.log(highest)

            //console.log("min year", minYear)
            //console.log("maxYear", maxYear)
            var percent = d3.format(".1%"),
                format = d3.time.format("%Y%m%d");

            var color = d3.scale.quantize()
                .domain([lowest, highest])
                .range(d3.range(11).map(function(d) { return "q" + d + "-11"; }));

            var svg = d3.select(dom_id).selectAll("svg")
                .data(d3.range(parseInt(minYear), parseInt(maxYear) + 1))
              .enter().append("svg")
                .attr("width", width)
                .attr("height", height)
                .attr("class", "RdYlGn")
              .append("g")
                .attr("transform", "translate(" + ((width - cellSize * 53) / 2) + "," + (height - cellSize * 7 - 1) + ")");

            svg.append("text")
                .attr("transform", "translate(-6," + cellSize * 3.5 + ")rotate(-90)")
                .style("text-anchor", "middle")
                .text(function(d) { return d; });

            var rect = svg.selectAll(".day")
                .data(function(d) { return d3.time.days(new Date(d, 0, 1), new Date(d + 1, 0, 1)); })
              .enter().append("rect")
                .attr("class", "day")
                .attr("width", cellSize)
                .attr("height", cellSize)
                .attr("x", function(d) { return d3.time.weekOfYear(d) * cellSize; })
                .attr("y", function(d) { return d.getDay() * cellSize; })
                .datum(format);

            rect.append("title")
                .text(function(d) { return d; });

            rect.on("click", function(d){
                console.log(d)
                var currSelect = Session.get("globalSelector")
                if (Object.keys(currSelect).indexOf("demographic") < 0) {
                    currSelect["demographic"] = {}
                }
                currSelect["demographic"]["metrics.DCM_StudyDate"] = parseInt(d)
                Session.set("globalSelector", currSelect)

                Meteor.call("get_subject_ids_from_filter", currSelect["demographic"], function(error, result){
                    console.log("result from get subject ids from filter is", result)
                    var ss = Session.get("subjectSelector")
                    ss["subject_id"]["$in"] = result
                    Session.set("subjectSelector", ss)
                })


                })

            //console.log("going to filter rects")

            rect.filter(function(d) {
                return scan_dates.indexOf(parseInt(d)) >= 0; })
                  .attr("class", function(d) {
                      var new_class = "day " + color(hist_array[d]);
                      //console.log(d,new_class)
                      return new_class
                      })

            svg.selectAll(".month")
                .data(function(d) { return d3.time.months(new Date(d, 0, 1), new Date(d + 1, 0, 1)); })
              .enter().append("path")
                .attr("class", "month")
                .attr("d", monthPath);

            function monthPath(t0) {
              var t1 = new Date(t0.getFullYear(), t0.getMonth() + 1, 0),
                  d0 = t0.getDay(), w0 = d3.time.weekOfYear(t0),
                  d1 = t1.getDay(), w1 = d3.time.weekOfYear(t1);
              return "M" + (w0 + 1) * cellSize + "," + d0 * cellSize
                  + "H" + w0 * cellSize + "V" + 7 * cellSize
                  + "H" + w1 * cellSize + "V" + (d1 + 1) * cellSize
                  + "H" + (w1 + 1) * cellSize + "V" + 0
                  + "H" + (w0 + 1) * cellSize + "Z";
                }






    }); //Deps autorun
  }); //defer
  }// end of function

d3barplot = function(window, data, formatCount, metric, entry_type){
        // fs_tables is the original table the stuff came from
        //console.log("data is", data)
        var bar_selector = window.d3vis.svg.selectAll("rect")
          .data(data)
        var text_selector = window.d3vis.svg.selectAll(".bar_text")
          .data(data)


        bar_selector
          .enter().append("rect")
          .attr("class", "bar")
        bar_selector
          //.transition()
          //.duration(100)
          .attr("x", function(d) { return window.d3vis.x(d._id);})
          //.attr("width", window.d3vis.x(data[0].dx) - 1)
          .attr("width", window.d3vis.width/20/2+"px")//(window.d3vis.x.range()[1] - window.d3vis.x.range()[0])/bins - 10)
          .attr("y", function(d) { return window.d3vis.y(d.count); })
          .attr("height", function(d) { return window.d3vis.height - window.d3vis.y(d.count); })
          .attr("fill", "steelblue")
          .attr("shape-rendering","crispEdges")

        //var clicked = false



        bar_selector.enter().append("text")
        .attr("dy", "1em")
        .attr("y", function(d) { return window.d3vis.y(d.count) - 15; })
        .attr("x", function(d) {
              var width = window.d3vis.width/20/2
              return window.d3vis.x(d._id) + width/2;
              })
        .attr("fill", "black")
        .attr("text-anchor", "middle")
        .text(function(d) { return formatCount(d.count); });

        text_selector.enter().append("text")
        .attr("dy", "1em")
        .attr("y", window.d3vis.height+4)
        .attr("x", function(d){
            var width = window.d3vis.width/20/2
            return window.d3vis.x(d._id) + width/2;
        })
        .attr("text-anchor", "middle")
        .attr("fill", "black")
        .attr("font-size", "10px")
        .text(function(d) {
          if (d._id < 1){
            return d3.format(".2f")(d._id)
          } else {
            return d3.format(".1f")(d._id)
          }
         });

        var brush = d3.svg.brush()
            .x(window.d3vis.x)
            .extent([_.min(data), _.max(data)])
            .on("brush", brushed)
            .on("brushend", brushend)

        var gBrush = window.d3vis.svg.append("g")
            .attr("class", "brush")
            .call(brush);

        gBrush.selectAll("rect")
            .attr("height", window.d3vis.height)
            .on("click", function(d){
                d3.event.stopPropagation();
                console.log("clicked brush rect", d)})


        function brushed() {
          var extent0 = brush.extent()
              //extent1;

          //console.log(d3.event.mode)



          // if dragging, preserve the width of the extent
          if (d3.event.mode === "move") {
                  //console.log("moving")
          }

          // otherwise, if resizing, round both dates
          else {
            extent1 = extent0//.map(d3.time.day.round);
            //console.log("extending")
            // if empty when rounded, use floor & ceil instead
            /*if (extent1[0] >= extent1[1]) {
              extent1[0] = d3.time.day.floor(extent0[0]);
              extent1[1] = d3.time.day.ceil(extent0[1]);
            }*/
          }

          //d3.select(this).call(brush.extent(extent1));
        }

        function brushend(){
            var extent0 = brush.extent()

            if (extent0[1] - extent0[0]){

                d3.selectAll(".brush").call(brush.clear());
                var newkey = "metrics."+metric


                var gSelector = Session.get("globalSelector")
                if (Object.keys(gSelector).indexOf(entry_type) < 0 ){
                    gSelector[entry_type] = {}
                }
                gSelector[entry_type][newkey] = {$gte: extent0[0], $lte: extent0[1]}
                Session.set("globalSelector", gSelector)
                /*
                var fs_and_subs = {}
                fs_and_subs[entry_type] = gSelector[entry_type]

                var subselect = Session.get("subjectSelector")

                if (subselect["subject_id"]["$in"].length){
                    fs_and_subs["subject_id"] = subselect["subject_id"]
                }*/

                var filter = get_filter(entry_type)
                filter[newkey] = {$gte: extent0[0], $lte: extent0[1]}

                Meteor.call("get_subject_ids_from_filter", filter, function(error, result){
                    //console.log("result from get subject ids from filter is", result)
                    var ss = Session.get("subjectSelector")
                    ss["subject_id"]["$in"] = result
                    Session.set("subjectSelector", ss)
                })


            }

            console.log("ended brushing", extent0)
        }




      };

clear_histogram = function(dom_id){
  d3.select(dom_id).selectAll("rect").data([]).exit().remove();
  d3.select(dom_id).selectAll("text").data([]).exit().remove();
  d3.select("#d3vis_T1w").append("text").text("Nothing to show right now").attr("x", 0).attr("y", 50).attr("dy", "2em")
    .attr("fill", "#d9534f")

}

do_d3_histogram = function (values, minval, maxval, metric, dom_id, entry_type) {
    // Defer to make sure we manipulate DOM
    _.defer(function () {
        //console.log("HELLO, ATTEMPTING TO DO TABLE!!", fs_tables)
      // Use this as a global variable
      window.d3vis = {}
      Deps.autorun(function () {
        d3.select(dom_id).selectAll("rect").data([]).exit().remove()
        d3.select(dom_id).selectAll("text").data([]).exit().remove()
        // On first run, set up the visualiation
        if (Deps.currentComputation.firstRun) {
          window.d3vis.margin = {top: 15, right: 25, bottom: 15, left: 25},
          window.d3vis.width = 900 - window.d3vis.margin.left - window.d3vis.margin.right,
          window.d3vis.height = 125 - window.d3vis.margin.top - window.d3vis.margin.bottom;

          window.d3vis.x = d3.scale.linear()
              .range([0, window.d3vis.width]);

          window.d3vis.y = d3.scale.linear()
              .range([window.d3vis.height, 0]);

          window.d3vis.color = d3.scale.category10();



          window.d3vis.svg = d3.select(dom_id)
              .attr("width", window.d3vis.width + window.d3vis.margin.left + window.d3vis.margin.right)
              .attr("height", window.d3vis.height + window.d3vis.margin.top + window.d3vis.margin.bottom)
            .append("g")
              .attr("class", "wrapper")
              .attr("transform", "translate(" + window.d3vis.margin.left + "," + window.d3vis.margin.top + ")");

          window.d3vis.xAxis = d3.svg.axis()
                                .scale(window.d3vis.x)
                                .orient("bottom")
          //                      .tickFormat(d3.format(",.0f"))

          window.d3vis.svg.append("g")
                .attr("class", "x axis")
                .attr("transform", "translate(0," + window.d3vis.height + ")")
          //     .call(window.d3vis.xAxis);
           }


        //var values = get_histogram(fs_tables, metric, bins)
        window.d3vis.x.domain([minval, maxval]);

        window.d3vis.y.domain([0, d3.max(values, function(d) { return d.count; })]);


        var formatCount = d3.format(",.0f");
        d3barplot(window, values, formatCount, metric, entry_type)

    });
  })
  }
