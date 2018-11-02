MyAppExporter = {
	exportFS: function() {
		var self = this;
		console.log("exporting....")
		var gSelector = getFS()
		Meteor.call("export_FS", gSelector, function(error, data) {

			if ( error ) {
				alert(error);
				return false;
			}
            console.log(data)
			var csv = Papa.unparse(data);
			self._downloadCSV(csv);
		});
	},

	_downloadCSV: function(csv) {
    	//console.log(csv)
		var blob = new Blob([csv]);
		var a = window.document.createElement("a");
	    a.href = window.URL.createObjectURL(blob, {type: "text/plain"});
	    a.download = "metrics.csv";
	    document.body.appendChild(a);
	    a.click();
	    document.body.removeChild(a);
	}
}