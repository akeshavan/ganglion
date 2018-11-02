    Meteor.publish("users", function(){ //meteor users collection
        return Meteor.users.find({})
    })

  Meteor.publish('presences', function() {
    return Presences.find({}, { userId: true });
  });
  
  /*Meteor.publish("users", function () {
    return Meteor.users.find({}, {fields: {"profile.peerId": true} });
  });*/

