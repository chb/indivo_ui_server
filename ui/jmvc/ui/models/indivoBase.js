$.Model.extend('UI.Models.IndivoBase',
/* @Static */
{
	apiBase: function() {
		return "indivoapi/"
	},
	
	convert : {
		date : function(raw){
			// Indivo returns ISO 8601 representations with UTC timezone designator
			var converted = null;
			if (raw && raw !== "") {
				converted = new Date(raw);
			}
			return converted;
		}
	}
},
/* @Prototype */
{
	
})
