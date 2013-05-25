
// API functions

define(['require','jquery','conf','router','models','utils'],
       function(require, $, conf, router, models, utils){

  // AJAX defaults
  $.ajaxSetup({
    url: conf.apiPath + 'api/',
    contentType: "application/json",
    dataType: 'json',
    cache: 'false',
    type: 'post',
    timeout: 15000 // 15s by default
  });


  /* AJAX error handler */
  function ajaxErrorHandler(event, jqXHR, ajaxSettings, thrownError){
    // state of the XHR
    var state = jqXHR.readyState;

    if (state == 4){
      //DONE

      if (jqXHR.status != 200){
        alert ("There is probably a configuration error." +
               " An API call returned: "+ jqXHR.status +
               " (" + jqXHR.statusText + ")");
      } else {
        // API errors go to the console
        utils.log('API error: ' + thrownError);
      }
    } else {
      // other states also go to the console too
      utils.log("API error with state " + state + ": " +
                thrownError);
    }
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
          data: JSON.stringify({op: "login"}),
          async: false
        }).done(function(data){
          if (data.status == 1){
            // we're really not logged in
            var dest = "login"; // new destination
            
            if (location.hash != ""){
              // we store where we're coming from in a query string
              dest += "?from=" + location.hash;
            }
            require('router').myRouter.navigate(dest, {trigger: true});
          
          } else {
            // SINGLE_USER_MODE
            require('models').settings.set("sid", data.content.session_id);
            require('models').settings.save();

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
      var sid = require('models').settings.get("sid");

      if (sid != undefined){
        data.sid = sid;
      }

      jQuery.ajax(
        {
          data: JSON.stringify(data),
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
          require('router').myRouter.navigate('login', {trigger: true});
        },
        function(m){
          alert('Could not logout :\n' + m);
        }, true
      );
    } //logout

  } //return


}); //define
