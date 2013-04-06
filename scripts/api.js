
// API functions

define(['jquery'], function($){

  function ajaxErrorHandler(event, jqXHR, ajaxSettings, thrownError){
    // TODO: better error handling and output to the user
    console.error('ajaxErrorHandler error: ' + thrownError);
  }

  // my handler for AJAX errors
  $(document).ajaxError(ajaxErrorHandler);

  return {

    /* function to call TTRSS
      - req => the request as a JSON object
      - success => the success callback (one param the content)
      - async => async call? */
    ttRssApiCall: function(req, success, async){
      var data = req;
      var sid = window.settingsModel.get("sid");

      if (sid != undefined){
        data.sid = sid;
      }

      jQuery.ajax(
        {
          url: window.apiPath + 'api/',
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


    /* Most of the calls (except login, logout, isLoggedIn)
      require valid login session or will return this
      error object: {"error":"NOT_LOGGED_IN"} */
    apiErrorHandler: function(msg){
      if (msg.error != "NOT_LOGGED_IN"){
        // real error 
        alert('apiErrorHandler\nUnknown API error message' + msg.error);

      } else {
        // need to login
        if (! location.hash.startsWith("#login")){

          // before redirecting user to the login page
          // we need to test if TTRSS is in SINGLE USER MODE
          jQuery.ajax({
            url: window.apiPath + 'api/',
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
              window.myRouter.navigate(dest, {trigger: true});
            
            } else {
              // SINGLE_USER_MODE
              window.settingsModel.set("sid", data.content.session_id);
              window.settingsModel.save();

              window.location.reload(true);
            }
          });

        } // else user is already where he needs to be
      }
    },

    /* to make a logout call */
    logout: function(){
      var msg = {
        'op': 'logout'
      };

      ttRssApiCall(msg,
        function(){
          window.myRouter.navigate('login', {trigger: true});
        },
        function(m){
          alert('Could not logout :\n' + m);
        }, true
      );
    } //logout

  } //return


}); //define
