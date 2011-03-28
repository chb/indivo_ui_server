/*
 * Some utilities for JMVC
 * Ben Adida (ben.adida@childrens.harvard.edu)
 * Arjun Sanyal (arjun.sanyal@childrens.harvard.edu)
 *
 * NOTE: These functions were written for JMVC 1.5. Now that we're up to JMVC 3
 * we're using this as kind of compatibility layer as we continue to port our code
 * to the latest versions.
 *
 * FIXME, FIXME, FIXME NAMESPACE!
 * FIXME, FIXME, FIXME NAMESPACE!
 * FIXME, FIXME, FIXME NAMESPACE!
 * FIXME, FIXME, FIXME NAMESPACE!
 * FIXME, FIXME, FIXME NAMESPACE!
 * FIXME, FIXME, FIXME NAMESPACE!
 *
 */


// Warning: deprecated! Use native jquery ajax and selectors in callbacks (e.g. data.find('foo')) or the wrapper below!
jQuery.getXML = function(url, callback, fixture) {
    url = '/indivoapi'+url;
    fixture = fixture || null;

    jQuery.get(url,
               null,
               function(data) {
                 var tree = new XML.ObjTree;
                 var dom = tree.parseXML(data);
                 // console.log(dom);
                 callback(dom);
               },
               "text",
               fixture);
};

// the new way to do an Indivo API call with jQuery XML parsing
indivo_api_call = function(method, url, data, callback, error_callback) {
  url = '/indivoapi' + url;
  $.ajax({
    type: method,
    url: url,
    data: data,
    dataType: "xml",
    success: callback,
    error: error_callback
  });
};


// interpolate a URL template
// based on mnot's idea, simplified here for explicit use and vars
function interpolate_url_template(url_template, vars) {
  var result = url_template;
  $.each(vars, function(var_name, var_value) {
    var regexp = new RegExp("{" + var_name + "}");
    result = result.replace(regexp, var_value);
  });
  return result;
}

function when_ready(ready_function, callback) {
 setTimeout(function() { if (ready_function()) callback(); }, 1000);
};


// make a XML Doc (type: Document, not the root node) from a XML string (lifted from ObjTree)
function xml_doc_from_string(xml) {
  if ( window.DOMParser ) {
    var xmldom = new DOMParser();
    var dom = xmldom.parseFromString( xml, "application/xml" );
    if (dom) { return dom; }
  } else if ( window.ActiveXObject ) {
    xmldom = new ActiveXObject('Microsoft.XMLDOM');
    xmldom.async = false;
    xmldom.loadXML( xml );
    if (xmldom.documentElement) { return xmldom; }
  }
};
