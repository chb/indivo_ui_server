$.Model.extend('UI.Models.IndivoBase',
/* @Static */
{
	apiBase: function() {
		return "indivoapi/"
	},
	
	convert : {
		date : function(raw){
			var converted = null;
			if (raw && raw !== "") {
				// Indivo returns ISO 8601 representations with UTC timezone designator
				converted = Date.parse(raw).setTimezone('Z'); // date.js requires manually setting this for now
			}
			return converted;
		}
	}
},
/* @Prototype */
{
	
})
