/**
 * @tag controllers, home
 * 
 * @author Arjun Sanyal (arjun.sanyal@childrens.harvard.edu)
 * @author Ben Adida (ben.adida@childrens.harvard.edu)
 *
 * FIXME: next version: remove global ACCOUNT and RecordController objects and use of global RecordController.RECORD_ID
 *
 */

$.Controller.extend('UI.Controllers.Record',
/* @Static */
{ onDocument: true },
/* @Prototype */
{
  /**
   * ACCOUNT_ID comes in from django: we might want an extern here for Google Closure Complier
   * http://code.google.com/closure/compiler/docs/api-tutorial3.html#externs
   */
  ready: function() {
    var _this = this;
    // inner function for strict ordering to make sure ACCOUNT.RECORDS is loaded
    var _ready = function(){
      RecordController = {};
      _this.set_record_list(ACCOUNT.RECORDS);

      // init record tabs
      // TODO: use jquery "live" events (for newly created tabs)
      $('#record_tabs').tabs({
        // DO NOT use <DIV>'s here! Events won't fire!
        tabTemplate: '<li class="record_tab" title=""><a href="#{href}"><span>#{label}</span></a></li>'
      });

      jQuery.each(ACCOUNT.RECORDS, function(i,v){
        $('#record_tabs').tabs('add', '#'+v.id, v.label)
      })

      // color them
      // TODO: cycle colors
      $('.record_tab').each(function(i,v){
        COLORS = ['#fafafa', '#eef', '#efe', '#fef', '#ffe', 'fee', '#eef', '#efe', '#fef', '#ffe', 'fee'];
        $(v).css({'background':COLORS[i]})
      });

      // add color events
      $('#record_tabs').bind('tabsselect', function(event, ui) {
        var bgcolor = $(ui.tab).parent().css('background-color');
        $('#app_content, #app_content_iframe, #active_app_tabs .ui-tabs-selected').stop(true);
        event.stopPropagation();
        $('#active_app_tabs .ui-tabs-selected').animate({
          backgroundColor: bgcolor
        }, 1000);

        // in the FUTURE we'll frame the app content with color and not change the bg, but not today!
        // $('#app_content, #app_content_iframe').animate({ border: '8px solid '+bgcolor }, 1000);
        $('#app_content, #app_content_iframe').animate({ backgroundColor: bgcolor }, 1000);

        RecordController.RECORD_ID = $(ui.tab).attr('href').substring(1);
        // make sure the iframe is hidden and the div is shown
        $('#app_content_iframe').attr('src', 'about:blank').hide();
        $('#app_content').show();
        // RecordController.dispatch('_load_record');
        _this._load_record();
      }); // bind

      // load the first record
      RecordController.RECORD_ID = ACCOUNT.RECORDS[0].id;
      _this._load_record();

      // add color events for apps (could be moved)
      $('#app_selector').bind('tabsselect', function(event, ui){
        // color the selected tab the record's color
        var parent = $(ui.tab).parent();
        $(parent).css('background', $('#record_tabs .ui-tabs-selected').css('background'))

        // uncolor all the other tabs (we need the stop since we might be animating from above)
        $('#active_app_tabs li').not(parent).stop(true).css('background', $('#app_selector').css('background'));
      }) // bind

      // color the first tab the record's color (healthfeed)
      $('#active_app_tabs li:first').css('background', $('#record_tabs .ui-tabs-selected').css('background'))
    };

    // init the ACCOUNT model and call the inner function
    ACCOUNT = new UI.Models.Account;
    ACCOUNT.load(ACCOUNT_ID, _ready);
  },
  _load_record: function() {
    var _this = this;
    var record_id = RecordController.RECORD_ID;
    var record_info = RecordController.RECORDS[record_id];

    if (record_info.carenet_id) { $('#record_owned_options').hide(); }
    else { $('#record_owned_options').show(); }

    var record_load_callback = function(record) {
      UI.Models.PHA.get_all(function(phas) {
        _this.phas = phas;

        // get the phas associated with this record
        var after_pha_callback = function(phas) {
          _this.record_phas = phas;
          // remove the last record's apps
          $(document.documentElement).ui_main('clear_apps');  // New JMVC3 controller calling convention 
          UI.Controllers.Healthfeed.show(); // show HF

          // add this record's apps
          jQuery.each(phas, function(i,v){
            // New JMVC3 controller calling convention
            $(document.documentElement).ui_main('add_app', {'pha': v, 'fire_p': false, 'carenet_id': record_info.carenet_id}) 
          });
        };

        // is this a carenet or a record? depending on which, init the appropriate apps
        if (record_info.carenet_id) { UI.Models.PHA.get_by_carenet(record_info.carenet_id, null, after_pha_callback); }
        else { UI.Models.PHA.get_by_record(record.record_id, null, after_pha_callback) }
      });
    };

    // load the record from the model and call the callback
    UI.Models.Record.get(record_id, record_info.carenet_id, function(record) {
      _this.record = record;
      record_load_callback(record);
    });
  },

  // deprecated??
  // deprecated??
  // deprecated??
  // deprecated??
  //
  // // TODO: refactor and clarify semantics here
  // ".pha click": function(params) {
  //   alert('here 2')
  //   var _this = this;
  //   RecordController.APP_ID = params.element.id;
  //   UI.Models.PHA.get(RecordController.RECORD_ID, params.element.id, function(pha) {
  //     RecordController.dispatch('one_pha', {pha:pha});
  //   });
  //   params.event.kill();
  // },
  // 
  // // TODO: refactor and clarify semantics here. deprecated?
  // "one_pha": function(params) {
  //   alert('here 1!')
  //   this.pha = params.pha;
  // },

  /**
   * Sets up a RecordController.RECORDS object keyed by record_id (todo: could be done in ACCOUNT.RECORDS)
   */
  set_record_list: function(rlist) {
    RecordController.record_list = rlist;
    RecordController.RECORDS = {};
    $(rlist).each(function(i, record) { RecordController.RECORDS[record.id] = record; })
  }
});