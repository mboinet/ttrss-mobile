
/***************** Models *************/
function defineModels(){


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
          enable_nested:  "true"
        };

        ttRssApiCall(request, function(res){
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

      // only action for a category: read
      if (method == "read"){
        var request = {
          op:           "getFeeds",
          cat_id:       -4/* collection.getCurrentCatId() */
        };

        ttRssApiCall(
          request,
          function(res){
            // reset collection with updated data
            collection.catId = collection.getCurrentCatId();
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
        ttRssApiCall(
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
        ttRssApiCall(
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
    comparator: "updated",
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
        if (options.more == true){
          //load more to the list
          var msg = {
           op:             "getHeadlines",
            feed_id:        collection.getCurrentFeedId(),
            show_excerpt:   false,
            view_mode:      "adaptive",
            show_content:   false,
            skip:           this.length,
            limit:          10
          };
          
          ttRssApiCall(
            msg, function(res){
              collection.add(res);
            }, true);
        } else {
          // we need to fetch the list for this feed
          var msg = {
           op:             "getHeadlines",
            feed_id:        collection.getCurrentFeedId(),
            show_excerpt:   false,
            view_mode:      "adaptive",
            show_content:   false,
            limit:          10
          };

          ttRssApiCall(
            msg, function(res){
              collection.feedId = collection.getCurrentFeedId();
              collection.reset(res, {merge: true});
            }, true);
        }
      } else {
        console.log("ArticlesModel.sync called for an unsupported method: " + method);
      }
    }

  });

  // keep one global collection
  window.articlesModel = new ArticlesModel();



  /*********** config ********/

  // a model to store configuration (from getConfig in the API)
  var ConfigModel = Backbone.Model.extend({
    sync: function(method, model, options){
      if (method == "read"){ 
        ttRssApiCall(
          {'op': 'getConfig'},
          function(m){
            model.set(m);
          }, true);
      }
    }
  });

  // global config model
  window.configModel = new ConfigModel();


} //defineModels





/************ BACKBONE views*************/

function defineViews(){

  /*********** categories *************/

  // a view for each row of a categories list
  CategoryRowView = Backbone.View.extend({
    render: function(){
      var html = listElementTpl({
        href:  '#cat' + this.model.id,
        title: this.model.get('title'),
        count: this.model.get('unread') });

      this.el.innerHTML = html;
      return this;
    },
    initialize: function() {
      this.el = document.createElement('li');
      this.listenTo(this.model, "change", this.render);
    },
    tagName: 'li'
  });

  // a view for page with all the categories
  CategoriesPageView = Backbone.View.extend({
    render: function(){

      if (this.collection.size() == 0){
        this.$lv.html(roListElementTpl({text: "Loading..."}));
      } else {
        // clean up the list
        this.$lv.empty();

        // special categories
        var special = [];
        /* categories with unread */
        var unread = [];
        /* other categories */
        var other = [];

        this.collection.forEach(function(cat){
          var row = new CategoryRowView({model:cat})
          var li = row.render();

          if (cat.id < 0){
            special.push(li.el);
          } else if (cat.get("unread") > 0){
            unread.push(li.el);
          } else {
            other.push(li.el);
          }
        }, this);
        
        if (special.length != 0){
          // we have special cat
          this.$lv.append(listSeparatorTpl({ text: 'Special' }));
          _.each(special, function(s){
            this.$lv.append(s);
          }, this);
        }

        if (unread.length != 0){
          // we have other categories
          this.$lv.append(listSeparatorTpl({ text: 'With unread articles' }));
          _.each(unread, function(u){
            this.$lv.append(u);
          }, this);
        }

        if (other.length != 0){
          // we have other categories
          this.$lv.append(listSeparatorTpl({ text: 'Categories' }));
          _.each(other, function(o){
            this.$lv.append(o);
          }, this);
        }
        
      }

      this.$lv.listview("refresh");
      return this;
    },
    initialize: function() {
      this.listenTo(this.collection, "reset", this.render);
    
      // refresh button for categories
      this.$('a.refreshButton').on('click', this, function(e){
        e.data.collection.fetch();
        $('#catPopupMenu').popup('close');
        e.preventDefault();
      });

      // store in the object a reference on the listview
      this.$lv = this.$("div:jqmData(role='content') " +
        "ul:jqmData(role='listview')");
    } // initialize
  });


  // tie the view to the listview of the categories page
  window.categoriesPageView = new CategoriesPageView({
    el: $("#categories"),
    collection: window.categoriesModel
  });


  /************ Feeds **************/

  // a view for each row of a feeds list
  FeedRowView = Backbone.View.extend({
    render: function(event){
      var html;
      
      // get the icons directory from the conf
      var iconsDir = window.configModel.get("icons_dir");

      if ((iconsDir == undefined) && (this.model.get("has_icon"))){
        // request to be notifed when icons path will be ready
        // asked by the page view
        window.configModel.once("change:icons_dir", this.render, this);
      }

      // the link src
      var link = "#" + Backbone.history.fragment + "/feed" + this.model.id;

      if ((iconsDir == undefined) || (! this.model.get("has_icon"))){
        // we can't display with icons or dot not need them

        html = listElementTpl({
          href: link,
          title: this.model.get('title'),
          count: this.model.get('unread')
        });

      } else {
        // we add an icon
        var iconSrc = window.apiPath + iconsDir + "/" + this.model.id + ".ico";

        html = listElementWithIconTpl({
          href: link,
          title: this.model.get('title'),
          count: this.model.get('unread'),
          src: iconSrc
        });
      }

      this.el.innerHTML = html;

      // refresh the listview
      var $lv = window.feedsPageView.$("div:jqmData(role='content') " +
        "ul:jqmData(role='listview')");

      $lv.listview("refresh");

      return this;
    },
    initialize: function() {
      this.el = document.createElement('li');
      this.listenTo(this.model, "change", this.render);
    },
    tagName: 'li'
  });



  // a view for the page of the list of feeds of a category
  var FeedsPageView = Backbone.View.extend({

    // callback to render the title in the header
    renderTitle: function(){
      // placeholder for the title of the category
      var $h1Tag = this.$("div:jqmData(role='header') h1");

      // catId on the fragment
      var catId = this.collection.getCurrentCatId();

      // cat model
      var catModel = window.categoriesModel.get(catId);
      
      if (catModel != undefined){
        // title is available now
        $h1Tag.html(catModel.get("title"));
      } else {
        // default title
        $h1Tag.html("Feeds");
      }
    }, // renderTitle

    // callback to render the list of feeds of a category
    renderList: function(){

      // data for the listview
      var lvData = "";

      // real category ID
      var id = window.feedsModel.getCurrentCatId();

      if (this.collection.catId != id){
        // it's loading right now, we don't have any cached data
        lvData = roListElementTpl({text: "Loading..."});
      } else {
        // we have data from the good collection, updated or not

        // an array of the models for this category
        var feeds = this.collection.where({cat_id: id});

        if (feeds.length == 0){
          // no elements in the collection
          if (id == -2){
            lvData = roListElementTpl({text: "No labels"});
          } else {
            lvData = roListElementTpl({text: "No feeds"});
          }
        } else {
          // we can add list elements

          // feeds with unread
          var unread = "";
          feeds.forEach(function(feed){
            if (feed.get("unread") > 0){
              var row = new FeedRowView({model:feed})
              var li = row.render();
              unread += li.el.outerHTML;
            }
          }, this);

          // other feeds
          var other = "";
          feeds.forEach(function(feed){          
            if (feed.get("unread") <= 0){
              var row = new FeedRowView({model: feed})
              var li = row.render();
              other += li.el.outerHTML;
            }
          }, this);

          // separator
          if ((other != "") && (unread != "")){
            lvData += listSeparatorTpl({ text: 'With unread' });
          } 

          lvData += unread;

          // separator
          if ((unread != "") && (other != "")){
              lvData += listSeparatorTpl({ text: 'Other feeds' });
          }
          lvData += other;
        }
      }

      this.$lv.html(lvData);
      this.$lv.listview('refresh');

      return this;
    }, // renderList

    render: function(){

      this.renderTitle();
      this.renderList();
      
      // get the icons directory from the conf
      if (! window.configModel.has("icons_dir")){
        window.configModel.fetch();
      }
        
      if (window.categoriesModel.length == 0){
        // request the categories and ask to be notified once
        window.categoriesModel.once("reset", this.renderTitle, this);
        window.categoriesModel.fetch();
      }

      return this;
    }, // render


    initialize: function(){
      // re-render the list when 
      this.listenTo(this.collection, "reset", this.renderList);
     
      // register refresh button for feeds
      this.$("a.refreshButton").on(
        // this is on from jQuery
        "click",
        this,
        function(e){
          e.data.collection.fetch();
          $('#feedsMenuPopup').popup('close');
          e.preventDefault();
        }
      );

      // listview div
      this.$lv = this.$("div:jqmData(role='content') " +
        "ul:jqmData(role='listview')");
    } // initialize
    
  }); //FeedsPageView

  // global object for the view
  window.feedsPageView = new FeedsPageView({
    el: $("#feeds"),
    collection: window.feedsModel
  });




  /*************** Articles *************/

  // a view for each row (article) of a feeds list
  var ArticleRowView = Backbone.View.extend({

    render: function(event){
      var link = "#" + Backbone.history.fragment +
        "/art" + this.model.id;

      var date = new Date(this.model.get("updated") * 1000);
      var now = new Date(Date.now());

      // date in YYYY/MM/DD
      var dateStr = date.getDate() + '/' + (date.getMonth() + 1) + '/' + date.getFullYear();

      // time in HH:MM
      var min = date.getMinutes();
      var  timeStr = date.getHours() + ':' + ( (min > 9) ? min : '0' + min );

      // nom in YYYY/MM/DD
      var nowStr = now.getDate() + '/' + (now.getMonth() + 1) + '/' + now.getFullYear();

      if (dateStr == nowStr){
        // only time if it's today
        dateStr = timeStr;
      } else {
        dateStr = dateStr + " " + timeStr;
      }


      var html;
      var catId = window.feedsModel.getCurrentCatId();
      var feedModel = window.feedsModel.get(this.model.get("feed_id"));

      if (this.model.get("unread")){
        if ((catId >= 0) || (feedModel == undefined)){
          // normal cat, we know the feed name
          html = articleLiElementTpl({
            href:  link,
            date:  dateStr,
            title: this.model.get('title') });
        } else {
          // special cat, we show the feed name
          html = articleFeedLiElementTpl({
            href:  link,
            date:  dateStr,
            title: this.model.get('title'),
            feed: feedModel.get("title") });
        }
      } else {
        //read article
        if ((catId >= 0) || (feedModel == undefined)){
          // normal cat, we know the feed name
          html = articleReadLiElementTpl({
            href:  link,
            date:  dateStr,
            title: this.model.get('title') });
        } else {
          // special cat, we show the feed name
          html = articleReadFeedLiElementTpl({
            href:  link,
            date:  dateStr,
            title: this.model.get('title'),
            feed: feedModel.get("title") });
        }
      }

      this.el.innerHTML = html;

      return this;
    },
    initialize: function() {
      this.el = document.createElement('li');
      this.listenTo(this.model, "change", this.render);
    },
    tagName: 'li'
  });
 

  // a view for the page with the list of articles of a feed
  var ArticlesPageView = Backbone.View.extend({

    // callback to update the href of the back button
    renderBackButton: function(){
      // back button href
      var href = Backbone.history.fragment;
      href = "#" + href.substr(0, href.lastIndexOf("/"));

      this.$("div:jqmData(role='header') a:first").attr("href", href);
    },

    // callback to render the title in the header
    renderTitle: function(){

      // catId on the fragment
      var feedId = this.collection.getCurrentFeedId();
      
      // placeholder for the title of the category
      var $h1Tag = this.$("div:jqmData(role='header') h1");

      // feed model
      var feedModel = window.feedsModel.get(feedId);
      
      if (feedModel == undefined){
        // default title
        $h1Tag.html("Articles");

      } else {
        // title is available now
        $h1Tag.html(feedModel.get("title"));
      }
    }, // renderTitle

    // callback to render the listview of articles of a feed
    renderList: function(){

      // data to add to the listview
      var lData = "";

      // real feed ID
      var id = window.articlesModel.getCurrentFeedId();

      if (this.collection.feedId != id){
        // it's loading right now, we don't have any cached data
        lData += roListElementTpl({text: "Loading..."});

        // waiting to be notified a second time
      } else {
        // we have data from the good collection, updated or not

        if (this.collection.length == 0){
          // no elements in the collection
          lData += roListElementTpl({text: "No articles"});
        } else {
          // we can add list elements

          this.collection.forEach(function(article){          
            var row = new ArticleRowView({model: article})
            var li = row.render();
            lData += li.el.outerHTML;
          }, this);

          // TODO check if there is more to load
        }
      }
      this.$lv.html(lData);
      this.$lv.listview('refresh');

      return this;
    }, // renderList

    // callback to render the title in the header
    render: function(){

      this.renderBackButton();
      this.renderTitle();
      this.renderList();

      if (window.feedsModel.length == 0){
        // ask to be notified when a feed is added
        window.feedsModel.once("reset", this.renderTitle, this);
        window.feedsModel.once("reset", this.renderList, this);
        window.feedsModel.fetch();
      }

      return this;
    },

    initialize: function(){

      // render the list when elements are added or removed
      this.listenTo(this.collection, "reset", this.renderList);

      // register refresh button clicks
      this.$('a.refreshButton').on(
        'click',
        this,
        function(e){
          e.data.collection.fetch();
          $("#artMenuPopup").popup('close');
          e.preventDefault();
        }
      );

      // listview div
      this.$lv = this.$("div:jqmData(role='content') " +
        "ul:jqmData(role='listview')");
    } // initialize
    
  }); //ArticlesPageView

  window.articlesPageView = new ArticlesPageView({
    el: $("#articles"),
    collection: window.articlesModel
  });


  /************** 1 ARTICLE view, reading **************/

  var ArticlePageView = Backbone.View.extend({

    // callback to render the title in the head
    renderTitle: function(){

      if (this.model.has("title")){
        // title is available now
        var $h1Tag = this.$("div:jqmData(role='header') h1");
        $h1Tag.html(this.model.get("title"));
      } else {
        // title will be fetch and we'll be notified by the model
        this.model.once("change:title", this.renderTitle, this);
      }
    }, // renderTitle

    render: function(){

      // back button
      this.renderBackButton();

      // title update
      this.renderTitle();
        
      // content part
      this.renderContent();

      // unread toggle
      this.renderUnreadToggleButton();
      this.listenTo(this.model, "change:unread", this.renderUnreadToggleButton);
      
      // unread toggle
      this.renderStarredToggleButton();
      this.listenTo(this.model, "change:marked", this.renderStarredToggleButton);
      
      // unread toggle
      this.renderPublishToggleButton();
      this.listenTo(this.model, "change:published", this.renderPublishToggleButton);

      return this;
    },

    // callback to update the href of the back button
    renderBackButton: function(){
      // back button href
      var href = Backbone.history.fragment;
      href = "#" + href.substr(0, href.lastIndexOf("/"));

      this.$("div:jqmData(role='header') a:first").attr("href", href);
    },



    // this callback can be called as a method or an event callback
    renderContent: function(event){

      // the div for the data
      var $contentDiv = this.$("div:jqmData(role='content')");

      if (this.model.has("content")){
        // this article is ready to be fully displayed

        var article = "";

        // TODO: feed name & publish date
    
        // add a title link
        article = articleTitleTpl({
          href:  this.model.get("link"),
          title: this.model.get("title")
        });

        // add real content
        article += "<div>" + this.model.get("content") + "</div>";

        // apply content filters
        article = cleanArticle(article, this.model.get("link"));

        $contentDiv.html(article).trigger('create');

        // add previous/next links at the bottom
        if (window.articlesModel.length == 0){
          // collection empty, update it
          window.articlesModel.once("reset", this.renderPrevNext, this);
          window.articlesModel.fetch();
        } else {
          this.renderPrevNext();
        }
        
        // mark as read and save it to the backend
        this.model.set({ unread: false });
        this.model.save();

      } else {
        // no content yet, waiting to be notified
        $contentDiv.html(articleLoadingTpl({msg: "Loading..."}));
        this.model.once("change:content", this.renderContent, this);
      }
    }, // renderContent

    renderUnreadToggleButton: function(){
      var but = this.$("a.toggleUnreadButton");

      if (this.model.get("unread")){
        but.html("Mark as read");
      } else {
        but.html("Mark as unread");
      }

    },
    
    renderStarredToggleButton: function(){
      var but = this.$("a.toggleStarredButton");

      if (this.model.get("marked")){
        but.html("Remove star");
      } else {
        but.html("Mark as starred");
      }

    },

    renderPublishToggleButton: function(){
      var but = this.$("a.togglePublishButton");

      if (this.model.get("published")){
        but.html("Unpublish");
      } else {
        but.html("Publish");
      }

    },

    renderPrevNext: function(){
      // html to add
      var html = "";

      // is the article in the collection
      var m = window.articlesModel.get(this.model.id);
      if (m == null){
        return;
      }

      var index = window.articlesModel.indexOf(m);
      if (index == -1){
        // nothing to do, article not in the collection
        return ;
      }

      // base link
      var ln = "#" + Backbone.history.fragment;
      ln = ln.substring(0, ln.lastIndexOf("art") + 3);

      if (index > 0){
        // do we have a previous article?
        var prevArt = window.articlesModel.at(index - 1);

        html += gridLeftButtonTpl({
          href:   ln + prevArt.id,
          cl:  "",
          title:  prevArt.get("title")
        });
        

      } else {
        // disabled button
        html += gridLeftButtonTpl({
          href:   "#",
          cl:  "ui-disabled",
          title:  ""
        });
      }

      if (index + 1 < window.articlesModel.length){
        // do we have a next article?
        var nextArt = window.articlesModel.at(index + 1);

        html += gridRightButtonTpl({
          href:   ln + nextArt.id,
          cl:  "",
          title:  nextArt.get("title")
        });
      } else {
        // disabled button
        html += gridRightButtonTpl({
          href:   "#",
          cl:  "ui-disabled",
          title:  ""
        });
      }

      // we now have the HTML ready, add it to the content
      this.$("div:jqmData(role='content')")
        .append(html).trigger('create');

    },

    initialize: function(){

      // mark as unread button on an article
      this.$('a.toggleUnreadButton').on('click', this, function(e){
        var artModel = e.data.model;
        artModel.set("unread", ! artModel.get("unread"));
        artModel.save();
        $('#readPopupMenu').popup('close');
        e.preventDefault();
      });

      // mark as starred button on an article
      this.$('a.toggleStarredButton').on('click', this, function(e){
        var artModel = e.data.model;
        artModel.set("marked", ! artModel.get("marked"));
        artModel.save();
        $('#readPopupMenu').popup('close');
        e.preventDefault();
      });

      // publish button on an article
      this.$('a.togglePublishButton').on('click', this, function(e){
        var artModel = e.data.model;
        artModel.set("published", ! artModel.get("published"));
        artModel.save();
        $('#readPopupMenu').popup('close');
        e.preventDefault();
      });

      // store a reference on the listview
      this.$lv = this.$("div:jqmData(role='content') " +
        "ul:jqmData(role='listview')");
    } // initialize

  }); // ArticlePageView

  window.articlePageView = new ArticlePageView({
    el: $("#read")
  });
  
} // defineViews



/************** underscore templates ************/
var listSeparatorTpl;
var listElementTpl;
var listElementWithIconTpl;
var listLoadMoreTpl;
var roListElementTpl;
var articleLiElementTpl;
var articleFeedLiElementTpl;
var articleReadLiElementTpl;
var articleReadFeedLiElementTpl;
var articleLoadingTpl;
var articleTitleTpl;

function compileTemplates(){
  // a jQuery listview separator element
  listSeparatorTpl = _.template('<li data-role="list-divider"><%= text %></li>');

  // a jQuery listview link element (to put inside a li)
  listElementTpl   = _.template('<a href="<%= href %>">' +
                                '<%= title %>' +
                                '<span class="ui-li-count"><%= count %></span>' +
                                '</a>');

  // a jQuery listview link element with icon (to put inside a li)
  listElementWithIconTpl   = _.template('<a href="<%= href %>">' +
                                '<img src="<%= src %>" class="ui-li-icon"></img>' +
                                '<%= title %>' +
                                '<span class="ui-li-count"><%= count %></span>' +
                                '</a>');
                                
  // a jQuery listview read-only element
  roListElementTpl = _.template('<li class="ui-li-static"><%= text %></li>');

  //
  listLoadMoreTpl = _.template('<li data-theme="b"><a class="loadMoreButton" href="#">' +
                               '<h2>Load more articles...</h2></a></li>');


  // the content of a LI element for an article
  articleLiElementTpl = _.template('<a href="<%= href %>">' +
    '<h3><%= title %></h3>' +
    '<p class="ui-li-desc"><%= date %></p></a>');

  // the content of a LI element for an article with the feed Name
  articleFeedLiElementTpl = _.template('<a href="<%= href %>">' +
    '<h3><%= title %></h3>' +
    '<p class="ul-li-desc"><strong><%= feed %></strong></p>' +
    '<p class="ui-li-desc"><%= date %></p></a>');

  // the content of a LI element for a read article
  articleReadLiElementTpl = _.template('<a href="<%= href %>">' +
    '<h3><%= title %></h3>' +
    '<p class="ui-li-desc"><%= date %>&nbsp;&ndash;&nbsp;<em>already read</em></p></a>');

  // the content of a LI element for a read article with the feed Name
  articleReadFeedLiElementTpl = _.template('<a href="<%= href %>">' +
    '<h3><%= title %></h3>' +
    '<p class="ul-li-desc"><strong><%= feed %></strong></p>' +
    '<p class="ui-li-desc"><%= date %>&nbsp;&ndash;&nbsp;<em>already read</em></p></a>');

  // the content of the content DIV when an article is loading
  articleLoadingTpl = _.template('<h3><%= msg %></h3>');

  // the content of the content DIV when an article is loading
  articleTitleTpl = _.template('<h2><a href="<%= href %>" target="_blank"><%= title %></a></h2>');

  // button for the prev/next
  gridLeftButtonTpl = _.template('<div class="ui-grid-a">' +
    '<div class="ui-block-a">' +
    '<a data-role="button" data-icon="arrow-l" href="<%= href %>" class="<%= cl %>">previous</a>' +
    '<em><%= title %></em></div>');
  gridRightButtonTpl = _.template('<div class="ui-block-b">' +
    '<a data-role="button" data-icon="arrow-r" data-iconpos="right" href="<%= href %>" class="<%= cl %>">next</a>' +
    '<em><%= title %></em></div>' +
    '</div>');
  
}



/*************** BACKBONE Router ************/

// to define the Backbone router of the webapp
function defineRouter(){
  MyRouter = Backbone.Router.extend({

    routes: {
      "login":                  "login",       // #login
      "":                       "categories",  // #
      "cat:catId":              "feeds",       // #cat4
      "cat:catId/feed:feedId":  "articles",    // #cat4/feed23
      "cat:catId/feed:feedId/art:artId":  "read",        // #cat4/feed23/art1234
      "*path":                  "defaultRoute" // #*
    },

    defaultRoute: function(path){
      if (! isLoggedIn()){
        window.myRouter.navigate('login', {trigger: true});
      } else {
        window.myRouter.navigate('', {trigger: true});
      }
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
        window.myRouter.navigate('', {trigger: true});
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
        window.myRouter.navigate('', {trigger: true});
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
        // id invalid
        window.myRouter.navigate('', {trigger: true});
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

        // tell the model to get all the article data
        art.fetch();
      }
    },

    transitionOptions: {},
    setNextTransOptions : function(obj){
      this.transitionOptions = obj;
    },

    goto: function(page){
      $.mobile.changePage(page, this.transitionOptions);

      // reset transitions options
      this.transitionOptions = {};

    } // goto

  });

  window.myRouter = new MyRouter();
}


/************* utilities ***********/
// to check the start of a string
if (typeof String.prototype.startsWith != 'function') {
  String.prototype.startsWith = function (str){
    return this.indexOf(str) == 0;
  };
}



// clean up a dom object (article to display)
function cleanArticle(content, domain){
  var $dom = $(content);

  /* ARS Technica styles DIVs */
  $dom.find('div').removeAttr('style');
  
  /* ARS technica bookmarks */
  $dom.find('div.feedflare').remove();
  
  /* Feedburner images */
  $dom.find('img[href~="feedburner"]').remove();
  
  
  var $toClean = $dom.find('img,object,iframe');
  $toClean.removeAttr('height');
    
  $toClean.each(
    function(index, e){
         
      // if relativeURL, add domain
      var src = $(e).attr('src');
      if ($.mobile.path.isRelativeUrl(src)){
        var newsrc = $.mobile.path.makeUrlAbsolute(
          src,
          domain
        );
        $(e).attr('src', newsrc);
      }      
            
      // if no width, set to 100%
      if ($(e).attr('width') == undefined){
        $(e).attr("width", '100%');
      } else {
        // images to 100% width if larger than possible        
        
        var imgW = e.getAttribute("width");
        var divW = $(window).width();
        if (imgW > divW){
          $(e).width('100%');
        }
      }            
    }
  );

  // make all links open in a new tab
  $toClean = $dom.find('a');
  $toClean.each(
    function(index, e){
      $(e).attr('target', '_blank');
    }
  );

  // objects size
  $dom.find('img').removeAttr('height');
  $dom.find('object').attr('width', '100%');
  $dom.find('object').removeAttr('height');
  $dom.find('iframe').attr('width', '100%');
  $dom.find('iframe').removeAttr('height'); 

  return $dom;
}




/* function to call TTRSS
  - req => the request as a JSON object
  - success => the success callback (one param the content)
  - async => async call? */
function ttRssApiCall(req, success, async){
  jQuery.ajax(
    {
      url: window.apiPath + 'api/',
      contentType: "application/json",
      dataType: 'json',
      cache: 'false',
      data: JSON.stringify(req),
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
}


/* Most of the calls (except login, logout, isLoggedIn)
  require valid login session or will return this
  error object: {"error":"NOT_LOGGED_IN"} */
function apiErrorHandler(msg){
  if (msg.error == "NOT_LOGGED_IN"){
    /* TODO, store the previous location to redirect uses
      when they log in */
    window.myRouter.navigate('login', {trigger: true});
  } else {
    alert('apiErrorHandler\nUnknown API error message' + msg.error);
  }
}

function ajaxErrorHandler(event, jqXHR, ajaxSettings, thrownError){
  // TODO
  alert('ajaxErrorHandler' + thrownError);
}

/* to make a logout call */
function logout(){
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
}

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
        url: window.apiPath + 'api/',
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
        window.myRouter.setNextTransOptions({reverse: true, transition: "slideup"});
        window.myRouter.navigate('cat', {trigger: true});
      } else {
        var msg = 'Unknown answer from the API:' + data.content;
        if (data.content == 'API_DISABLED'){
          msg = 'API is disabled for this user.';
        } else if (data.content = 'LOGIN_ERROR'){
          msg = 'Specified username and password are incorrect.';
        }
        alert(msg);
        $.mobile.loading('hide');
      }
    });
  }); // login button
}


