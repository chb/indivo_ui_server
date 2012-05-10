APP_MANAGER = new SMART_CONNECT_HOST();

APP_MANAGER.get_credentials = function(app_instance, callback){
    var app_email = encodeURIComponent(app_instance.manifest.id);
    var account_id = encodeURIComponent(app_instance.context.user.id);
    var data = { record_id: encodeURIComponent(app_instance.context.record.id)};
    
    $.ajax({url: "/accounts/" + account_id + "/apps/" + app_email + "/connect_credentials",
	    data: data,
	    type: "GET"})
        .success(
	   function(data) {
	       callback(data);
	   })
        .error(
	   function(data) {
	       // TODO
	       alert("Something went wrong fetching credentials: " + data);
	   });
};

APP_MANAGER.get_iframe = function(app_instance, callback) {
    var frame = $('<iframe src="about:blank" class="app_content_iframe" frameborder="no"></iframe>').hide().appendTo("#app_content");
    callback(frame[0]);
};

APP_MANAGER.on_app_launch_complete = function(app_instance, callback) {
    $(app_instance.iframe).show();
    callback();
};

APP_MANAGER.handle_api = function(app_instance, api_call, success, error) {
    var auth_params = 'connect_token="' + encodeURIComponent(app_instance.credentials.connect_token) + '"';
    var header = "OAuth " + auth_params;

    var data = api_call.params;
    var method = api_call.type;
    var contentType = api_call.contentType;
    var url = "indivoapi" + api_call.func; // TODO: ADD THE BASE URL!!
    
	var xhr = $.ajax({
		beforeSend : function(xhr) {
			xhr.setRequestHeader("Authorization", header);
		},
		dataType : "text",
		url : url,
		contentType : contentType,
		data : data,
		type : method,
		success : function(d) {
			var ct = xhr.getResponseHeader("Content-Type") || "unknown";
			success({
				contentType : ct.split(";")[0],
				data : d
			});
		},
		error : function(err) {
			var ct = xhr.getResponseHeader("Content-Type") || "unknown";
			error(err.status, {
				contentType : ct.split(";")[0],
				data : err
			});
		}
	}); 

};