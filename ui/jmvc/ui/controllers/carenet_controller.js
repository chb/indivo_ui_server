/**
 * @tag controllers, home
 *
 * Carenet a.k.a "sharing" Controller
 * 
 * @author Arjun Sanyal (arjun.sanyal@childrens.harvard.edu)
 * @author Ben Adida (ben.adida@childrens.harvard.edu)
 */
$.Controller.extend('UI.Controllers.Carenet',
/* @Static */
{ 
  onDocument: true,
  label: null,
  accounts: {},
  carenets: [],
  /**
   * Show and manipulate carenets for this record
   */
   show: function() {
     var _this = this;

     UI.Models.Record.get(RecordController.RECORD_ID, null, function(record) {
       _this.label = record.label;

       record.get_carenets(null, function(carenets) {
         $(carenets).each(function(i, carenet) {
             carenet.get_people(function(account_objects_list) {
               _this.accounts[carenet.carenet_id] = account_objects_list;
             });
         });
         
         var check_and_go = function() {
           // console.log('1: ', carenets.length == 0)
           // console.log('2: ', _.all(_.map(carenets, function(i, c) {return accounts[c.carenet_id] != null;})))
           if (carenets.length == 0 || _.all(_.map(carenets, function(carenet, i) {return _this.accounts[carenet.carenet_id] != null;}))) {
             _this.carenets = carenets;
             $('#app_content').html(
               $.View('//ui/views/carenet/show.ejs',
                      {'label': _this.label,
                       'carenets': _this.carenets,
                       'accounts': _this.accounts }))
             $('#app_content_iframe').hide();
             $('#app_content').show();

             $('.remove_account').click(function(e) {
               var carenet_and_account = this.id.split('|');
               var carenet_id = carenet_and_account[0];
               var account_id = carenet_and_account[1];
               UI.Controllers.Carenet.remove_account(carenet_id, account_id);
               UI.Controllers.Carenet.show();
             });

             $('.remove_carenet').click(function(e) {
               var id_and_name = this.id.split('|');
               UI.Controllers.Carenet.remove_carenet(id_and_name[0], id_and_name[1]);
               UI.Controllers.Carenet.show();
             });

             $('#add_carenet_account_form').submit(function(e) {
               var carenet_id = $(this).find('[name=carenet_id]').val();
               var account_id = $(this).find('[name=account_id]').val();
               UI.Controllers.Carenet.add_account(carenet_id, account_id);
               UI.Controllers.Carenet.show();
               return false;
             });

             $('#new_carenet_form').submit(function(e) {
               var carenet_name = $(this).find('[name=new_carenet_name]').val();
               UI.Controllers.Carenet.create_carenet(carenet_name);
               UI.Controllers.Carenet.show();
               return false;
             });

             $('#rename_carenet_form').submit(function(e) {
               var id = $('#rename_carenet_form select').first().val();
               var carenet_name = $(this).find('[name=new_name]').val();
               UI.Controllers.Carenet.rename_carenet(id, carenet_name);
               UI.Controllers.Carenet.show();
               return false;
             });

           } else {
             _.delay(check_and_go, 200); // re-queue self
           }
         }

         _.delay(check_and_go, 200); // first call with delay to serialize with get_carenets above
       });
     });
   },

   get_carenet: function(carenet_id) {
     return new UI.Models.Carenet({
       'record_id': RecordController.RECORD_ID,
       'carenet_id': carenet_id,
       'name': null
     })
   },

  create_carenet: function(name) {
    UI.Models.Record.get(RecordController.RECORD_ID, null, function(record) {
      record.create_carenet(name);
    })
    return false;
  },

   remove_carenet: function(carenet_id, carenet_name) {
     if (confirm('Are you sure you want to remove the ' + carenet_name + ' carenet?')) {
       UI.Models.Record.get(RecordController.RECORD_ID, null, function(record) {
         record.remove_carenet(carenet_id);
       })
     }
     return false;
   },

   rename_carenet: function(carenet_id, name) {
     UI.Models.Record.get(RecordController.RECORD_ID, null, function(record) {
       record.rename_carenet(carenet_id, name);
     })
     return false;
   },

   remove_account: function(carenet_id, account_id) {
     var carenet = this.get_carenet(carenet_id);
     if (confirm('Are you sure you want to remove ' + account_id + ' ?')) { carenet.remove_account(account_id); }
     return false;
   },

   add_account: function(carenet_id, account_id) {
     var carenet = this.get_carenet(carenet_id);
     if (confirm('Are you sure you want to share with ' + account_id + ' ?')) {
       var callback = function(data){
         if ($(data).find('ok').length !== 1) { alert('Could not add the "'+account_id+'" to the carenet, please try again.')}
       }
       carenet.add_account(account_id, callback);
     }
     return false;
   }
},
/* @Prototype */
{
    /**
     * Click bound to #carenet i.e. the "Sharing" link
     */
     "click": function() { UI.Controllers.Carenet.show() }
});