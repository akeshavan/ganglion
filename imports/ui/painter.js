import "./qc.js"
curveColor =  "rgb(255,235,59)"
pointColor = "rgb(255,0,0)"

guid = function(){
  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .substring(1);
  }
  return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
    s4() + '-' + s4() + s4() + s4();
}

send_to_peers = function(data){
    //console.log("you want to send", data, "to peers")
    var qc = Session.get("currentQC")
    var settings = _.find(Meteor.settings.public.modules, function(x){return x.entry_type == qc.entry_type})
  if (settings.usePeerJS){
    var conns = get_open_connections()
    //console.log("cons are", conns)
    data["user"] = Meteor.users.findOne({_id: Meteor.userId()}).username
    /*conns.forEach(function(val, idx, arr){
      val.send(data)
    })*/
    for(var i =0; i<conns.length;i++){
        var conn = conns[i]
        //console.log("con is", conn)
        conn.send(JSON.stringify(data))
        //console.log("sent?")
    }
  }
}

get_open_connections = function(template_instance){
    var conns = []
    for (var key in peer.connections){
        if (peer.connections[key][0].open){
            conns.push(peer.connections[key][0])
            if (template_instance){
                peer.connections[key][0].on("data", sync_templates_decorator(template_instance))
            }
            }
        }
    return conns
}

var snapToGrid = function(coords){
  out_coords = []
  //console.log("non-snapped", coords)
  coords.forEach(function(val, idx, arr){
    if (idx==0){
        //console.log(val)
        }
    var new_val = new papaya.core.Coordinate(papayaFloorFast(val.x), papayaFloorFast(val.y), papayaFloorFast(val.z))

    out_coords.push(new_val)

  })
  //console.log("out coords is", out_coords)
  return out_coords
}

connect_points = function(matrix_coor){
    if (matrix_coor){

         var viewer = papayaContainers[0].viewer
         var canvas = viewer.canvas
         var context = canvas.getContext('2d');
         context.strokeStyle = curveColor //"#df4b26";
         context.lineJoin = "round";
         context.lineWidth = 3;
         context.beginPath();
         var prev = {}
         matrix_coor.forEach(function(val, idx, arr){
             var screenCoor = papayaContainers[0].viewer.convertCoordinateToScreen(val);
             if (viewer.intersectsMainSlice(val)){
                 draw_point(screenCoor, viewer, curveColor, 3)
                 if (idx && prev !=null){
                     context.moveTo(prev.x, prev.y)
                     context.lineTo(screenCoor.x, screenCoor.y);
                     context.closePath();
                     context.stroke();
                 }
                 prev = screenCoor
         }
         else{
           prev = null
         }

     })
    }


}

fill_all_loggedPoints = function(lp){

    if (lp){
        lp.forEach(function(val, idx, arr){
         var screenCoor = papayaContainers[0].viewer.convertCoordinateToScreen(val.matrix_coor);
         var viewer = papayaContainers[0].viewer
         if (viewer.intersectsMainSlice(val.matrix_coor)){
             draw_point(screenCoor, viewer, pointColor, 5)
         }

     })
    }

}

fill_all = function(template){
    var contours = template.contours.get()
    var lp = template.loggedPoints.get()

    contours.forEach(function(val, idx, arr){
        //console.log("in fillall", val)
        if (val.visible==true || val.visible==null){
          val.contours.forEach(function(val, idx, arr){
              connect_points(val.matrix_coor)
              })
        }
        })
    fill_all_loggedPoints(lp)
}

setValue = function(x,y,z, val){
    var viewer = papayaContainers[0].viewer
    var N = viewer.screenVolumes.length
    var vol = viewer.screenVolumes[N-1].volume
    var ori = vol.header.orientation
    var offset = ori.convertIndexToOffset(x,y,z)
    var old_val = vol.imageData.data[offset]
    if (old_val != val){
        vol.imageData.data[offset] = val
        return old_val
    }
    else{
        return null
    }
}

