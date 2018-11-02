
label_qa = function(name,object){
            if (!name){
                html = '<span class="label label-warning fsqc -1">Not Checked</span>'
                return Spacebars.SafeString(html)
                }
            else{
                if (name.QC == "1"){
                    html = '<span class="label label-success fsqc 1">Pass</span>'
                    return Spacebars.SafeString(html)
                }
                else if (name.QC=="0"){
                    html = '<span class="label label-danger fsqc 0">Fail</span>'
                    return Spacebars.SafeString(html)
                }
                else if (name.QC=="2"){
                    html = '<span class="label label-primary fsqc 2">Needs Edits</span>'
                    return Spacebars.SafeString(html)
                }
                else if (name.QC=="3"){
                    html = '<span class="label label-info fsqc 3">Edited</span>'
                    return Spacebars.SafeString(html)
                }
                else{
                    html = '<span class="label label-warning fsqc -1">Not Checked</span>'
                    return Spacebars.SafeString(html)
                }

            }
        }// end of function

/*Tabular Table Setup*/

get_filter_field = function(entry_type, field_name, title){

    var returnfunc = {data:field_name,
                      title:title,
                      render: function(val, type, doc){

                                if (val != null){
                                    html = '<a class="filter '+entry_type+'+'+field_name+'+'+val+'">'+val+'</a>'
                                    return Spacebars.SafeString(html)
                                }
                                else {
                                    return ""
                                }


                            }//end function
                      }; //end returnfunc
    return returnfunc

}

button_launcher = function(foo){
  var html = '<button class="clouder btn btn-primary btn-small">Launch Clowder</button>'
  return Spacebars.SafeString(html)
}

get_button_launcher = function(entry_type, field_name, title){
  var returnfunc = {data:field_name,
                    title:title,
                    render: function(val, type, doc){
                              return button_launcher()
                          }//end function
                    }; //end returnfunc
  return returnfunc
}

get_filter_list_field = function(entry_type, field_name, title){

    var returnfunc = {data:field_name,
                      title:title,
                      render: function(val, type, doc){
                                var html = ""
                                if (val != null){
                                    //console.log("val is", val)
                                if(typeof val == "string"){
                                    val = [val]
                                }
                                val.forEach(function(val2, idx, arr){
                                    if (val != null){
                                        tmp = '<a class="filter '+entry_type+'+'+field_name+'+'+val2+'">'+val2+'</a>'
                                        html = html +" "+ tmp
                                    }

                                })
                                return Spacebars.SafeString(html)}
                                else{return ""}


                            }//end function
                      }; //end returnfunc
    return returnfunc

}

get_qc_filter_field = function(entry_type, field_name, title){



    var returnfunc = {data:field_name,
                      title:title,
                      render: function(val, type, doc){

                                var val_mapper = {"-1": "Not Checked", "0": "Fail", "1": "Pass", "2": "Needs Edits", "3": "Edited"}
                                var class_mapper = {"-1": " label label-warning", "0": " label label-danger",
                                                   "1": " label label-success", "2": " label label-primary", "3": " label label-info"}
                                var realval = -1
                                if (val != null){
                                    realval = val
                                }
                                html = '<a class="'+class_mapper[realval]+' filter '+entry_type+'+'+field_name+'+'+val+'">'+val_mapper[realval]+'</a>'
                    	        return Spacebars.SafeString(html)
                            }//end function
                      }; //end returnfunc
    return returnfunc

}

get_qc_ave_field = function(entry_type, field_name, title){
  var returnfunc = {data:field_name,
                    title:title,
                    render: function(val, type, doc){
                            //console.log("rendering", val, type, doc);
                              var val_mapper = {"-1": "Not Rated", "0": val, "1": val, "2": "Needs Edits", "3": "Edited"}
                              var class_mapper = {"-1": " label label-warning", "0": " label label-danger",
                                                 "1": " label label-success", "2": " label label-primary", "3": " label label-info"}
                              var realval = -1
                              if (val != null){
                                  realval = val > 0 ? 1 : 0;
                              }
                              //console.log(class_mapper[realval], val_mapper[realval])
                              if (realval >= 0){
                                html = '<span class="'+class_mapper[realval]+'">'+d3.format('.2f')(val_mapper[realval])+'</span>'
                              }
                              else {
                                html = '<a class="'+class_mapper[realval]+' filter '+entry_type+'+'+field_name+'+'+val+'">'+val_mapper[realval]+'</a>'
                              }
                            return Spacebars.SafeString(html)
                          }//end function
                    }; //end returnfunc
  return returnfunc
}

