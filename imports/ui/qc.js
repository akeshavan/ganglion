import "./qc.html";
import "./colormaps.js"
import {Subjects} from "../api/module_tables.js"
import "../api/publications.js"
import "../api/methods.js"
import "./module_templates.js"
import "./routers.js"
import "./papaya_changes.js"
import "./painter.js"



//var staticURL = "http://127.0.0.1:3002/"
//var staticURL = "https://dl.dropboxusercontent.com/u/9020198/data/"
use_peerJS = true




addNewDrawing= function(template){

     //console.log("in add new drawing")
     var contours = template.contours.get()
     var entry = {contours: [],
                    checkedBy: Meteor.user().username, name:"Drawing "+contours.length, uuid: guid()}
     contours.push(entry)
     template.contours.set(contours)
     send_to_peers({"action": "insert", "data":{"contours": entry}})
     Session.set('selectedDrawing', contours.length-1)
     return contours.length-1
}

getSelectedDrawingEntry = function(template){

    var contours = template.contours.get()
    var idx = Session.get("selectedDrawing")
    //console.log("in getSelectedDrawing idx is", idx)
    if (idx==null || idx >= contours.length || idx < 0){
        idx = addNewDrawing(template)
        contours = template.contours.get()
    }
    return contours[idx]
}

getSelectedDrawing = function(template){

    var entry = getSelectedDrawingEntry(template)
    return entry.contours
}