setContoursToZero = function(contours){
    //var contours = template.contours.get()

    contours.forEach(function(val, idx, arr){
        //console.log("in fillall", val)
        //console.log(val)
        if (val.visible==true || val.visible==null){
          val.contours.forEach(function(val, idx, arr){
              val.matrix_coor.forEach(function(val, idx, arr){
                  var x = val.x
                  var y = val.y
                  var z = val.z
                  setValue(x,y,z,0)

              })


              })
        }
    })

}

var annotate_point = function(template, originalCoord, screenCoor){
            var viewer = papayaContainers[0].viewer
            var points = template.loggedPoints.get()
            if (points == null){
                points = []
            }

            var world = new papaya.core.Coordinate();
            papayaContainers[0].viewer.getWorldCoordinateAtIndex(originalCoord.x, originalCoord.y, originalCoord.z, world);
            var entry = {matrix_coor: originalCoord, world_coor: world, checkedBy: Meteor.user().username, uuid: guid()}
            points.push(entry)
            template.loggedPoints.set(points)
            //var color = "rgb(255, 0, 0)"
            //var viewer = papayaContainers[0].viewer

            draw_point(screenCoor, viewer, pointColor, 5)
            //var points = get_stuff_of_user(template, "loggedPoints")
            send_to_peers({"action": "insert", "data":{"loggedPoints": entry}})
}

var start_curve = function(template, originalCoord, screenCoor){

    var contours = template.contours.get()
            //console.log("on mousedown, contours is", contours)
    if (!contours.length){
        var entry = {contours: [{complete: false, matrix_coor:[], world_coor:[]}],
                        checkedBy: Meteor.user().username, name:"Drawing 0", uuid: guid()}
        contours.push(entry)

        send_to_peers({"action": "insert", "data":{"contours": entry}})
        Session.set('selectedDrawing', 0)
        //console.log("pushed contours", contours)
    }

    var world = new papaya.core.Coordinate();
    papayaContainers[0].viewer.getWorldCoordinateAtIndex(originalCoord.x, originalCoord.y, originalCoord.z, world);
    var selectContour = getSelectedDrawing(template)//contours[contours.length-1].contours //OR: selected contour
    //console.log("selectContours is", selectContour)
    if (selectContour.length == 0){
      selectContour.push({complete: false, matrix_coor:[], world_coor:[]})
    }

    var currentContour = selectContour[selectContour.length-1]
    //console.log("currentContours is", currentContour)

    if (currentContour.complete==true){
        selectContour.push({complete: false, matrix_coor:[], world_coor:[]})
        currentContour = selectContour[selectContour.length-1]
        currentContour.matrix_coor.push(originalCoord)
        currentContour.world_coor.push(world)
    }
    template.contours.set(contours)

    send_to_peers({"action": "update", "data":{"contours": getSelectedDrawingEntry(template)}})
    Session.set("isDrawing", true)


            //console.log("contour begin")


}

var continue_curve = function(template, originalCoord, screenCoor){
                //papayaContainers[0].viewer.cursorPosition isn't updated on mousedrag
            var originalCoord = papayaContainers[0].viewer.convertScreenToImageCoordinate(screenCoor.x, screenCoor.y, viewer.mainImage);
            var world = new papaya.core.Coordinate();
            papayaContainers[0].viewer.getWorldCoordinateAtIndex(originalCoord.x, originalCoord.y, originalCoord.z, world);
            var contours = template.contours.get()

            if (contours.length){
            var selectContour = getSelectedDrawing(template) //contours[contours.length-1].contours
            //console.log("on mousemove", selectContour)
            var currentContour = selectContour[selectContour.length-1]

            if (currentContour){
                if (currentContour.complete==false){

                    currentContour.matrix_coor.push(originalCoord)
                    currentContour.world_coor.push(world)
                    template.contours.set(contours)
                    //send_to_peers({"action": "update", "data":{"contours": getSelectedDrawingEntry(template)}})
                    Session.set("isDrawing", true)

                    }
                }
                }
}

