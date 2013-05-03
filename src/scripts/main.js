

/* require config */

requirejs.config({
  shim: {
    'backbone': {
      deps: ['underscore', 'jquery'],
      exports: 'Backbone'
    },
    'underscore': {
      exports: '_'
    },
    'jquerymobile': {
      deps: ['jquery']
    }
  }, //shim

  paths: {
    'backbone':     'lib/backbone',
    'jquerymobile': 'lib/jquery.mobile-1.3.1',
    'underscore':   'lib/underscore',
    'jquery':       'lib/jquery-1.9.1'
  } //path
});

requirejs(['jquery','backbone','conf','router','api','utils','models'],
  function($, Backbone, conf, router, api, utils, models){

  /************* utilities ***********/

  function registerLoginPageActions(){

    // register login button action
    $('#login form').submit(function(e){

      $.mobile.loading( 'show', { text: 'Authenticating...', textVisible: true} );
      e.preventDefault();

      // message to send
      var data = {
        op: "login",
        user: $('#loginInput').val(),
        password : $('#passwordInput').val()
      };

      jQuery.ajax(
        {
          url: conf.apiPath + 'api/',
          contentType: "application/json",
          dataType: 'json',
          cache: 'false',
          data: JSON.stringify(data),
          type: 'post',
          async: false
        }
      )
      .done(function(data){
        if (data.status == 0){
          // we store the sessions id
          models.settingsModel.set("sid", data.content.session_id);
          models.settingsModel.save();

          router.myRouter.setNextTransOptions({reverse: true, transition: "slideup"});

          // try to get from query string if it exists
          var fragment = location.hash;
          var re = /\?from=#(.+)/;
          var nextRoute = "cat";
          var ex = re.exec(fragment)
          if (ex != null){
            nextRoute = ex[1];
          }

          router.myRouter.navigate(nextRoute, {trigger: true});
        } else {
          var msg = "Unknown answer from the API:" + data.content;
          if (data.content.error == "API_DISABLED"){
            msg = 'API is disabled for this user';
          } else if (data.content.error == "LOGIN_ERROR"){
            msg = "Specified username and password are incorrect";
          }
          alert(msg);
          $.mobile.loading('hide');
        }
      });
    }); // login button
  }



  /************** init bindings *************/

  $(document).bind('mobileinit', function(event){

    // desactivate jQueryMobile routing (we use Backbone.Router)
    $.mobile.ajaxEnabled = false;
    $.mobile.linkBindingEnabled = false;
    $.mobile.hashListeningEnabled = false;
    $.mobile.pushStateEnabled = false;
    $.mobile.changePage.defaults.changeHash = false;
    $.mobile.defaultPageTransition = "slide";
  });




  var g_init = false;

  $(document).bind('pageinit', function(event){

    if (! g_init){

      g_init = true;

      // alternative to localStorage using cookies
      utils.localStorageSupport();
      
      // events for login page
      registerLoginPageActions();

      // initialize all logout buttons
      $('a.logoutButton').on('click',
        function(e){
          e.preventDefault();
          $.mobile.loading( 'show', { text: 'Logging out...', textVisible: true} );
          api.logout();
        }
      );

      // initialize all back buttons
      $('a.backButton').on('click',
        function(e){
          router.myRouter.setNextTransOptions({reverse: true});
        }
      );

      // initialize all menu buttons
      $("a[data-rel='popup']").on('click',
        function(e){
          e.preventDefault();
          var popupId = $(e.currentTarget).attr('href');
          var transition = $(popupId).attr('data-transition');
          
          $(popupId).popup("open", {transition: transition,
                                    positionTo: $(e.currentTarget) });
        }
      );

      // prepare all pages now
      $("div:jqmData(role='page')").page();

      // first transition
      router.myRouter.setNextTransOptions({transition: "fade"});
      
      // start Backbone router
      if (!Backbone.history.start({pushState: false, root: utils.getWebAppPath(), silent: false})){
        alert("Could not start router!");
      }

    }
  });


  //loading jQuery Mobile after everything
  require(['jquerymobile'], function(){});

}); //requirejs

