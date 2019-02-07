import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';

import './module_templates.html';
import "./d3_plots.js"
import './custom.html'
import "./custom.js"


get_filter = function(entry_type){

 var globalSelector = Session.get("globalSelector")
    var myselect = {}
    myselect["entry_type"] = entry_type

    if (globalSelector){
        globalKeys = Object.keys(globalSelector)
        if (globalKeys.indexOf(entry_type) >= 0){
            var localKeys = Object.keys(globalSelector[entry_type])
            for (i=0;i<localKeys.length;i++){
                myselect[localKeys[i]] = globalSelector[entry_type][localKeys[i]]
            }//end for
        };//end if


        // In this part, if another filter has filtered subjects, then filter on the rest
        var subselect = Session.get("subjectSelector")

        if (subselect["subject_id"]["$in"].length){
            myselect["subject_id"] = subselect["subject_id"]
        }
        return myselect
    }
}

get_metrics = function(entry_type){
    Meteor.call("get_metric_names", entry_type, function(error, result){
            Session.set(entry_type+"_metrics", result)
        })
        return Session.get(entry_type+"_metrics")
}

render_histogram = function(entry_type){
    var metric = Session.get("current_"+entry_type)//"Amygdala"
    if (metric == null){
        var all_metrics = Session.get(entry_type+"_metrics")
        if (all_metrics != null){
            Session.set("current_"+entry_type, all_metrics[0])
        }
    }

    if (metric != null){
        var filter = get_filter(entry_type)
        Meteor.call("getHistogramData", entry_type, metric, 20, filter, function(error, result){
	        var data = result["histogram"]
	        var minval = result["minval"]
	        var maxval = result["maxval"]
	        if (data.length){
	            do_d3_histogram(data, minval, maxval, metric, "#d3vis_"+entry_type, entry_type)
	        }
	        else{
	            console.log("attempt to clear histogram here")
	            clear_histogram("#d3vis_"+entry_type)
	        }
    	});
    }
}

// gets the nth column from an matrix
function getColumn(matrix, n) {
	var col = [];
	for (var i = 0; i < matrix.length; i++) {
	  col.push(matrix[i][n]);
	}
	return col;
}

render_scatterplot = function(entry_type) {
	var data, minvalX, maxvalX, minvalY, maxvalY = "";
	var metric = Session.get("scatter_"+entry_type);
  	var all_metrics = Session.get(entry_type+"_metrics");

	if (metric == null) {
		if (all_metrics != null) {
			Session.set("scatter_"+entry_type, all_metrics[0]);
		}
	}

	if (metric != null) {
		var filter = get_filter(entry_type);
		Meteor.call("getScatterData", entry_type, metric, filter, all_metrics, function(error, result) {
		  var metricData = [];
		  for (var i = 0; i < result['data'].length; i++) {
			 var xMetricDataPoint = result['data'][i]._id.metrics[result['xMetric']];
			 var yMetricDataPoint = result['data'][i]._id.metrics[result['yMetric']];
			 var pointName = result['data'][i]._id.name;
		  	 var pointData = [xMetricDataPoint, yMetricDataPoint, pointName];
			 metricData.push(pointData);
		  }
	      if (metricData.length) {
			xdata = getColumn(metricData, 0);
			ydata = getColumn(metricData, 1);
			pointNames = getColumn(metricData, 2);
	        do_scatter(xdata, ydata, pointNames, result['xMetric'], result['yMetric'], "#d3vis_"+entry_type, entry_type)
	      } else {
	        console.log('Attempt to clear scatterplot');
	        // TODO: create scatterplot clear
	      }
		});
	}
}

Template.base.helpers({
  modules: function(){
    console.log(Meteor.settings.public.modules)
    return Meteor.settings.public.modules
  }
})

Template.module.helpers({
  selector: function(){
    return get_filter(this.entry_type)
  },
  table: function(){
    return TabularTables[this.entry_type]
  },
  histogram: function(){
    return this.graph_type == "histogram"
  },
  date_histogram: function(){
    return this.graph_type == "datehist"
  },
  scatterplot: function() {
	  return this.graph_type == "scatterplot"
  },
  metric: function(){
          return get_metrics(this.entry_type)
      },
  currentMetric: function(){
          return Session.get("current_"+this.entry_type)
      },
  scatterMetric: function() {
    return Session.get("scatter_"+this.entry_type);
  }
})

// on page load, render plots
//window.onload = function() {
//	render_histogram(this.entry_type); 
//	render_scatterplot(this.entry_type); 
//}

Template.module.events({
 "change #metric-select": function(event, template){
     var metric = $(event.currentTarget).val()
     Session.set("current_"+this.entry_type, metric)
	render_histogram(this.entry_type); 
 },
 "change #metric-scatter-select": function(event, template){
	 var scatter_metric = $(event.currentTarget).val()
	 Session.set("scatter_"+this.entry_type, scatter_metric)
	render_scatterplot(this.entry_type); 
 },
 "click .clouder": function(event, template){
   var cmd = Meteor.settings.public.clouder_cmd
   Meteor.call("launch_clouder", cmd)
 }
})

Template.base.rendered = function(){
  if (!this.rendered){
      this.rendered = true
  }

  this.autorun(function() {
    Meteor.settings.public.modules.forEach(function(self, idx, arr){
      if (self.graph_type == "histogram"){
	console.log("rendering histogram");
        render_histogram(self.entry_type)
      }
      else if (self.graph_type == "datehist") {
        Meteor.call("getDateHist", function(error, result){
          do_d3_date_histogram(result, "#d3vis_date_"+self.entry_type)
        })
      }
  		else if (self.graph_type == "scatterplot") {
				console.log("rendering scatterplot")
				render_scatterplot(self.entry_type);
  		}
    })
  });
}

Template.body_sidebar.helpers({
  modules: function(){
    return Meteor.settings.public.modules
  }
})