var end_curve = function(template, originalCoord, screenCoor){
            var contours = template.contours.get()
             //console.log("on mouseup, contours is", contours)
             var selectContour = getSelectedDrawing(template) //contours[contours.length-1].contours
             //console.log("on mouseup, selectcontours is", selectContour)

             var currentContour = selectContour[selectContour.length-1]

             //var currentContour = contours[contours.length-1]
             currentContour.complete = true
             //console.log("mouseup", currentContour)
             currentContour.matrix_coor = snapToGrid(currentContour.matrix_coor)
             template.contours.set(contours)
             send_to_peers({"action": "update", "data":{"contours": getSelectedDrawingEntry(template)}})
             //papayaContainers[0].viewer.drawViewer(true)
             Session.set("isDrawing", false)
}

var start_paint = function(template, originalCoord, screenCoor){
    var painters = template.painters.get()
    //var world = new papaya.core.Coordinate();
    //papayaContainers[0].viewer.getWorldCoordinateAtIndex(originalCoord.x, originalCoord.y, originalCoord.z, world);
    var entry = {matrix_coor: [originalCoord], world_coor: [], checkedBy: Meteor.user().username, uuid: guid(), start_point: screenCoor}
    painters.push(entry)
    template.painters.set(painters)
    Session.set("isDrawing", true)
    var viewer = papayaContainers[0].viewer
    draw_point(screenCoor, viewer, curveColor, 3)
    var canvas = viewer.canvas
    var context = canvas.getContext('2d');
    context.strokeStyle = curveColor //"#df4b26";
    context.lineJoin = "round";
    context.lineWidth = 3;
    //context.beginPath();
    //context.moveTo(screenCoor.x, screenCoor.y)

}

var continue_paint = function(template, originalCoord, screenCoor){
    var painters = template.painters.get()
    var N = painters.length
    var currentPaint = painters[N-1]
    //console.log("is there a start point?", currentPaint.start_point)
    var prevStart = currentPaint.start_point
    var viewer = papayaContainers[0].viewer
    var originalCoord = papayaContainers[0].viewer.convertScreenToImageCoordinate(screenCoor.x, screenCoor.y, viewer.mainImage);
    //var world = new papaya.core.Coordinate();
    //papayaContainers[0].viewer.getWorldCoordinateAtIndex(originalCoord.x, originalCoord.y, originalCoord.z, world);

    currentPaint.matrix_coor.push(originalCoord)
    //currentPaint.world_coor.push(world)
    currentPaint.start_point = screenCoor
    template.painters.set(painters)

    draw_point(screenCoor, viewer, curveColor, 3)
    var canvas = viewer.canvas
    var context = canvas.getContext('2d');
    context.beginPath();

    context.moveTo(prevStart.x, prevStart.y)
    context.lineTo(screenCoor.x, screenCoor.y);
    //context.moveTo(screenCoor.x, screenCoor.y);
    context.stroke();
    context.closePath();

}

var line = function(x0, y0, z0, x1, y1, z1, val){
   var dx = Math.abs(x1-x0);
   var dy = Math.abs(y1-y0);
   var sx = (x0 < x1) ? 1 : -1;
   var sy = (y0 < y1) ? 1 : -1;
   var err = dx-dy;
   var new_arr = []
   while(true){
     old_value = setValue(x0,y0, z0, val);  // Do what you need to for this
     if (old_value != null){
         new_arr.push({x: x0, y:y0, z: z0, old_val: old_value})
     }
     if ((x0==x1) && (y0==y1)) break;
     var e2 = 2*err;
     if (e2 >-dy){ err -= dy; x0  += sx; }
     if (e2 < dx){ err += dx; y0  += sy; }
   }
   //console.log("new arr is", new_arr)
   return new_arr
}

var fill_lines = function(currPaint, currVal){
    var new_coor = []
    currPaint.matrix_coor.forEach(function(val, idx, arr){
        if (idx>0 && idx<arr.length-1){
            var prev = arr[idx-1]
            var new_arr = line(prev.x, prev.y, prev.z, val.x, val.y, val.z, currVal)
            new_coor = new_coor.concat(new_arr)
        }
    })
    //console.log("new coor", new_coor)
    return new_coor
}

