import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { check } from 'meteor/check';

export const Subjects = new Mongo.Collection('subjects');

import "./table_utils.js"
import "./publications.js"
import "./methods.js"

TabularTables = {}



TabularTables.brainmask =  new Tabular.Table({
name:"brainmask",
    autoWidth: false,
    collection: Subjects,
    columns:[
    
      
        get_filter_field("brainmask", "subject_id", "Exam ID"),
      
    
      
        get_qc_viewer("brainmask", "name", "Freesurfer ID"),
      
    
      
        get_qc_filter_field("brainmask", "quality_check.QC", "QC"),
      
    
      
        get_filter_field("brainmask", "checkedBy", "checked by"),
      
    
      
        get_filter_field("brainmask", "quality_check.user_assign", "Assigned To"),
      
    
      
        {data: "quality_check.notes_QC", title: "Notes" }
      
    
    ]
    })


TabularTables.wm =  new Tabular.Table({
name:"wm",
    autoWidth: false,
    collection: Subjects,
    columns:[
    
      
        get_filter_field("wm", "subject_id", "Exam ID"),
      
    
      
        get_qc_viewer("wm", "name", "Freesurfer ID"),
      
    
      
        get_qc_filter_field("wm", "quality_check.QC", "QC"),
      
    
      
        get_filter_field("wm", "checkedBy", "checked by"),
      
    
      
        get_filter_field("wm", "quality_check.user_assign", "Assigned To"),
      
    
      
        {data: "quality_check.notes_QC", title: "Notes" }
      
    
    ]
    })


TabularTables.aparcaseg =  new Tabular.Table({
name:"aparcaseg",
    autoWidth: false,
    collection: Subjects,
    columns:[
    
      
        get_filter_field("aparcaseg", "subject_id", "Exam ID"),
      
    
      
        get_qc_viewer("aparcaseg", "name", "Freesurfer ID"),
      
    
      
        get_qc_filter_field("aparcaseg", "quality_check.QC", "QC"),
      
    
      
        get_filter_field("aparcaseg", "checkedBy", "checked by"),
      
    
      
        get_filter_field("aparcaseg", "quality_check.user_assign", "Assigned To"),
      
    
      
        {data: "quality_check.notes_QC", title: "Notes" }
      
    
    ]
    })

