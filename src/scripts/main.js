

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

requirejs(['jquery','backbone','templates','conf','models','utils','router','api'],
  function($, Backbone, tpl, conf, models, utils, router, api){



/************ BACKBONE views*************/

function defineViews(){

  /*********** categories *************/

  // a view for each row of a categories list
  CategoryRowView = Backbone.View.extend({
    render: function(){
      var html = tpl.listElement({
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
        this.$lv.html(tpl.roListElement({text: "Loading..."}));
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
          this.$lv.append(tpl.listSeparator({ text: 'Special' }));
          _.each(special, function(s){
            this.$lv.append(s);
          }, this);
        }

        if (unread.length != 0){
          // we have other categories
          this.$lv.append(tpl.listSeparator({ text: 'With unread articles' }));
          _.each(unread, function(u){
            this.$lv.append(u);
          }, this);
        }

        if (other.length != 0){
          // we have other categories
          this.$lv.append(tpl.listSeparator({ text: 'Categories' }));
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
        // we can't display with icons or do not need them

        html = tpl.listElement({
          href: link,
          title: this.model.get('title'),
          count: this.model.get('unread')
        });

      } else {
        // we add an icon
        var iconSrc = window.apiPath + iconsDir + "/" + this.model.id + ".ico";

        html = tpl.listElementWithIcon({
          href: link,
          title: this.model.get('title'),
          count: this.model.get('unread'),
          src: iconSrc
        });
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
        lvData = tpl.roListElement({text: "Loading..."});
      } else {
        // we have data from the good collection, updated or not

        // an array of the models for this category
        var feeds = this.collection.where({cat_id: id})

        if (feeds.length == 0){
          // no elements in the collection
          if (id == -2){
            lvData = tpl.roListElement({text: "No labels"});
          } else {
            lvData = tpl.roListElement({text: "No feeds"});
          }
        } else {
          // we can add list elements
          var unreadCount = 0;
          
          // feeds with unread
          var unread = "";
          feeds.forEach(function(feed){
            var count = feed.get("unread");
            if (count > 0){
              var row = new FeedRowView({model:feed})
              var li = row.render();
              unread += li.el.outerHTML;
              unreadCount += count;
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

          // the all feeds link (-9 is its special ID)
          var all = "";
          if (((id <= -10) || (id >= 0)) &&
               (this.collection.length > 1)) {
            // only when on real categories or labels
            // and when there are more than 1 feed
            all += "<li>" + tpl.listElement({
              href:  "#" + Backbone.history.fragment + "/feed-9",
              title: "All",
              count: unreadCount
            }) + "</li>";
          }
          

          // unread separator
          if ((unread != "") && ((other != "")||(all != ""))){
            unread = tpl.listSeparator({ text: 'With unread' }) + unread;
          }

          // other separator
          if ((other != "") && ((unread != "") || (all != ""))){
              other = tpl.listSeparator({ text: 'Already read' }) + other;
          }      

          // we add everything to the view
          lvData = all + unread + other;
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

      var dateStr = utils.updateTimeToString(this.model.get("updated"));

      var html;
      var catId = window.feedsModel.getCurrentCatId();
      var feedId = window.articlesModel.getCurrentFeedId();
      var feedTitle = this.model.get("feed_title");
      var unread = this.model.get("unread");

      if (((catId >= 0) && (feedId != -9)) || (feedTitle == undefined)){
        // normal cat, we don't need to show the feed name (it's in the header)
        // or we don't have it yet

        if (unread){
          html = tpl.articleLiElement({
            href:  link,
            date:  dateStr,
            title: this.model.get('title') });
        } else {
          // already read
          html = tpl.articleReadLiElement({
            href:  link,
            date:  dateStr,
            title: this.model.get('title') });
        }

      } else {
        // special cat, we show the feed name

        if (unread){
          html = tpl.articleFeedLiElement({
            href:  link,
            date:  dateStr,
            title: this.model.get('title'),
            feed: feedTitle });
        } else {
          html = tpl.articleReadFeedLiElement({
            href:  link,
            date:  dateStr,
            title: this.model.get('title'),
            feed: feedTitle });
        }
      }

      this.el.innerHTML = html;

      return this;
    }, // render

    initialize: function() {
      this.el = document.createElement('li');
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
      var feedId = window.articlesModel.getCurrentFeedId();
      
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
        lData += tpl.roListElement({text: "Loading..."});

        // waiting to be notified a second time
      } else {
        // we have data from the good collection, updated or not

        if (this.collection.length == 0){
          // no elements in the collection
          lData += tpl.roListElement({text: "No articles"});
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

    renderMarkAllButton: function(){
      var but = this.$("a.toggleUnreadButton");

      if (this.collection.length == 0){
        // disable button, no articles in the list
        but.addClass("ui-disabled");
        but.html("Mark all as ?");
      } else {
        but.removeClass("ui-disabled");
        if (this.collection.where({unread: true}).length > 0){
          but.html("Mark all as read");
        } else {
          but.html("Mark all as unread");
        }
      }
    },

    // callback to render the title in the header
    render: function(){

      this.renderBackButton();
      this.renderTitle();
      this.renderList();
      this.renderMarkAllButton();

      /* if the feed model isn't available, we need to
      fetch it and update the title when it will be
      ready */
      var feedModel = window.feedsModel.get(
        window.articlesModel.getCurrentFeedId());
      if (feedModel == undefined){
        window.feedsModel.once("reset", this.renderTitle, this);
        window.feedsModel.fetch();
      }

      return this;
    },

    initialize: function(){

      // render the list when elements are added or removed
      this.listenTo(this.collection, "reset", this.renderList);
      this.listenTo(this.collection, "update", this.renderList);

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

      // register mark all as read button
      this.$('a.toggleUnreadButton').on(
        'click',
        this,
        function(e){

          e.data.collection.toggleUnread();
          $("#artMenuPopup").popup('close');
          e.preventDefault();
        }
      );

      // render the mark all button every time the collection
      // change
      this.listenTo(this.collection, "reset", this.renderMarkAllButton);
      this.listenTo(this.collection, "change", this.renderMarkAllButton);
      this.listenTo(this.collection, "update", this.renderMarkAllButton);

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

    render: function(){

      // back button
      this.renderBackButton();

      // header with link, update info & feed
      this.listenTo(this.model, "change:title", this.renderContentHeader);
      this.renderContentHeader();

      var feedModel = window.feedsModel.get(this.model.get("feed_id"));
      if (feedModel == undefined){
        // we don't have the feed name
        window.feedsModel.once("reset", this.renderContentHeader, this);
        window.feedsModel.fetch();
      }
        
      // content part, article
      this.listenTo(this.model, "change:content", this.renderContentHeader);
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


    renderContentHeader: function(){
      var $headerDiv = this.$("div:jqmData(role='content') > div.header");

      if ($headerDiv.length == 0){
        // no div yet
        this.$("div:jqmData(role='content')").prepend("<div class=\"header\"></div>");
        $headerDiv = this.$("div:jqmData(role='content') > div.header");
      }

      var link = this.model.get("link");
      if (! link){
        link = "";
      }

      var title = this.model.get("title");
      if (! title){
        title = "Title loading...";
      }

      var feedTitle = this.model.get("feed_title");
      if (feedTitle == undefined){
        // no attribute, we need to fetch the title from the feedModel
        var feedModel = window.feedsModel.get(this.model.get("feed_id"));
        if (feedModel == undefined){
          feedTitle = "loading...";
        } else {
          feedTitle = feedModel.get("title");
        }
      }

      var time = this.model.get("updated");
      if (! time){
        time = "loading...";
      } else {
        time = utils.updateTimeToString(time);
      }

      var updTxt = "Published: ";
      if (this.model.get("is_updated")){
        updTxt = "Updated: "
      }
      
      $headerDiv.html(
        tpl.articleTitle({
          href: link,
          title: title,
          feed: feedTitle,
          time: time,
          update: updTxt
        })
      ).trigger("create");

    }, //renderContentHeader

    // this callback can be called as a method or an event callback
    renderContent: function(event){

      // the div for the content
      var $contentDiv = this.$("div:jqmData(role='content') > div.main");
      if ($contentDiv.length == 0){
        // no div yet
        this.$("div:jqmData(role='content')").append("<div class=\"main\"></div>");
        $contentDiv = this.$("div:jqmData(role='content') > div.main");
      }

      if (this.model.has("content")){
        // this article is ready to be fully displayed

        var article = this.model.get("content");

        // apply content filters
        article = utils.cleanArticle(article, this.model.get("link"));

        // display article
        $contentDiv.html(article);

        // remove any hardcoded sizes
        $contentDiv.find('img,object,iframe,audio,video').removeAttr("width");
        $contentDiv.find('img,object,iframe,audio,video').removeAttr("height");

        $contentDiv.trigger('create');

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
        $contentDiv.html(tpl.articleLoading({msg: "Loading..."}));
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

        html += tpl.gridLeftButton({
          href:   ln + prevArt.id,
          cl:  "",
          title:  prevArt.get("title")
        });
        

      } else {
        // disabled button
        html += tpl.gridLeftButton({
          href:   "#",
          cl:  "ui-disabled",
          title:  ""
        });
      }

      if (index + 1 < window.articlesModel.length){
        // do we have a next article?
        var nextArt = window.articlesModel.at(index + 1);

        html += tpl.gridRightButton({
          href:   ln + nextArt.id,
          cl:  "",
          title:  nextArt.get("title")
        });
      } else {
        // disabled button
        html += tpl.gridRightButton({
          href:   "#",
          cl:  "ui-disabled",
          title:  ""
        });
      }

      // we now have the HTML ready, add it to the content
      this.$("div:jqmData(role='content') > div.main")
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



  /******* for the settings page ****/

  var SettingsPageView = Backbone.View.extend({

    render: function(){
      var artN = this.model.get("articlesNumber");
      this.$("#articles-number").attr("value",artN);
      return this;
    },

    settingsChanged: function (event){
      /* function called when any form element
      * change on the settings page */
      event.data.model.set(
        {articlesNumber: $("#articles-number").val()},
        {validate: true}
      );

     // persist data
      event.data.model.save();
    }, //settingsChanged

    settingsError: function(event){
      alert(this.model.validationError);
    },

    initialize: function(){
      // bind the view to the model
      this.model = window.settingsModel;
    
      // load settings from localStorage & update values
      this.model.fetch();

      // bind settings change handler
      this.$("form").change(this, this.settingsChanged);

      // prevent form from submitting
      this.$("form").submit(this, function(e){e.preventDefault();});

      // bind validation errors
      this.model.on("invalid", this.settingsError, this);
    
    } //init
  });
  window.settingsPageView = new SettingsPageView({
    el: $("#settings")
  });
  
} // defineViews


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
        // we store the sessions id
        window.settingsModel.set("sid", data.content.session_id);
        window.settingsModel.save();

        window.myRouter.setNextTransOptions({reverse: true, transition: "slideup"});

        // try to get from query string if it exists
        var fragment = location.hash;
        var re = /\?from=#(.+)/;
        var nextRoute = "cat";
        var ex = re.exec(fragment)
        if (ex != null){
          nextRoute = ex[1];
        }

        window.myRouter.navigate(nextRoute, {trigger: true});
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


function localStorageSupport(){

  //taken from https://developer.mozilla.org/en-US/docs/DOM/Storage#localStorage

  if (!window.localStorage) {
    window.localStorage = {
      getItem: function (sKey) {
        if (!sKey || !this.hasOwnProperty(sKey)) { return null; }
        return unescape(document.cookie.replace(new RegExp("(?:^|.*;\\s*)" + escape(sKey).replace(/[\-\.\+\*]/g, "\\$&") + "\\s*\\=\\s*((?:[^;](?!;))*[^;]?).*"), "$1"));
      },
      key: function (nKeyId) {
        return unescape(document.cookie.replace(/\s*\=(?:.(?!;))*$/, "").split(/\s*\=(?:[^;](?!;))*[^;]?;\s*/)[nKeyId]);
      },
      setItem: function (sKey, sValue) {
        if(!sKey) { return; }
        document.cookie = escape(sKey) + "=" + escape(sValue) + "; expires=Tue, 19 Jan 2038 03:14:07 GMT; path=/";
        this.length = document.cookie.match(/\=/g).length;
      },
      length: 0,
      removeItem: function (sKey) {
        if (!sKey || !this.hasOwnProperty(sKey)) { return; }
        document.cookie = escape(sKey) + "=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
        this.length--;
      },
      hasOwnProperty: function (sKey) {
        return (new RegExp("(?:^|;\\s*)" + escape(sKey).replace(/[\-\.\+\*]/g, "\\$&") + "\\s*\\=")).test(document.cookie);
      }
    };
    window.localStorage.length = (document.cookie.match(/\=/g) || window.localStorage).length;
  }
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
    localStorageSupport();
    
    // events for login page
    registerLoginPageActions();

    // backbone.js
    defineViews();

    // initialize all logout buttons
    $('a.logoutButton').on('click',
      function(e){
        e.preventDefault();
        $.mobile.loading( 'show', { text: 'Logging out...', textVisible: true} );
        api.logout();
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


//loading jQuery Mobile
require(['jquerymobile'], function(){});

}); //requirejs

