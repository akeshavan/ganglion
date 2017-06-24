import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { check } from 'meteor/check';

export const Subjects = new Mongo.Collection('subjects');

import "./table_utils.js"
import "./publications.js"
import "./methods.js"

TabularTables = {}

console.log("Meteor settings are", Meteor.settings)

Meteor.settings.public.modules.forEach(function(mod, idx, arr){
  TabularTables[mod.entry_type] = new Tabular.Table({
    name: mod.entry_type,
    collection: Subjects,
    autoWidth: false,
    columns: _.map(mod.fields, function(field){
      switch (field.function_name) {
        case "get_filter_field":
          return get_filter_field(mod.entry_type, field.id, field.name)
          break;
        case "get_qc_viewer":
          return get_qc_viewer(mod.entry_type, field.id, field.name)
          break;
        case "get_qc_filter_field":
          return get_qc_filter_field(mod.entry_type, field.id, field.name)
        default:
          return {data: field.id, title: field.name}

      }
    })
  })
})

/*
TabularTables.demographic =  new Tabular.Table({
name:"demographic",
    autoWidth: false,
    collection: Subjects,
    columns:[


        get_filter_field("demographic", "msid", "msid"),



        get_filter_field("demographic", "subject_id", "Exam ID"),



        get_filter_field("demographic", "Study Tag", "Study Tag"),



        get_filter_field("demographic", "DCM_InstitutionName", "Site"),



        get_filter_field("demographic", "metrics.DCM_InstitutionName", "Date"),


    ]
    })


TabularTables.freesurfer =  new Tabular.Table({
name:"freesurfer",
    autoWidth: false,
    collection: Subjects,
    columns:[


        get_filter_field("freesurfer", "subject_id", "Exam ID"),



        get_qc_viewer("freesurfer", "name", "Freesurfer ID"),



        get_qc_filter_field("freesurfer", "quality_check.QC", "QC"),



        get_filter_field("freesurfer", "checkedBy", "checked by"),



        get_filter_field("freesurfer", "quality_check.user_assign", "Assigned To"),



        {data: "quality_check.notes_QC", title: "Notes" }


    ]
    })


TabularTables.test =  new Tabular.Table({
name:"test",
    autoWidth: false,
    collection: Subjects,
    columns:[


        get_filter_field("test", "subject_id", "Exam ID"),



        get_qc_viewer("test", "name", "View Image"),



        get_qc_filter_field("test", "quality_check.QC", "QC"),



        get_filter_field("test", "checkedBy", "checked by"),



        get_filter_field("test", "quality_check.user_assign", "Assigned To"),



        {data: "quality_check.notes_QC", title: "Notes" }


    ]
    })
*/