function isLoggedIn(){
  var msg = {
    'op': 'isLoggedIn'
  };

  var loggedIn;

  jQuery.ajax(
    {
      url: window.apiPath + 'api/',
      contentType: "application/json",
      dataType: 'json',
      cache: 'false',
      data: JSON.stringify(msg),
      type: 'post',
      async: false
    }
  )
  .done(function(data){
    if (data.status == 0){
      loggedIn = data.content.status;
    } else {
      apiErrorHandler (data.content);
    }
  });

  return loggedIn;

} // isLoggedIn


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
    
    // events for login page
    registerLoginPageActions();

    // my handler for AJAX errors
    $(document).ajaxError(ajaxErrorHandler);

    // underscore.js
    compileTemplates();

    // backbone.js
    defineModels();
    defineViews();
    defineRouter();

    // initialize all logout buttons
    $('a.logoutButton').on('click',
      function(e){
        e.preventDefault();
        $.mobile.loading( 'show', { text: 'Logging out...', textVisible: true} );
        logout();
      }
    );

    // initialize all logout buttons
    $('a.backButton').on('click',
      function(e){
        window.myRouter.setNextTransOptions({reverse: true});
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
    window.myRouter.setNextTransOptions({transition: "fade"});
    
    // start Backbone router
    if (!Backbone.history.start({pushState: false, root: window.webappPath, silent: false})){
      alert("Could not start router!");
    }

  }
});