var end_paint = function(template, originalCoord, screenCoor){
    var painters = template.painters.get()
    var N = painters.length
    var currentPaint = painters[N-1]
    var currVal = Session.get("paintValue")

    currentPaint.matrix_coor.push(originalCoord)
    //currentPaint.world_coor.push(world)
    currentPaint.paintValue = currVal



    var viewer = papayaContainers[0].viewer
    draw_point(screenCoor, viewer, curveColor, 3)
    var canvas = viewer.canvas
    var context = canvas.getContext('2d');

    context.lineTo(screenCoor.x, screenCoor.y);
    context.moveTo(screenCoor.x, screenCoor.y);
    context.stroke();
    context.closePath();
    currentPaint.matrix_coor = snapToGrid(currentPaint.matrix_coor)
    //console.log(currentPaint.matrix_coor)
    currentPaint.matrix_coor = fill_lines(currentPaint, currVal)
    currentPaint.offset = []
    currentPaint.matrix_coor.forEach(function(val, idx, arr){
        var world = new papaya.core.Coordinate();
        papayaContainers[0].viewer.getWorldCoordinateAtIndex(val.x, val.y, val.z, world);
        currentPaint.world_coor.push(world)
        /*var viewer = papayaContainers[0].viewer
        var N = viewer.screenVolumes.length
        var vol = viewer.screenVolumes[N-1].volume
        var ori = vol.header.orientation
        var offset = ori.convertIndexToOffset(val.x,val.y,val.z)
        currentPaint.offset.push(offset)*/
    })
    //currentPaint.original_vals = []
    /*currentPaint.matrix_coor.forEach(function(val, idx, arr){
        var old_val = setValue(papayaRoundFast(val.x), papayaRoundFast(val.y), papayaRoundFast(val.z), currVal)
        if (val.old_val == null){
            val.old_val = old_val
        }
        //currentPaint.original_vals.push(old_val)
    })*/
    Session.set("isDrawing", false)
    viewer.drawViewer(true,false)
    template.painters.set(painters)
    console.log("currentPaint is", currentPaint)
    //console.log(currentPaint)


}

restore_vals = function(currPaint){
    console.log("restoring", currPaint)
    if (currPaint){
        currPaint.matrix_coor.reverse()
        currPaint.matrix_coor.forEach(function(val, idx, arr){
            setValue(papayaFloorFast(val.x), papayaFloorFast(val.y), papayaFloorFast(val.z), val.old_val)
            //console.log( currPaint.original_vals[idx])
        })
        var viewer = papayaContainers[0].viewer
        viewer.drawViewer(true,false)
    }

}

logpoint = function(e, template, type){

    var viewer = papayaContainers[0].viewer

    if((e.shiftKey || template.touchscreen.get()) && e.altKey == false ){

        var currentCoor = papayaContainers[0].viewer.cursorPosition
        var originalCoord = new papaya.core.Coordinate(currentCoor.x, currentCoor.y, currentCoor.z)
        var screenCoor = new papaya.core.Point(e.offsetX, e.offsetY) //papayaContainers[0].viewer.convertCoordinateToScreen(originalCoord);

        var mode = template.logMode.get()

        if ( mode == "point" && type=="click"){
            annotate_point(template, originalCoord, screenCoor)
        }

        else if (mode == "contour"){
            if (type=="mousedown"){
                start_curve(template, originalCoord, screenCoor)
            }

            else if (type=="mousemove"){
                continue_curve(template, originalCoord, screenCoor)
            }

            else if (type=="mouseup" || type=="mouseout"){
                end_curve(template, originalCoord, screenCoor)
            }

        }

        else if (mode == "paint"){
            if (type=="mousedown"){
                start_paint(template, originalCoord, screenCoor)
            }

            else if (type=="mousemove" && Session.get("isDrawing")){
                continue_paint(template, originalCoord, screenCoor)
            }

            else if (type=="mouseup" || type=="mouseout"){
                end_paint(template, originalCoord, screenCoor)

            }

        }



    }
    else{Session.set("isDrawing", false)}

    return true

}
