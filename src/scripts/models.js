
/***************** Models *************/
define(['api','backbone','utils'],
       function(api, Backbone, utils){

  /*********** webapp settings ********/
  var Settings = Backbone.Model.extend({
    sync: function(method, model){
      if (method == "read"){
        /* read from localStorage every attributes */
        for (var i = 0; i < window.localStorage.length; i++){
          var key = window.localStorage.key(i);
          var val = window.localStorage.getItem(key);

          // convert booleans values from string
          if (val == "true" || val == "false"){
            val = (val == "true");
          }

          model.set(key, val);
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
        utils.log("Settings.sync called with unexpected method: " + method);
      }

    }, //sync

    defaults: {
      articlesNumber: 10,
      articlesOldestFirst: false,
      onlyUnread: false
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
  }); // Settings

  // Settings as a variable to be available for other functions
  var settings = new Settings();

  /************ categories ***********/
 
  // default model to store a category
  var CategoryModel = Backbone.Model.extend();

  // model for a collection of categories
  var CategoriesModel =  Backbone.Collection.extend({

    comparator: function(cat1, cat2){
      // Special comes first, then by title
      
      if ((cat1.id < 0) && (cat2.id >= 0)){
        // cat1 is special
        return -1;
      } else if ((cat1.id >= 0) && (cat2.id < 0)){
        // cat2 is special
        return 1;
      } else {
        return cat1.get("title").localeCompare(cat2.get("title"));
      }

    }, //comparator

    model: CategoryModel,
    sync: function(method, collection, options){    
      if (method == "read"){
        // only action for a category: read
        var request = {
          op:             "getCategories",
          enable_nested:  "false", // we want nested ones but they will not be nested yet
          unread_only:    settings.attributes.onlyUnread // get only feeds with unread articles
        };

        api.ttRssApiCall(request, function(res){
          // efficiently set the collection
          collection.set(res);

          // notify by a sync that the sync worked
          collection.trigger('sync');
        }, true);

      } else {
        utils.log("CategoriesModel.sync method called for an " +
          "unsupported method:" + method);
      }
    }
  });


  /************* feeds ***************/


  // default model to store a feed
  var FeedModel = Backbone.Model.extend();


  // model for a collection of feeds from a category
  var FeedsModel =  Backbone.Collection.extend({
    comparator: "title",

    model: FeedModel,

    sync: function(method, collection, options){    

      // current category ID
      var catId = utils.getCurrentCatId(); 

      // only action for a category: read
      if (method == "read"){
        var request = {
          op:             "getFeeds",
          cat_id:         catId,
          include_nested: false,
          unread_only: settings.attributes.onlyUnread     // get only feeds with unread articles
        };

        api.ttRssApiCall(
          request,
          function(res){
            // set collection with updated data
            collection.set(res);

            // notify by a sync that the sync worked
            collection.trigger('sync');
          }, true);
      } else {
        utils.log("FeedsModel.sync called for an unsupported method: " + method);
      }
    }, // sync

  });

  var feedsModel = new FeedsModel();


  /************ 1 article ***************/

  // model to store an article
  var ArticleModel = Backbone.Model.extend({

    sync: function(method, model, options){
      if (method == "read"){ 
        api.ttRssApiCall(
          { op: 'getArticle',
            article_id: model.id },
          function(m){

            if (m.length == 0){
              utils.log("ArticleModel.sync: received nothing for article " +
                model.id);
              model.set("title", "Error");
              model.set("content",
                "The article with ID " + model.id + " could no be retrieved.");
            } else {

              model.set(m[0]);

              // add the model in the collection if needed
              if (!articlesModel.get(model.id)){
                articlesModel.add([model]);
              }

              model.trigger("sync");
            }
          }, true);
      } else if (method == "update"){
        // save attributes that changed
        _.each(_.keys(this.changed), function(att){
          this.toggle(att);
        }, this);

        model.trigger("sync");
      } else {
        utils.log("ArticleModel.sync called on an unsupported method: " + method);
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
        utils.log("ArticleModel.toggle called with an " +
          "unexpected parameter : " + what);
      }
    }, // toggle

    unreadChanged: function(){

      var prevVal = this.previous("unread");
      var newVal = this.get("unread");

      if ((prevVal != undefined) &&
          (prevVal != newVal)){

        // try to update the parent models of the unread count
        var count = new Number((newVal ? 1 : -1));

        // update feed count
        var feedModel = feedsModel.get(utils.getCurrentFeedId());
        if (feedModel){
          var unread = new Number(feedModel.get("unread"));
          feedModel.set({unread: unread + count});
        }
      }

    }, //unreadChanged

    initialize: function(){

      // be notified when unread changed
      this.on("change:unread", this.unreadChanged, this);

    } //initialize

  });
  


  /*********** articles *************/

  // model for a collection of articles
  var ArticlesModel =  Backbone.Collection.extend({
    model: ArticleModel,

    // the feedId of the data in the collection
    // useful in the case we're in a special category
    // that regroup multiple feeds
    feedId: null,

    sync: function(method, collection, options) {

      if (method == "read"){
      
        var feedId = utils.getCurrentFeedId();

        var orderBy = settings.get("articlesOldestFirst") === true ? "date_reverse" : "feed_dates";

        // set view_mode depending on options
        var viewMode = settings.get("onlyUnread") ? "unread" : "adaptive";

        // we need to fetch the articles list for this feed
        var msg = {
          op:             "getHeadlines",
          show_excerpt:   false,
          view_mode:      viewMode,
          show_content:   true,
          limit:          settings.get("articlesNumber"),
          order_by:       orderBy
        };
        
        if (feedId == -9){
          // special case (all articles from a whole category)
          msg.feed_id = utils.getCurrentCatId();
          msg.is_cat = true;
        } else {
          // normal case
          msg.feed_id = feedId;
        }

        api.ttRssApiCall(
          msg, function(res){

            if (collection.feedId != feedId){
              /* this is another feed, force a clean
                to trigger delete/add events */
              collection.set([]);
            }

            // efficiently set the collection
            collection.set(res);
          
            // store the feedId of the collection
            collection.feedId = feedId;

            // notify by a sync that the sync worked
            collection.trigger('sync');
          }, true);
      } else {
        utils.log("ArticlesModel.sync called for an unsupported method: " + method);
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

      var collection = this;

      // API call to mark as read
      api.ttRssApiCall(
        { op: 'updateArticle',
          article_ids: articles,
          mode: 2,
          field: 2 },
         function(m){ 
           // notify by a sync that the sync worked
           collection.trigger('sync');
         } , true);
    },


    onUnreadChange: function(model){

      if (settings.get("onlyUnread") &&
           ! model.get("unread")) {
        // A model was marked as read in onlyUnread mode

        this.remove(model);
      }

    }, //onUnreadUpdate

    initialize: function(){

      // listen for unread changes
      this.on("change:unread", this.onUnreadChange, this);

    } //initialize

  }); // ArticlesModel

  var articlesModel = new ArticlesModel();




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


  return {
    
    categoriesModel: new CategoriesModel(),
    feedsModel: feedsModel,
    articlesModel: articlesModel,
    configModel: new ConfigModel(),
    settingsModel: settings,
    article: ArticleModel

  }

}); //define
