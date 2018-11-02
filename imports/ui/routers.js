import "./body.html"
import "./qc.html"
import "./subject_reduce.html"
import {Subjects} from "../api/module_tables.js"

contextHotkeys =  new Hotkeys({
    autoLoad : false
});



FlowRouter.route('/', {
  action: function() {
    console.log("rendering /")
    BlazeLayout.render("main_body", {content: "base", "sidebar_content": "body_sidebar"});
    if (contextHotkeys){contextHotkeys.unload()}
    
  }
});

FlowRouter.route('/:entry_type/:name', {
  action: function(params) {
    console.log(params)
    Session.set("currentQC", {"entry_type": params.entry_type, "name": params.name})

    Meteor.subscribe('get_qc_doc', params.entry_type, params.name)
    var output = Subjects.findOne({"entry_type": params.entry_type, "name": params.name})

    BlazeLayout.render("view_images", data=output);

  }
});

FlowRouter.route('/:username', {
  action: function(params) {
    console.log(params)
    BlazeLayout.render("body", {content: "tasks", "sidebar_content": null});
    if (contextHotkeys){contextHotkeys.unload()}
    
  }
});

FlowRouter.route('/reduce/msid/:msid', {
  action: function(params) {
    console.log(params)
    BlazeLayout.render("subject");
    if (contextHotkeys){contextHotkeys.unload()}
    
  }
});