/*
 * SMART Connect Host:  container side of the SMART Connect API
 * Josh Mandel
 * Ben Adida
 */

(function(window) {

// simple pattern to match URLs with http or https
var __SMART_URL_PATTERN = /^(https?:\/\/[^/]+)/;

// extract a postMessage appropriate origin from a URL
function __SMART_extract_origin(url) {
    var match = url.match(__SMART_URL_PATTERN);
    if (match)
	return match[1].toLowerCase();
    else
	return null;
}


window.SMART_CONNECT_HOST = function() {
    
    var sc = this;

    /*
      Begin public interface to SMART_CONTAINER object
    */
    sc.jQuery = jQuery;
    sc.debug = false;
    sc.running_apps = {};

    sc.handle_context_changed = function() { };
    sc.on_app_ready = function(a){ };

    sc.on_app_launch_begin =    function(a,callback){ callback(); };
    sc.on_app_launch_complete = function(a,callback) { callback(); };

    sc.on_app_launch_delegated_begin =    function(a,callback){ callback(); };
    sc.on_app_launch_delegated_complete = function(a,callback) { callback(); };

    sc.get_credentials = function() {
	var err = "Must override SMART_CONNECT_HOST.get_credentials";
	console.log(err);
	throw err;
    };

    sc.get_iframe = function() {
	var err = "Must override SMART_CONNECT_HOST.get_iframe";
	console.log(err);
	throw err;
    };

    sc.get_iframe = function() {
	var err = "Must override SMART_CONNECT_HOST.handle_api";
	console.log(err);
	throw err;
    };

    sc.destroy_app_instance = function(app_instance) {
    	var c = app_instance.channel;
    	if (c)  {
            c.notify({method: "destroy"});
    	    c.destroy();
    	}
	if (app_instance.iframe)
	{
	    jQuery(app_instance.iframe).remove();
	}

	delete sc.running_apps[app_instance.uuid];
    };

    sc.record_context_changed = function() {	
    	jQuery.each(sc.running_apps, function(aid, a){
	    if (a.manifest.scope !== "record") return;
	    sc.destroy_app_instance(a);
	});
    };

    sc.notify_app_foregrounded= function(app_instance_id){
    	var app_instance = sc.running_apps[app_instance_id];
	if (app_instance.channel !== undefined)
	    app_instance.channel.notify({method: "foreground"});
    };

    sc.notify_app_backgrounded = function(app_instance_id){
    	var app_instance = sc.running_apps[app_instance_id];
	if (app_instance.channel !== undefined)
	    app_instance.channel.notify({method: "background"});
    };


    sc.notify_app_destroyed = function(app_instance_id){
    	var app_instance = sc.running_apps[app_instance_id];
	if (app_instance.channel !== undefined)
	    app_instance.channel.notify({method: "destroy"});
    };
  
    sc.launch_app = function(manifest, context, options) {

	if (typeof manifest !== "object" || typeof manifest.id !== "string") {
	    throw "Expected an app manifest!";
	}
	
	var uuid = randomUUID();
	var app_instance = sc.running_apps[uuid] = {
	    uuid: uuid,
	    manifest: manifest,
	    context: context,
	    options: options
	};

	return begin_launch_wrapper(app_instance)
	    .pipe(get_credentials_wrapper)
	    .pipe(get_iframe_wrapper)
	    .pipe(function() {
		var launch_url = app_instance.manifest.index;
		var base_url =  app_instance.manifest.base_url;
		launch_url = launch_url.replace("{base_url}", base_url);

		launch_url += "?oauth_header="+
		    encodeURIComponent(app_instance.credentials.oauth_header);

		app_instance.origin = __SMART_extract_origin(launch_url);
		app_instance.iframe.src = launch_url;
		return app_instance;
	    })
	    .pipe(complete_launch_wrapper);	
    };    


    /*
      Beyond here are private functions, not exposed on the SMART_CONTAINER object.
      (Note: channel calls, accessible via postMessage, are defined below.)
     */

    var generate_ready_message = function(app_instance, callback) {	    
	var message = { 
	    context: app_instance.context,
	    credentials: app_instance.credentials,
	    uuid: app_instance.uuid,
	    manifest: app_instance.manifest,
	    ready_data: app_instance.ready_data
	};
	
	return message;
    };


    var begin_launch_wrapper = function(app_instance) {
	var dfd = jQuery.Deferred();
	sc.on_app_launch_begin(app_instance, function(r){
	    dfd.resolve(app_instance);
	});
	
	return dfd.promise();
    };

    var complete_launch_wrapper = function(app_instance) {
	var dfd = jQuery.Deferred();
	sc.on_app_launch_complete(app_instance, function(r){
	    dfd.resolve(app_instance);
	});
	return dfd.promise();
    };

    var begin_launch_delegated_wrapper = function(app_instance) {
	var dfd = jQuery.Deferred();
	sc.on_app_launch_delegated_begin(app_instance, function(r){
	    dfd.resolve(app_instance);
	});
	
	return dfd.promise();
    };

    var complete_launch_delegated_wrapper = function(app_instance) {
	var dfd = jQuery.Deferred();
	sc.on_app_launch_delegated_complete(app_instance, function(r){
	    dfd.resolve(app_instance);
	});
	return dfd.promise();
    };

    var get_credentials_wrapper = function(app_instance) {
	var dfd = jQuery.Deferred();
	sc.get_credentials(app_instance, function(r) {
	    app_instance.credentials = r;
	    dfd.resolve(app_instance)
	});
	return dfd.promise();
    };

    var get_iframe_wrapper = function(app_instance) {
	var dfd = jQuery.Deferred();
	sc.get_iframe(app_instance, function(r) {
	    app_instance.iframe = r;
	    dfd.resolve(app_instance)
	});
	return dfd.promise();
    };


    var receive_api_call = function(app_instance, call_info, callback) {
	sc.handle_api(app_instance, 
				     call_info, 
				     function(r){
					 callback({
					     contentType: "text",  
					     data: r})
				     });	    
    };

    var procureChannel = function(event){
	var app_instance = null;
	if (event.data !== '"procure_channel"') return;

	jQuery.each(sc.running_apps, function(aid, a) {
	    if (a.iframe && a.iframe.contentWindow === event.source)
		app_instance = a;
	});
	
	if (app_instance) {
	    bind_new_channel(app_instance);
	    event.source.postMessage('"app_instance_uuid='+app_instance.uuid+'"', app_instance.origin);
	}
    };

    if (window.addEventListener) window.addEventListener('message', procureChannel, false);
    else if(window.attachEvent) window.attachEvent('onmessage', procureChannel);

    // Once an app launches, discover which iframe it belongs to,
    // and create a new jschannel bound to that iframe.
    // If necessary, bind functions to the channel according to app type.
    var bind_new_channel = function(app_instance) {
	
	app_instance.channel && app_instance.channel.destroy();
	
	app_instance.channel  = Channel.build({
	    window: app_instance.iframe.contentWindow, 
	    origin: app_instance.origin, 
	    scope: app_instance.uuid, 
	    debugOutput: sc.debug
	});
	
	bind_app_channel(app_instance);
	
	if (app_instance.manifest.mode == "frame_ui")
	    bind_emr_frame_app_channel(app_instance);
	
	if (app_instance.manifest.mode == "ui")
	    bind_ui_app_channel(app_instance);

	var ready_data = generate_ready_message(app_instance);

	app_instance.channel.call({
	    method: "ready",
	    params: ready_data,
	    success: function(){sc.on_app_ready(app_instance);}
	});

    };

    var bind_emr_frame_app_channel = function(app_instance) {
	    app_instance.channel.bind("api_call_delegated", function(t, p) {
		
		t.delayReturn(true);
		var on_behalf_of = p.app_instance;
		var call_info = p.call_info;

		receive_api_call(on_behalf_of, call_info, t.complete); 
	    });

	    app_instance.channel.bind("launch_app_delegated", function(t, p) {
		t.delayReturn(true);

		var new_app_instance = p;

		begin_launch_delegated_wrapper(new_app_instance)
		    .pipe(get_credentials_wrapper)
		    .pipe(function() {
			var uuid = new_app_instance.uuid;
			t.complete(new_app_instance);
			return new_app_instance;
		    })
		    .pipe(complete_launch_delegated_wrapper);	
	    });
    };

    var bind_ui_app_channel = function(app_instance) {
	    app_instance.channel.bind("call_app_and_wait", function(t, p) {
		t.delayReturn(true);
		receive_call_app_and_wait(app_instance, p, t.complete);
	    });
    };

    var bind_app_channel = function(app_instance) {

	app_instance.channel.bind("api_call", function(t, p) {
	    t.delayReturn(true);
	    receive_api_call(app_instance, p, t.complete);
	});
	
    };

};

function randomUUID() {
	var s = [], itoh = '0123456789ABCDEF';
	// Make array of random hex digits. The UUID only has 32 digits in it, but
	// we
	// allocate an extra items to make room for the '-'s we'll be inserting.
	for ( var i = 0; i < 36; i++)
		s[i] = Math.floor(Math.random() * 0x10);
	// Conform to RFC-4122, section 4.4
	s[14] = 4; // Set 4 high bits of time_high field to version
	s[19] = (s[19] & 0x3) | 0x8; // Specify 2 high bits of clock sequence
	// Convert to hex chars
	for ( var i = 0; i < 36; i++)
		s[i] = itoh[s[i]];
	// Insert '-'s
	s[8] = s[13] = s[18] = s[23] = '-';
	return s.join('');
};

})(window);
