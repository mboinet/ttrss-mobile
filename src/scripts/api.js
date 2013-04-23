
// API functions

define(['require','jquery','conf','router','models'],
       function(require, $, conf, router, models){

  function ajaxErrorHandler(event, jqXHR, ajaxSettings, thrownError){
    // TODO: better error handling and output to the user
    console.error('ajaxErrorHandler error: ' + thrownError);
  }

  /* Most of the calls (except login, logout, isLoggedIn)
    require valid login session or will return this
    error object: {"error":"NOT_LOGGED_IN"} */
  function apiErrorHandler(msg){
    if (msg.error != "NOT_LOGGED_IN"){
      // real error 
      alert('apiErrorHandler\nUnknown API error message' + msg.error);

    } else {
      // need to login
      if (! location.hash.startsWith("#login")){

        // before redirecting user to the login page
        // we need to test if TTRSS is in SINGLE USER MODE
        jQuery.ajax({
          url: conf.apiPath + 'api/',
          contentType: "application/json",
          dataType: 'json',
          cache: 'false',
          data: JSON.stringify({op: "login"}),
          type: 'post',
          async: false
        }).done(function(data){
          if (data.status == 1){
            // we're really not logged in
            var dest = "login"; // new destination
            
            if (location.hash != ""){
              // we store where we're coming from in a query string
              dest += "?from=" + location.hash;
            }
            router.myRouter.navigate(dest, {trigger: true});
          
          } else {
            // SINGLE_USER_MODE
            models.settingsModel.set("sid", data.content.session_id);
            models.settingsModel.save();

            window.location.reload(true);
          }
        });

      } // else user is already where he needs to be
    }
  } // apiErrorHandler

  // my handler for AJAX errors
  $(document).ajaxError(ajaxErrorHandler);

  return {

    /* function to call TTRSS
      - req => the request as a JSON object
      - success => the success callback (one param the content)
      - async => async call? */
    ttRssApiCall: function(req, success, async){
      var data = req;
      // circular dependency for models
      var sid = require('models').settingsModel.get("sid");

      if (sid != undefined){
        data.sid = sid;
      }

      jQuery.ajax(
        {
          url: conf.apiPath + 'api/',
          contentType: "application/json",
          dataType: 'json',
          cache: 'false',
          data: JSON.stringify(data),
          type: 'post',
          async: async
        }
      )
      .done(function(data){
        if (data.status == 0){
          success(data.content);
        } else {
          apiErrorHandler(data.content);
        }
      });
    }, // ttRssApiCall



    /* to make a logout call */
    logout: function(){
      var msg = {
        'op': 'logout'
      };

      this.ttRssApiCall(msg,
        function(){
          router.myRouter.navigate('login', {trigger: true});
        },
        function(m){
          alert('Could not logout :\n' + m);
        }, true
      );
    } //logout

  } //return


}); //define
