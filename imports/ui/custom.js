import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { ReactiveDict } from 'meteor/reactive-dict';
import "./custom.html";
import { Subjects } from '../api/module_tables';

Meteor.subscribe('userList')

Template.custom.helpers({
  "getconsent": function(){
    //console.log("consent is", Session.get("consent"))
    return Session.get("consent")
  },
});

Session.set("leaderboardPage", 0);

Template.leaderboard.helpers({

  "users": function(){
    var output = []
    var data = Meteor.users.find({}) //.skip(Session.get("leaderboardPage"));
    if (data){
      data.forEach(function(val){
        var entry = {username: val.username.split("@")[0]}
        Meteor.subscribe('userCount', val.username);
        var num = Subjects.find({"quality_vote.checkedBy":val.username}).count();
        entry["images"] = num;
        //console.log(entry);
        if (num) {
          output.push(entry);
        }

      })
      var output = _.sortBy(output, "images").reverse()
      output.forEach(function(val, idx, arr){
        arr[idx]["idx"] = idx+1;
      })
      //console.log("output is", output);
      return output
    }
    return []
  },
})

Template.consent.helpers({
  "getconsent": function(){
    // console.log("consent is", Session.get("consent"))
    return Session.get("consent")
  },
  "isLoggedIn": function(){
    return !Meteor.user();
  }
})

Template.consent.events({
  "click #consent": function(e){
    // window.scrollTo(0,0)
    console.log("user has consented");
    console.log($(".bs-example-modal-lg").modal) //('hide');
    Session.set("consent", true);
  }
})

Template.consent.rendered = function(){
  window.onscroll = function() {myFunction()};
  var navbar = document.getElementById("sticky");
  if (navbar){
    var sticky = navbar.offsetTop;
  } else {
    var sticky = null;
  }
  // Add the sticky class to the navbar when you reach its scroll position. Remove "sticky" when you leave the scroll position
  function myFunction() {
    // Get the navbar


    if (navbar && sticky){
      // Get the offset position of the navbar

      if (window.pageYOffset >= sticky && window.innerWidth > 767) {
        navbar.classList.add("sticky")
      } else {
        navbar.classList.remove("sticky");
      }
    }

  }
}
