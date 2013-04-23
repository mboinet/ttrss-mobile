
define(['api','backbone'],function(api, Backbone){

/***************** Models *************/

  /************ categories ***********/
 
  // default model to store a category
  var CategoryModel = Backbone.Model.extend();

  // model for a collection of categories
  var CategoriesModel =  Backbone.Collection.extend({
    comparator: "title",
    model: CategoryModel,
    sync: function(method, collection, options){    
      if (method == "read"){
        // only action for a category: read
        var request = {
          op:             "getCategories",
          enable_nested:  "false"
          // we want nested ones but they will not be
          // nested yet
        };

        api.ttRssApiCall(request, function(res){
          collection.reset(res, {merge: true});
        }, true);
      } else {
        console.log("CategoriesModel.sync method called for an " +
          "unsupported method:" + method);
      }
    }
  });

  // keep a global collection
  window.categoriesModel = new CategoriesModel();


  /************* feeds ***************/


  // default model to store a feed
  var FeedModel = Backbone.Model.extend();


  // model for a collection of feeds from a category
  var FeedsModel =  Backbone.Collection.extend({
    catId: null, // nothing by default
    comparator: "title",
    model: FeedModel,

    // to get the current feed ID from the fragment
    getCurrentCatId: function(){
      var f  = Backbone.history.fragment;
      var re = /^cat(-?\d+)(\/.*)?$/;
      var id = f.replace(re, "$1");

      return parseInt(id);
    },

    sync: function(method, collection, options){    

      // current category ID
      var catId = window.feedsModel.getCurrentCatId(); 

      // only action for a category: read
      if (method == "read"){
        var request = {
          op:             "getFeeds",
          cat_id:         catId,
          include_nested: false // does not work with -4
        };

        api.ttRssApiCall(
          request,
          function(res){
            // reset collection with updated data
            collection.catId = catId;
            collection.reset(res, {merge: true});
          }, true);
      } else {
        console.log("FeedsModel.sync called for an unsupported method: " + method);
      }
    }, // sync

  });

  // keep a global collection
  window.feedsModel = new FeedsModel();




  /************ 1 article ***************/

  // model to store an article
  window.ArticleModel = Backbone.Model.extend({
    sync: function(method, model, options){
      if (method == "read"){ 
        api.ttRssApiCall(
          { op: 'getArticle',
            article_id: model.id },
          function(m){
            if (m.length == 0){
              console.log("ArticleModel.sync: recived nothing for article " +
                model.id);
              model.set("title", "Error");
              model.set("content",
                "The article with ID " + model.id + " could no be retrieved.");
            } else {
              model.set(m[0]);
            }
          }, true);
      } else if (method == "update"){
        // save attributes that changed
        _.each(_.keys(this.changed), function(att){
          this.toggle(att);
        }, this);
      } else {
        console.log("ArticleModel.sync called on an unsupported method: " + method);
      }
    },
    toggle: function(what){

      var field;
      if (what == "marked"){
        field = 0; // star
      } else if (what == "published"){
        field = 1;
      } else if (what == "unread"){
        field = 2;
      }

      /* 0 -> set to true
         1 -> set to false */
      var m = ((this.get(what)) == true ? 1 : 0 );

      if (field != null){
        api.ttRssApiCall(
          { op: 'updateArticle',
            article_ids: this.id,
            mode: m,
            field: field },
            function(m){ jQuery.noop(); } , true);
      } else {
        console.log("ArticleModel.toggle called with an " +
          "unexpected parameter : " + what);
      }
    } // toggle
  });
  


  /*********** articles *************/

  // model for a collection of articles
  var ArticlesModel =  Backbone.Collection.extend({
    model: window.ArticleModel,

    // data from this feed ID is inside
    feedId: null,
    
    // to get the current feed ID from the fragment
    getCurrentFeedId: function(){
      var f  = Backbone.history.fragment;
      var re = /^cat-?\d+\/feed(-?\d+)(\/.*)?$/;
      var id = f.replace(re, "$1");

      return parseInt(id);
    },       

    sync: function(method, collection, options) {

      if (method == "read"){
      
        var feedId = collection.getCurrentFeedId();

        var orderBy = window.settingsModel.get("articlesOldestFirst") === true ? "date_reverse" : "feed_dates";

        // we need to fetch the articles list for this feed
        var msg = {
          op:             "getHeadlines",
          show_excerpt:   false,
          view_mode:      "adaptive",
          show_content:   true,
          limit:          window.settingsModel.get("articlesNumber"),
          order_by:       orderBy
        };
        
        if (feedId == -9){
          // special case (all articles from a whole category)
          msg.feed_id = window.feedsModel.getCurrentCatId();
          msg.is_cat = true;
        } else {
          // normal case
          msg.feed_id = feedId;
        }

        api.ttRssApiCall(
          msg, function(res){
            collection.feedId = collection.getCurrentFeedId();
            collection.reset(res, {merge: true});
          }, true);
      } else {
        console.log("ArticlesModel.sync called for an unsupported method: " + method);
      }
    }, // sync()

    toggleUnread: function(){

      var articles = "";

      // do we need to mark all as read or unread?
      if (this.where({unread: true}).length > 0){
        this.where({unread: true}).forEach(
          function(m){
            m.set({unread: false})
            articles += m.id + ",";
          });
      } else {
        this.where({unread: false}).forEach(
          function(m){
            m.set({unread: true})
            articles += m.id + ",";
          });
      }

      //remove last comma
      articles = articles.substr(0, articles.length - 1);

      // we send an update event to notify the view
      this.trigger("update");

      // API call to mark as read
      api.ttRssApiCall(
        { op: 'updateArticle',
          article_ids: articles,
          mode: 2,
          field: 2 },
         function(m){ jQuery.noop(); } , true);
    }

  });

  // keep one global collection
  window.articlesModel = new ArticlesModel();



  /*********** TTRSS config ********/

  // a model to store configuration (from getConfig in the API)
  var ConfigModel = Backbone.Model.extend({
    sync: function(method, model, options){
      if (method == "read"){ 
        api.ttRssApiCall(
          {'op': 'getConfig'},
          function(m){
            model.set(m);
          }, true);
      }
    }
  });

  // global config model
  window.configModel = new ConfigModel();

  
  /*********** webapp settings ********/
  var SettingsModel = Backbone.Model.extend({
    sync: function(method, model){
      if (method == "read"){
        /* read from localStorage every attributes */
        for (var i = 0; i < window.localStorage.length; i++){
          var key = window.localStorage.key(i);
          var val = window.localStorage.getItem(key);
          if (val != null){
            if (key === "articlesOldestFirst"){
              // Convert value back from string to boolean.
              val = val == "true";
            }
            model.set(key, val);
          }
        }
      } else if (method == "update"){
        /* write to localStorage every changed attributes */
        _.each(model.changed, function(value, key, list){
          window.localStorage.setItem(key, value);
        }, this);

      } else if (method == "create"){
        // set an id to tell Backbone that the server has a copy
        model.set({id: "mySettings"});
        /* write to localStorage every attributes */
        _.each(model.attributes, function(value, key, list){
          window.localStorage.setItem(key, value);
        }, this);
      } else {
        console.warn("ConfigModel.sync called with unexpected method: " + method);
      }

    }, //sync

    defaults: {
      articlesNumber: 10,
      articlesOldestFirst: false
    },

    validate: function(attrs, options){
      // test articlesNumber
      if (attrs.articlesNumber <= 0){
        return "Must be greater than 0";
      }

      if (attrs.articlesNumber > 200){
        return "Cannot be greater than 200";
      }
    } //validate
  }); // SettingsModel

  window.settingsModel = new SettingsModel();

}); //define
