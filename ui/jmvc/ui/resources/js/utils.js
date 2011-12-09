/*
 * Utilities for Indivo UI
 */
UI.UTILS = {
	/*
	 * Return a String representation of a Date.  Returns just the time if the 
	 * Date is within today, just the month and day if it is within the last
	 * year, or the month, day and year if it is in a previous year 
	 */
	dateTimeToPrettyString: function(date) {
		var format = "MMM d";
		var today = Date.today();
		
		if (date.compareTo(today) >= 0) {
			format = "h:mm tt";
		}
		else if (date.getFullYear() < today.getFullYear()) {
			format = "MMM d, yyyy";
		}
		
		return date.toString(format); 
	}
}
