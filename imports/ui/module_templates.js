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
        //console.log("global keys are", globalKeys, globalKeys.indexOf(entry_type))
        if (globalKeys.indexOf(entry_type) >= 0){
            var localKeys = Object.keys(globalSelector[entry_type])
            //console.log("local keys are", localKeys)
            for (i=0;i<localKeys.length;i++){
                myselect[localKeys[i]] = globalSelector[entry_type][localKeys[i]]
            }//end for
        };//end if

        //console.log("selector for", entry_type, "is", myselect)

        // In this part, if another filter has filtered subjects, then filter on the rest
        var subselect = Session.get("subjectSelector")

        if (subselect["subject_id"]["$in"].length){
            myselect["subject_id"] = subselect["subject_id"]
        }
        //console.log("myselect is", myselect)
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
        //console.log("filter is", filter)
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

render_scatterplot = function(entry_type) {
	var data, minvalX, maxvalX, minvalY, maxvalY = "";
	var metric = Session.get("scatter_"+entry_type);
  console.log(metric)
  var all_metrics = Session.get(entry_type+"_metrics");

	if (metric == null) {
		if (all_metrics != null) {
			Session.set("scatter_"+entry_type, all_metrics[0]);
		}
	}
  // var all_metrics = Session.get(entry_type+"_metrics");
  // OFFENDING LINE?
  // if (all_metrics != null) {
  //   Session.set("scatter_"+entry_type, all_metrics[0]);
  // }

	if (metric != null) {
		var filter = get_filter(entry_type);
		Meteor.call("getScatterData", entry_type, metric, filter, all_metrics, function(error, result) {
      // console.log('asdf')
      // console.log(result['xData'])
      // console.log(result['yData'])
      // console.log(result['filter'])
      // for (var i = 0; i < result['xData'].length; i++) {
      //   console.log('x: ' + result['xData'][i] + ' y: ' + result['yData'][i])
      // }
      if (result['xData'].length && result['yData'].length) {
        do_scatter(result['xData'], result['yData'], "#d3vis_"+entry_type, entry_type)
        // do_scatter(data, ydata, "#d3vis_"+entry_type, entry_type);
      } else {
        console.log('Attempt to clear scatterplot');
        // TODO: create scatterplot clear
      }
			// var data = result["scatterplot"];
			// if (data.length) {
			// 	console.log('doscat');
			// 	do_scatter(data, minvalX, maxvalX, minvalY, maxvalY, "#d3vis_"+entry_type, entry_type);
			// 	// do_scatter()
			// } else {
			// 	// TODO: clear scatter
			// }
		});
	}
	// console.log("ASDF " + metric);
	// console.log('ALL' + all_metrics);
	//
	// if (metric != null) {
	// 	var filter = get_filter(entry_type);
	// 	Meteor.call("getScatterData", entry_type, metric, 20, filter, function(error, result) {
	// 		var data = result["scatterplot"];
	// 		var minval
	// 	})
	// }
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

Template.module.events({
 "change #metric-select": function(event, template){
     var metric = $(event.currentTarget).val()
     console.log("metric: ", metric)
     Session.set("current_"+this.entry_type, metric)
 },
 "change #metric-scatter-select": function(event, template){
	 var metric = $(event.currentTarget).val()
	 console.log("metric: ", metric)
	 Session.set("scatter_"+this.entry_type, metric)
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
  // TODO: this var is to stop the duplicating scatterplot, for some reason,
  // autorun wants to do the scatterplot twice every time, reverting back to the
  // original metric
  this.autorun(function() {
	  var scatterRun = 0;
	  console.log('asdfadsfasdfasdf')
    // console.log('entry type ' + entry_type);
      Meteor.settings.public.modules.forEach(function(self, idx, arr){
        if (self.graph_type == "histogram"){
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