function arraysEqual(a, b) {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (a.length != b.length) return false;

  // If you don't care about the order of the elements inside
  // the array, you should sort both arrays here.

  for (var i = 0; i < a.length; ++i) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

var addPapaya = function(data, entry_type, template_instance, callback){
    //if (papayaContainers.length == 0){
    Meteor.call("get_generator", entry_type, function(err, res){
        var params = {}
        params["images"] = []
        var loadableImages = []
        Session.set("loadableImages", loadableImages)
        for (i=0;i<data.check_masks.length;i++){ //never load more than 2 images
            var url = res["staticURL"]+data["check_masks"][i]+"?dl=0"
            console.log("url is", url)
            if (i>=2){
                loadableImages.push(url)

            }
            else{
                params["images"].push(url)
            }

        }
        Session.set("loadableImages", loadableImages)
        if (papayaContainers.length != 0){
            var prev_volumes = papayaContainers[0].params.images
            var isSame = arraysEqual(prev_volumes, params["images"])
            if (isSame){
                return
            }
            console.log("papayacontainers is", papayaContainers.pop())
        }

        

            var cmap = res.colormaps
            if (cmap){
                var idxs = Object.keys(cmap)
                for (i=0;i<idxs.length;i++){
                    var idx = idxs[i]
                    console.log("index is", idx)
                    var opts = cmap[idx]
                    console.log("options are", opts)
                    var name = params.images[idx]
                    console.log("name is", name)
                    var split_name = name.split("/")
                    split_name = split_name[split_name.length-1]
                    console.log("split_name is", split_name)
                    if (opts.name == "custom.Freesurfer"){
                        params[split_name] = {lut: new myCustomColorTable(),
                                                      min:0, max:2035,
                                                      gradation:false,
                                                      alpha:opts.alpha}//colormap
                    }
                    else{
                        params[split_name] = {lut: opts.name, alpha: opts.alpha, min: opts.min, max:opts.max}
                    }
    
    
                }
            }
            console.log("params is", params)
            params["showControlBar"] = true
            papaya.Container.addViewer("viewer", params, function(err, params){
                                            //.modal("show");
                                            console.log("in papaya callback?", err, params)
                                            //callback()
                                            })
            papaya.Container.allowPropagation = true;
            papayaContainers[0].viewer.mindcontrol_template = template_instance//Template.instance()

        })



        //} //endif
    }

var template_decorator = function(template_instance_value, lp, idx, key){
    var update_point_note = function(res, val){
            lp[idx][key] = val
            //console.log("logged points are", lp)
            //console.log("template instance", template_instance)
            template_instance_value.set(lp)
        }
    return update_point_note
}

var val_mapper = {"-1": "Not Checked", "0": "Fail", "1": "Pass", "2": "Needs Edits", "3": "Edited"}

var class_mapper = {"-1": "warning", "0": "danger",
                    "1": "success", "2": "primary", "3": "info"}



var load_hotkeys = function(template_instance){
    contextHotkeys.add({
                    combo : "d d",
                    callback : function(){
                        
                        var currMode = template_instance.logMode.get()
                        if (currMode == "contour"){
                            var contours = template_instance.contours.get()
                            var idx = Session.get("selectedDrawing")
                            if (idx != null){
                              contours[idx].contours.pop()
                              if (contours[idx].contours.length==0){
                                contours.splice(idx, 1)
                              }
                            }
                            template_instance.contours.set(contours)
                            papayaContainers[0].viewer.drawViewer(true)
                        }
                        
                        else if (currMode == "point"){
                            
                        }
                        
                        else if (currMode == "paint"){
                            //TODO: undo painting when you have time.
                            var painters = template_instance.painters.get()
                            var currPaint = painters.pop()
                            restore_vals(currPaint)
                            template_instance.painters.set(painters)
                            
                        }
                        
                    }
                })

    contextHotkeys.add({
                    combo : "ctrl+s",
                    callback : function(){
                        console.log("you want to save")
                    }
                })

    contextHotkeys.add({
                    combo : "t t",
                    callback : function(){
                        console.log("you want to toggle modes")
                        var currMode = template_instance.logMode.get()
                        if (currMode == "point"){
                            currMode = "contour"
                        }
                        else if  (currMode == "contour"){
                            currMode ="paint"
                        }
                        else if (currMode == "paint"){
                            currMode = "point"   
                        }
                        template_instance.logMode.set(currMode)
                    }
                })
    
    contextHotkeys.add({
                    combo : "z z",
                    callback : function(){
                        console.log("you want to hide the last overlay")
                        idx = papayaContainers[0].viewer.screenVolumes.length - 1
                        var isHidden = papayaContainers[0].viewer.screenVolumes[idx].hidden
                        
                        if (!isHidden){papaya.Container.hideImage(0, idx)}
                        else{papaya.Container.showImage(0, idx)}
                        //papaya.Container.showImage(0, imageIndex)
                    }
                })            
                
    contextHotkeys.load()
}

/*Template-related things: OnCreated, helpers, events, and rendered*/

var get_qc_name = function(){
    var qc = Session.get("currentQC")
    var name = qc.entry_type + "_" + qc.name
    return name
}


var sync_templates_decorator = function(template_instance){ return function(data){
    var data = JSON.parse(data)
    //console.log("you want to sync a template w/ data", data)
    //console.log("template_instance is", template_instance)
    
    if (data["action"] == "insert"){
        for (var key in data["data"]){
            var current = template_instance[key].get()
            //console.log("template instance, and key are", template_instance, key)
            //console.log(data["data"][key], "current is", current)
            if (current == null){
                current = [data["data"][key]]
            }
            else{
                current = current.concat(data["data"][key])
            }
            //console.log("current is", current)
            template_instance[key].set(current)
            
        }
        
    }
    
    
    if (data["action"] == "update"){
        for (var key in data["data"]){
            //console.log("you want to update entry in", key, "with uuid", data["data"][key]["uuid"])
            var current = template_instance[key].get()
            //console.log("current is", current)
            var entry = _.find(current, function(e){return e.uuid == data["data"][key]["uuid"]})
            //console.log("found the entry to update", entry)
            var idx = current.indexOf(entry)
            //console.log("idx is", idx)
            current[idx] = data["data"][key]
            template_instance[key].set(current)
        }
    }
    papayaContainers[0].viewer.drawViewer(true)
    

    
}}




Template.view_images.onCreated(function(){
    this.loggedPoints = new ReactiveVar([])
    this.contours = new ReactiveVar([])
    this.logMode = new ReactiveVar("point")
    this.touchscreen = new ReactiveVar(false)
    this.loadableImages = new ReactiveVar([])
    this.painters = new ReactiveVar([])
    this.connections = {}
    Meteor.subscribe("presences")
    
    if (use_peerJS){
        window.peer = new Peer({
          key: 'fqw6u5vy67n1att9',  // get a free key at http://peerjs.com/peerserver
          debug: 3,
          config: {'iceServers': [
            { url: 'stun:stun.l.google.com:19302' },
            { url: 'stun:stun1.l.google.com:19302' },
          ]}    
        });
        
        peer.on('open', function () {
          console.log("peer ID is", peer.id);
          
          var current_profile = Meteor.users.findOne({_id: Meteor.userId()}).profile
          if (!current_profile){
              current_profile = {}
          }
          var name = get_qc_name()
          current_profile[name] = peer.id
          Meteor.users.update({_id: Meteor.userId()}, {
            $set: {
              profile: current_profile
            }})
            console.log("profile si", Meteor.users.findOne({_id: Meteor.userId()}).profile)
        });
        
        //TODO: sometimes this is null??? Then where do we set the listener?
        var my_template = this
        
        peer.on("connection", function(conn){
            console.log("conn is", conn)
            conn.on("data", sync_templates_decorator(my_template))
            
        });
    }

    
    
    
})



Template.view_images.helpers({

    user: function(){
        Meteor.subscribe('userList')
        return Meteor.users.find({}).fetch()
    },
    
    peerUsers: function(){
      
      if (use_peerJS){  
          var userIds = Presences.find().map(function(presence) {return presence.userId;});
          // exclude the currentUser
          var name = get_qc_name()
    
          var template_instance = Template.instance()
          var to_return =  Meteor.users.find({_id: {$in: userIds, $ne: Meteor.userId()}});
          
          if (to_return.count){
            var conns = get_open_connections(this)
            if (!conns.length){
                
                
                var dude = Meteor.users.findOne({_id: {$in: userIds, $ne: Meteor.userId()}})
                if (dude){
                console.log("there are no connections but there is another person out there, so i'm connecting now", dude.username)
                var conn = peer.connect(dude.profile[name])
                conn.on("data", sync_templates_decorator(template_instance))
                }
                
            }
            
            console.log("a peerjs connection exists, now we add a listener")
            for(var i = 0; i<conns.length; i++){
                conns[i].on("data", sync_templates_decorator(template_instance))
            }
            
          }
    
          if (to_return == null){
              return []
          }
          return to_return
      }
      else{return 0}
      
    },

    loggedPoints: function(){
        return Template.instance().loggedPoints.get()
    },

    loggedContours: function(){
        var contours = Template.instance().contours.get()
        if (contours != null){
            contours.forEach(function(val, idx, arr){val.contours.forEach(function(val, idx, arr){val.name = "Curve "+idx})})
        }
        return contours
    },

    onPointNote: function(){
        //console.log("poitn note is", this)
        var lp = Template.instance().loggedPoints.get()
        var idx = lp.indexOf(this)
        return  template_decorator(Template.instance().loggedPoints, lp, idx, "note")
    },

    onContourNote: function(){
        //console.log("poitn note is", this)
        //var lp = Template.instance().contours.get()

        var contours = Template.instance().contours.get()
        if (contours){
        var idx = Session.get("selectedDrawing")
        if (contours[idx]){
        var selected = contours[idx].contours
        var idx = selected.indexOf(this)
        //console.log("contour note", selected, idx)
        var tempate_decorator2 = function(template_instance, selected, idx, contours){
        return update_point_note = function(res, val){
            selected[idx]["note"] = val
            console.log("contours is", contours)
            template_instance.set(contours)
        }}

        return tempate_decorator2(Template.instance().contours, selected, idx, Template.instance().contours.get())}}

        //return  template_decorator(Template.instance().contours, lp, idx)
    },

    paintValue: function(){
        var val = Session.get("paintValue")
        if (val == null){
            Session.set("paintValue", 0)
        }
        return val
    },

    onDrawingNote: function(){
        //console.log("poitn note is", this)
        var lp = Template.instance().contours.get()
        var idx = lp.indexOf(this)
        return  template_decorator(Template.instance().contours, lp, idx, "name")
    },

    currentMode: function(){
        return Template.instance().logMode.get()
    },

    currentQC: function(){
        return Session.get("currentQC")
    },

    doc: function(){
        var qc = Session.get("currentQC")
        var output = Subjects.findOne({entry_type: qc.entry_type, name: qc.name})
        if (output){
            if (output.quality_check){
            output.quality_check.QC_name = val_mapper[output.quality_check.QC]
            output.quality_check.QC_color = class_mapper[output.quality_check.QC]
            }}

        //console.log("output is", output)
        return output
    },
    modeCSS: function(){
        var logMode = Template.instance().logMode.get()
        //console.log("css, log mode is", logMode)
        var output = {}
        if (logMode == "point"){
            //output["isPoint"] = "in"
            output["pointColor"] = "warning"
            //output["isContour"] = ""
            output["contourColor"] = "default"
            output["paintColor"] = "default"
        }
        else if (logMode == "contour"){
            //output["isContour"] = "in"
            //output["isPoint"] = ""
            output["contourColor"] = "warning"
            output["pointColor"] = "default"
            output["paintColor"] = "default"
        }
        else if (logMode == "paint"){
            output["contourColor"] = "default"
            output["pointColor"] = "default"
            output["paintColor"] = "warning"
        }
        return output
    },

    selectedDrawing: function(value){
        var Idx = Session.get("selectedDrawing")
        return value == Idx

    },

    selectedDrawingName: function(){
        if (Template.instance().logMode.get() == "contour"){
            var idx = Session.get("selectedDrawing")
            var contours = Template.instance().contours.get()
            //console.log("idx is", idx, "contours is", contours)
            if (idx == null){
                addNewDrawing(Template.instance())
                Session.set("selectedDrawing", contours.length)
                //var contours = Template.instance().contours.get()
                //return contours[contours.length-1].name
            }
            //Session.set("selectedDrawing", contours.length-1)
            var output = contours[contours.length-1]
            if (output != null){
              return contours[contours.length-1].name
            }


        }
    },

    isTouch: function(){
      return Template.instance().touchscreen.get()
    },

    visibilityStatus: function(idx){
      var contours = Template.instance().contours.get()
      var select = contours[idx]
      if (select.visible == true || select.visible==null){
        return true
      }
      else{
        return false
      }
    },

    loadableImages: function(){
        var images = Session.get("loadableImages")
        var to_display = []
        var output = []
        if (images){
            images.forEach(function(val, idx, arr){
                var last = val.split("/").pop()
                var tmp = {}
                tmp["absolute_path"] = images[idx]
                tmp["name"] = last
                to_display.push(tmp)
            })
            return to_display
        }
    },
    
    loadPainter: function(){
        return Session.get("reloadPainter")   
    }
})

Template.view_images.events({

 "submit .new-qc": function(event, template){

        event.preventDefault();
        if (! Meteor.userId()) {
          throw new Meteor.Error("not-authorized");
        }


        form_values = $("#QC_form").serializeArray()
        //console.log("form values are", form_values)
        form_data = {}
        for (i=0;i<form_values.length;i++){
            var field_name = form_values[i]["name"]
            if (field_name == "user_assign"){
                if (Object.keys(form_data).indexOf(field_name) < 0){
                    form_data[field_name] = []
                }
                form_data[field_name].push(form_values[i]["value"])
            }
            else{
                form_data[field_name] = form_values[i]["value"]
                }
        }
        //lp = Session.get("loggedPoints")
        //console.log("this data", this.data)

        var qc = Session.get("currentQC")
        var update = {}
        update["quality_check"] = form_data
        update["checkedBy"] = Meteor.user().username
        update["checkedAt"] = new Date()
        update["loggedPoints"] = template.loggedPoints.get()
        update["contours"] = template.contours.get()
        update["painters"] = template.painters.get()
        console.log("update to", update)
        //console.log("update is", update)

        Meteor.call("updateQC", qc, update, function(error, result){
            $("#closemodal").click()
        })

        //console.log("called updateQC method!")
    },
 "click #viewer": function(event, template){
     logpoint(event, template, "click")
 },
 "click .swapmode": function(event, template){
     var element = event.toElement.className.split(" ")//.slice(1).split("-")
    var idx = element.indexOf("swapmode") + 1
    //console.log("element is", element, "idx of filter is", idx)
    element = element[idx]//.join(" ").split("+")
    //console.log("element is", element)
    console.log("element is", element)

     var currMode = template.logMode.get()

     template.logMode.set(element)

 },
 "click #touchscreen": function(event, template){

     var currMode = template.touchscreen.get()

     template.touchscreen.set(!currMode)

 },
 "mousemove #papayaContainer0": function(event, template){

     logpoint(event, template, "mousemove")
     //fill_all(template)

     //console.log("mousemove")

 },
 "mousedown #papayaContainer0": function(event, template){
     //console.log("mousedown")
     $("#papayaContainer0").off("mousedown")
     //console.log(event)
     logpoint(event, template, "mousedown")
     //fill_all(template)
     //console.log("mousemove")

 },
 "mouseup #papayaContainer0": function(event, template){
     logpoint(event, template, "mouseup")
     //fill_all(template)
     //console.log("mousemove")

 },
 "mouseout #papayaContainer0": function(event, template){
     logpoint(event, template, "mouseout")
     //fill_all(template)
 },
 "click .goto_coor": function(event, template){
     //console.log("clicked a coordinate", this, this.matrix_coor)
     papayaContainers[0].viewer.gotoCoordinate(this.matrix_coor)
     var screenCoor = papayaContainers[0].viewer.convertCoordinateToScreen(this.matrix_coor);
     var viewer = papayaContainers[0].viewer
     draw_point(screenCoor, viewer, pointColor, 5)
     //fill_all(template)
 },
 "click .goto_cont": function(event, template){
     //console.log("clicked a coordinate", this, this.matrix_coor)
     papayaContainers[0].viewer.gotoCoordinate(this.matrix_coor[0])
     //console.log("size of contour", this.matrix_coor.length, this.matrix_coor)
     /*this.matrix_coor.forEach(function(val, idx, arr){
         var screenCoor = papayaContainers[0].viewer.convertCoordinateToScreen(val);
         var viewer = papayaContainers[0].viewer
         draw_point(screenCoor, viewer, "rgb(0,0,255)", 3)
     })*/
     fill_all_points(this.matrix_coor)
     fill_all(template)

 },
 "click .remove-point": function(event, template){
     var points = template.loggedPoints.get()
     //console.log(this, template)
     var idx = points.indexOf(this)
     points.splice(idx, 1)
     template.loggedPoints.set(points)
     papayaContainers[0].viewer.drawViewer(true)
     send_to_peers({"action": "remove", "data":{"loggedPoints": this}})
     
     //fill_all(template)
 },
 "click .remove-contour": function(event, template){
     var points = template.contours.get()
     var selected = points[Session.get("selectedDrawing")].contours//TODO: not always 0 fool
     //console.log(Template.instance().contours.get())
     console.log(this, "points is", selected.length)
     var idx = selected.indexOf(this)
     selected.splice(idx, 1)
     console.log(idx, "points is", points)

     if (selected.length ==0){
          points.splice(Session.get("selectedDrawing"),1)
          Session.set("selectedDrawing", points.length-1)
     }
     template.contours.set(points)
     papayaContainers[0].viewer.drawViewer(true) //fill_all(template)
 },
 "click #menu-toggle": function(e, template){
        e.preventDefault();
        $("#wrapper").toggleClass("toggled")/*.promise().done(function(){
            console.log("done toggling", papayaContainers[0].getViewerDimensions(), $("#viewer").height(), $("#viewer").width())
            var viewer = papayaContainers[0].viewer
            viewer.resizeViewer([$("#viewer").width(), $("#viewer").height()])
            });*/

 },
 "click #resize": function(e, template){
     console.log("in resize")
     var viewer = papayaContainers[0].viewer
     viewer.resizeViewer(papayaContainers[0].getViewerDimensions())
     papayaContainers[0].resizeViewerComponents(true);

 },
 "click #addNewDrawing": function(e, template){
     /*var contours = template.contours.get()
     contours.push({contours: [{complete: false, matrix_coor:[], world_coor:[]}],
                                checkedBy: Meteor.user().username, name:"Drawing "+contours.length})
     template.contours.set(contours)
     Session.set('selectedDrawing', contours.length-1)  */
     addNewDrawing(template)
 },
 "click #drawingDropdown": function(e, template){
     idx = template.contours.get().indexOf(this)
     //console.log("seelcted,", idx)
     Session.set("selectedDrawing", idx)
     //console.log("Session's selected Drawing", Session.get("selectedDrawing"))
 },
 "click #select_button_group": function(e, template){
     idx = template.contours.get().indexOf(this)
     //console.log("seelcted,", idx)
     Session.set("selectedDrawing", idx)
     //console.log("Session's selected Drawing in click", Session.get("selectedDrawing"))
 },
 "click #delete_button_group": function(e, template){
     var contours = template.contours.get()
     var idx = contours.indexOf(this)
     contours.splice(idx, 1)
     template.contours.set(contours)
     Session.set("selectedDrawing", contours.length-1)
     papayaContainers[0].viewer.drawViewer(true)

 },

 "click .toggle-visibility": function(e, template){
   var contours = template.contours.get()
   var idx = contours.indexOf(this)
   if (contours[idx].visible == true ||contours[idx].visible == null){
     contours[idx].visible = false
   }
   else{
     contours[idx].visible = true
   }

   template.contours.set(contours)
   papayaContainers[0].viewer.drawViewer(true)
 },

 "click .load": function(e, template){
    console.log("you want to load", this)
    papaya.Container.addImage(0, this.absolute_path)
 },
 
 'input #paintValue': function (event, template) {
    Session.set("paintValue", event.currentTarget.value);
  },
  
  "click #paintEraser": function(event, template){
      Session.set("paintValue", 0)
  },
  
  "click #paintPicker": function(event, template){
    var viewer = papayaContainers[0].viewer
    var N = viewer.screenVolumes.length
    var vol = viewer.screenVolumes[N-1].volume
    var ori = vol.header.orientation
    var c = viewer.currentCoord
    var offset = ori.convertIndexToOffset(papayaRoundFast(c.x),papayaRoundFast(c.y),papayaRoundFast(c.z))
    Session.set("paintValue", vol.imageData.data[offset])
  },
  
  "click #loadPainter": function(event, template){
      
      var qc = Session.get("currentQC")
      var output = Subjects.findOne({entry_type: qc.entry_type, name: qc.name},{check_masks:1, _id:0, name:1, loggedPoints: 1, contours: 1})
      if (output){
        if (output.painters != null){
            template.painters.set(output.painters)
            if (output.painters.length){
                var after_load = papayaload_callback(output)
                after_load()
                Session.set("reloadPainter", false)
            }            
        }
      };
    
  }
  

})

var papayaload_callback = function(output){
return function(){
                        console.log("output is", output)
                        output.painters.forEach(function(val, idx, arr){
                        var paintVal = val.paintValue
                        val.matrix_coor.forEach(function(val2, idx2, arr2){
                            setValue(papayaRoundFast(val2.x), papayaRoundFast(val2.y), papayaRoundFast(val2.z), paintVal)
                        })
                    papayaContainers[0].viewer.drawViewer(true, false)
                    return output.painters.length
                    })
    }
}

Template.view_images.rendered = function(){

    if(!this._rendered) {
      this._rendered = true;
      //console.log('Template onLoad');
    }


    this.autorun(function(){
        var qc = Session.get("currentQC")
        Session.set("reloadPainter", false)

        //console.log("loggedPoints?", Template.instance().loggedPoints.get())
        //console.log("in autorun, qc is", qc)
        if (qc){
        if (Object.keys(qc).indexOf("entry_type")>=0){
            var output = Subjects.findOne({entry_type: qc.entry_type, name: qc.name},{check_masks:1, _id:0, name:1, loggedPoints: 1, contours: 1})

            if (output){
                Template.instance().loggedPoints.set(output.loggedPoints)
                if (output.contours != null){
                    Template.instance().contours.set(output.contours)
                }
                else{
                    Template.instance().contours.set([])
                }
                if (output.painters != null){
                    if (output.painters.length){
                        Session.set("reloadPainter", true)
                    }
                }
                
                
                
                addPapaya(output, qc.entry_type, Template.instance())
                load_hotkeys(Template.instance())
                
                //get_config()
            }


        }}

    });//end of autorun



}
