import {Subjects} from "./module_tables.js"



var count = null;

if (Meteor.isServer) {
  // This code only runs on the server
  // Only publish tasks that are public or belong to the current user

  Meteor.publish('get_qc_doc', function tasksPublication(entry_type, name) {
      console.log("publishing", entry_type, name)
    return Subjects.find({"entry_type": entry_type, "name": name});
  });

  Meteor.publish('get_next_id', function nextName(filter, name) {
      //console.log("publishing next id from", entry_type, name)

      filter["name"] = {$nin: [name]}
      filter["quality_vote.checkedBy"] = {$ne:name}

      //var cursor_fetch = Subjects.find(filter, {fields: {name: 1, _id: 0}})
      console.log("getting next ids");
      return Subjects.find(filter, {fields: {name:1, subject_id: 1,
        entry_type: 1, num_votes: 1, checkedBy: 1, 'quality_vote.checkedBy':1}});

  });

  Meteor.publish('userList', function (){
    return Meteor.users.find({});
  });

  Meteor.publish('userCount', function(username){
    return Subjects.find({"quality_vote.checkedBy":username}, {fields:{quality_vote: 1}});
  })

}
