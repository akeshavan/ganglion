import '../imports/startup/accounts-config.js';
import '../imports/ui/body.js';
import "../imports/ui/routers.js"

globalSelector = {}
subjectSelector = {"subject_id": {"$in": []}}

 Meteor.startup(function () {

          Session.set("globalSelector", globalSelector)
          Session.set("subjectSelector", subjectSelector)

      
    });
