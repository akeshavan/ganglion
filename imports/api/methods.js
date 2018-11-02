import {Subjects} from "./module_tables.js"

Meteor.methods({

    getDateHist: function(){
            //console.log("running the aggregate")
            if (Meteor.isServer){
                var foo = Subjects.aggregate([{$match: {entry_type: "demographic"}},{$group:{_id:"$metrics.DCM_StudyDate", count:{$sum:1}}}])
                //console.log(foo)
                return foo
            }


      },

    getHistogramData: function(entry_type, metric, bins, filter){

          console.log("getting histogram data")
          if (Meteor.isServer){
          var no_null = filter
          no_null["entry_type"] = entry_type
          var metric_name = "metrics."+metric
          //no_null["metrics"] = {}
          //no_null["metrics"]["$ne"] = null

          if (Object.keys(no_null).indexOf(metric_name) >=0 ){
              no_null[metric_name]["$ne"] = null
          }
          else{
              no_null[metric_name] = {$ne: null}
          }

          //console.log("in the server, the filter is", no_null)

          var minval = Subjects.find(no_null, {sort: [[metric_name, "ascending"]], limit: 1}).fetch()[0]["metrics"][metric]
          var maxval = Subjects.find(no_null, {sort: [[metric_name, "descending"]], limit: 1}).fetch()[0]["metrics"][metric]
                    //var minval = Subjects.findOne({"entry_type": entry_type, no_null}, {sort: minsorter})//.sort(maxsorter).limit(1)


          var bin_size = (maxval -minval)/(bins+1)
          console.log("the bin size is", bin_size)

          if (bin_size){
                var foo = Subjects.aggregate([{$match: no_null},
                    {$project: {lowerBound: {$subtract: ["$metrics."+metric,
                        {$mod: ["$metrics."+metric, bin_size]}]}}},
                    {$group: {_id: "$lowerBound", count: {$sum: 1}}}])
                var output = {}
                output["histogram"] = _.sortBy(foo, "_id")
                if (minval < 0){
                  output["minval"] = minval*1.05
                } else {
                  output["minval"] = minval*0.95
                }

                output["maxval"] = maxval*1.05
                return output
          }
          else{
                var output= {}
                output["histogram"] = []
                output["minval"] = 0
                output["maxval"] = 0
                return output
          }}
          //{entry_type: "freesurfer"}



      },

    get_subject_ids_from_filter: function(filter){
        if (Meteor.isServer){
            var subids = []
            var cursor = Subjects.find(filter,{subject_id:1, _id:0})
            //console.log("the filter in this method is", filter, cursor.count())
            var foo = cursor.forEach(function(val){subids.push(val.subject_id)})
            //console.log("the number subjects to filter by are",filter, subids.length)
            return subids
        }

    },

    updateQC: function(qc, form_data){
        console.log(form_data)
        Subjects.update({entry_type: qc.entry_type, name:qc.name}, {$set: form_data})
    },

    get_metric_names: function(entry_type){

        if (Meteor.isServer){
            var settings = _.find(Meteor.settings.public.modules, function(x){return x.entry_type == entry_type})
            if (settings.metric_names){
              return settings.metric_names
            }
            no_null= {metrics: {$ne: {}}, "entry_type": entry_type}
            var dude = Subjects.findOne(no_null)
            if (dude){
                return Object.keys(dude["metrics"])
            }
            //console.log("dude is", dude)

        }

    },

    save_query: function(name, gSelector){
        var topush = {"name": name, "selector": gSelector}
        Meteor.users.update(this.userId, {$push: {queries: topush}})
    },

    removeQuery: function(query, name){

        console.log("query is", query, name)
        var topull = {"name": name, "selector": query}
        Meteor.users.update(this.userId, {$pull: {queries: topull}})

    },

    get_generator: function(entry_type){
        if (Meteor.isServer){
        var myjson = {};
        myjson = JSON.parse(Assets.getText("generator.json"));
        if (entry_type == null){
            return myjson
        }
        else{
        console.log("entry_Type", entry_type)
        //console.log("myjson", myjson.modules)
        var output =  myjson.modules.find(function(o){return o.entry_type == entry_type})
        console.log("output is", output)
        return output
        }}
    },

    launch_clouder: function(command){
      if (Meteor.isServer){
            var sys = Npm.require('sys')
            var exec = Npm.require('child_process').exec;
            function puts(error, stdout, stderr) {
                 sys.puts(stdout)
                 console.log("done")
             }
            exec(command, puts);
        }
    }

  });
