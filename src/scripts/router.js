/*************** BACKBONE Router ************/
define(['backbone', 'views', 'models'], function(Backbone, views, models){

  var MyRouter = Backbone.Router.extend({

    routes: {
      "login":                  "login",       // #login
      "login?from=*qr":         "login",       // #login?from=#cat4/feed23
      "":                       "categories",  // #
      "cat:catId":              "feeds",       // #cat4
      "cat:catId/feed:feedId":  "articles",    // #cat4/feed23
      "cat:catId/feed:feedId/art:artId":  "read",        // #cat4/feed23/art1234
      "settings":               "settings",    // #settings
      "*path":                  "defaultRoute" // #*
    },

    defaultRoute: function(path){
      // go to homepage if route unknown
      this.navigate('', {trigger: true});
    },

    login: function() {
      this.transitionOptions = {transition: "slideup"},
      this.goto('#login');
    },

    categories: function(){
      // show the page and ask the data to be refeshed
      this.goto(views.categoriesPageView.refresh().$el);
    },

    articles: function(catId, feedId){
      // test feedId is an integer (negative or positive)
      var id = parseInt(feedId);
      if (isNaN(id)){
        this.navigate('', {trigger: true});
      } else {
        // show the page and ask the data to be refeshed
        this.goto(views.articlesPageView.refresh().$el);
      }
    },

    feeds: function(catId){
      // test catId is an integer (negative or positive)
      var id = parseInt(catId);
      if (isNaN(id)){
        this.navigate('', {trigger: true});
      } else {
        // go to the view and ask the data to be refreshed
        this.goto(views.feedsPageView.refresh().$el);
      }
    },

    read: function(catName, feedName, artId){
      var id = parseInt(artId);

      if (isNaN(id)){
        // id invalid, go to categories page (Home)
        this.navigate('', {trigger: true});
      } else {
        // go to the view and ask the data to be refreshed
        this.goto(views.articlePageView.refresh().$el);

        // scroll to top
        window.scroll(0,0);
      }
    },

    transitionOptions: {},
    setNextTransOptions : function(obj){
      this.transitionOptions = obj;
    },

    settings: function(){
      this.setNextTransOptions({reverse: false, transition: "flip"});
      this.goto(views.settingsPageView.render().$el);
      this.setNextTransOptions({reverse: true, transition: "flip"});
    },

    goto: function(page){
      $.mobile.changePage(page, this.transitionOptions);

      // reset transitions options
      this.transitionOptions = {};

    } // goto

  });


  return {
    myRouter: new MyRouter()
  };

}); //define

