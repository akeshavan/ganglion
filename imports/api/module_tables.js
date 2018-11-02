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
          break
        case "get_qc_ave_field":
          return get_qc_ave_field(mod.entry_type, field.id, field.name)
          break
        case "get_button_launcher":
          return get_button_launcher(mod.entry_type, field.id, field.name)
          break
        default:
          return {data: field.id, title: field.name}

      }
    })
  })
})