get_qc_viewer = function(entry_type, field_name, title){

    var output = {data:field_name, title:title, render: function(val, type, doc){
	        html = '<a href="/HREF"> VAL </a>'.replace("HREF",entry_type+"/"+val).replace("VAL", val)

	        //'<a data-toggle="modal" data-target="#modal-fullscreen" class="viewQC '+entry_type+"+"+val+'">'+val+'</a>'
	        //console.log(html)
	        return Spacebars.SafeString(html)
        }}

    return output

}


tableFields = {

    "msid": get_filter_field("demographic", "msid", "msid"),

    "subject_id": {data:"subject_id", title: "Exam ID", render: function(val, type, doc){
	        html = '<a class="exam subject_id '+val+'">'+val+'</a>'
	        return Spacebars.SafeString(html)
        }},

    "Study Tag": {data:"Study Tag", title:"Study Tag", render: function(val, type, doc){
            if (val == null){
                return null
                }
            html = '<a class="exam study_tag '+val+'">'+val+'</a>'
            return Spacebars.SafeString(html)
        }},

    "Site": {data:"DCM_InstitutionName", title:"Site", render: function(val, type, doc){
            if (val == null){
                return null
                }
            html = '<a class="exam site '+val+'">'+val+'</a>'
            return Spacebars.SafeString(html)
        }},

    "viewNifti": {data:"name", title:"nifti filename", render: function(val, type, doc){
	                  html = '<a target="_blank" href="/viewImage/'+val+'/mseID/'+val.split("-")[1]+'">'+val+'</a>'
	                  return Spacebars.SafeString(html)
	              }},

	"viewMNI": {data:"_id", title:"file", render: function(val, type,doc){

	html = '<a target="_blank" href="/viewImage_mni/'+val+'/mseID/'+val.split("-")[1]+'">'+val+'</a>'
	                  return Spacebars.SafeString(html)
	}},

    "Date": {data:"DCM_StudyDate", title:"Date"},

    "checkedBy": {data: "checkedBy", title:"checkedBy", render: function(val, type, doc){
        if (val == null){
            return null
        }
        return '<a class="fs checkedBy '+val+'">'+val+'</a>'
    }},
    "assignedTo": {data: "quality_check.user_assign", title:"assignedTo", render: function(val, type, doc){
        if (val == null){
            return null
        }
        return '<a class="fs quality_check.user_assign '+val+'">'+val+'</a>'
    }},

    "QC": get_qc_filter_field("freesurfer", "quality_check.QC", "QC"),//{data:"quality_check", title:"QC", render: label_qa },

    "viewFS": {data:"name", title:"Freesurfer Subject ID", render: function(val, type, doc){
	        html = '<a target="_blank" href="#" class="viewQC '+'">'+val+'</a>'
	        //console.log(html)
	        return Spacebars.SafeString(html)
        }},

    "completeFS": {data:"complete", title:"done", render:function(val, type, doc){
            if (val == true){
                html = '<a class="fs complete true"><span class="glyphicon glyphicon-ok" aria-hidden="true"></span> yes</a>'
                return Spacebars.SafeString(html)
            }
            else{
            html = '<a class="fs complete false"><span class="glyphicon glyphicon-remove" aria-hidden="true"></span> no</a>'
                return Spacebars.SafeString(html)}
        }},

    "percentFS": {data:"subject_id", title:"% FS", render: function(val, type, doc){
	        total = doc["freesurfer_t1s"].length
	        count = 0.0
	        for(i=0;i<doc["freesurfer_t1s"].length;i++){
		        if (doc["freesurfer_t1s"][i]["complete"]){
			        count +=1.0
		        }
	        }
	        return count/total*100
        }},

    "totalFS": {data:"subject_id", title:"Total FS", render: function(val, type, doc){
	        return doc["freesurfer_t1s"].length
        }},

    "numNifti": {data:"num_nii", title:"# nifti", render: function(val, type, doc){
	        return doc["nifti_files"].length
        }}

}
