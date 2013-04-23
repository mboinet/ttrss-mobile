

define(['backbone'], function(Backbone){

  /*************** BACKBONE Router ************/
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
      // show the page
      this.goto(window.categoriesPageView.render().$el);

      // update model
      window.categoriesModel.fetch();
    },

    articles: function(catId, feedId){
      // test feedId is an integer (negative or positive)
      var id = parseInt(feedId);
      if (isNaN(id)){
        this.navigate('', {trigger: true});
      } else {
        // go to the view
        this.goto(window.articlesPageView.render().$el);

        // update model
        window.articlesModel.fetch();
      }
    },

    feeds: function(catId){
      // test catId is an integer (negative or positive)
      var id = parseInt(catId);
      if (isNaN(id)){
        this.navigate('', {trigger: true});
      } else {
        // go to the view
        this.goto(window.feedsPageView.render().$el);

        // update model
        window.feedsModel.fetch();
      }
    },

    read: function(catName, feedName, artId){
      var id = parseInt(artId);

      if (isNaN(id)){
        // id invalid, go to categories page
        this.navigate('', {trigger: true});
      } else {

        // the model
        var art = window.articlesModel.get(id);

        if (art == undefined){
          /* we could not find the model in the collection
             this must be the first page loaded */
          art = new window.ArticleModel({id: id});
        }

        // set the model of the view & display it
        var view = window.articlePageView;

        view.model = art;
        this.goto(view.render().$el);

        // scroll to top
        window.scroll(0,0);

        // tell the model to get all the article data
        // if we don't have content yet
        if (! art.has("content")){
          art.fetch();
        }
      }
    },

    transitionOptions: {},
    setNextTransOptions : function(obj){
      this.transitionOptions = obj;
    },

    settings: function(){
      this.setNextTransOptions({reverse: false, transition: "flip"});
      this.goto(window.settingsPageView.render().$el);
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

