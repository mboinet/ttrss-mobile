/************ BACKBONE views*************/

define(['jquery', 'models', 'templates','conf','utils'],
       function ($, models, tpl, conf, utils){

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

    updateUnread: function(){
      var newCount = this.model.get('unread');
      this.$('span.ui-li-count').html(newCount);
    },

    updateTitle: function(){
      var newTitle = this.model.get('title');
      this.$('a')[0].firstChild.data = newTitle;
    },

    initialize: function() {
      this.listenTo(this.model, "change:unread", this.updateUnread);
      this.listenTo(this.model, "change:title", this.updateTitle);
      this.el = document.createElement('li');
      this.$el = $(this.el);
    }
  });

  // a view for page with all the categories
  var CategoriesPageView = Backbone.View.extend({

    
    // when a category is added
    addCat: function(model){

      var catId = model.get('id');
      var row = new CategoryRowView({model: model})

      // if nothing yet, cleanup listview
      if (this.$('li.ui-li-static').html() == "Loading..."){
        this.$lv.empty();
      }

      // li element to add
      var li = row.render().el;

      if (catId < 0){
        // Special category comes at the top with separators
        this.$lv.prepend(tpl.listSeparator({ text: '&nbsp;' }));
        this.$lv.prepend(li);
      } else {
        // Other categories comes at the bottom
        this.$lv.append(li);
      }
      this.$lv.listview("refresh");

    }, //addCat

    // called when the data must be refreshed
    refresh: function(){

      // update associated collection
      this.collection.fetch();

      return this;
    },

    initialize: function() {

      // when elements are added or removed
      this.collection.on("add", this.addCat, this);

      // refresh button for categories
      this.$('a.refreshButton').on('click', this, function(e){
        e.data.refresh();
        $('#catPopupMenu').popup('close');
        e.preventDefault();
      });

      // store in the object a reference on the listview
      this.$lv = this.$('div[data-role="content"] ' +
        'ul[data-role="listview"]');

      // first time, no data yet in the collection
      this.$lv.html(tpl.roListElement({text: "Loading..."}));

    } // initialize
  });


  var categoriesPage = 
    new CategoriesPageView({
      el: $("#categories"),
      collection: models.categoriesModel
    });



  /************ Feeds **************/

  // a view for each row of a feeds list
  FeedRowView = Backbone.View.extend({
    render: function(event){
      var html;
      
      // get the icons directory from the conf
      var iconsDir = models.configModel.get("icons_dir");

      if ((iconsDir == undefined) && (this.model.get("has_icon"))){
        // request to be notifed when icons path will be ready
        // asked by the page view
        models.configModel.once("change:icons_dir", this.render, this);
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
        var iconSrc = conf.apiPath + iconsDir + "/" + this.model.id + ".ico";

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
      var catModel = models.categoriesModel.get(catId);
      
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
      var id = models.feedsModel.getCurrentCatId();

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
      if (! models.configModel.has("icons_dir")){
        models.configModel.fetch();
      }
        
      if (models.categoriesModel.length == 0){
        // request the categories and ask to be notified once
        models.categoriesModel.once("reset", this.renderTitle, this);
        models.categoriesModel.fetch();
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
      this.$lv = this.$('div[data-role="content"] ' +
        'ul[data-role="listview"]');
    } // initialize
    
  }); //FeedsPageView





  /*************** Articles *************/

  // a view for each row (article) of a feeds list
  var ArticleRowView = Backbone.View.extend({

    render: function(event){
      var link = "#" + Backbone.history.fragment +
        "/art" + this.model.id;

      var dateStr = utils.updateTimeToString(this.model.get("updated"));

      var html;
      var catId = models.feedsModel.getCurrentCatId();
      var feedId = models.articlesModel.getCurrentFeedId();
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
      var feedId = models.articlesModel.getCurrentFeedId();
      
      // placeholder for the title of the category
      var $h1Tag = this.$("div:jqmData(role='header') h1");

      // feed model
      var feedModel = models.feedsModel.get(feedId);
      
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
      var id = models.articlesModel.getCurrentFeedId();

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
      var feedModel = models.feedsModel.get(
        models.articlesModel.getCurrentFeedId());
      if (feedModel == undefined){
        models.feedsModel.once("reset", this.renderTitle, this);
        models.feedsModel.fetch();
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
      this.$lv = this.$('div[data-role="content"] ' +
        'ul[data-role="listview"]');
    } // initialize
    
  }); //ArticlesPageView


  /************** 1 ARTICLE view, reading **************/

  var ArticlePageView = Backbone.View.extend({

    render: function(){

      // back button
      this.renderBackButton();

      // header with link, update info & feed
      this.listenTo(this.model, "change:title", this.renderContentHeader);
      this.renderContentHeader();

      var feedModel = models.feedsModel.get(this.model.get("feed_id"));
      if (feedModel == undefined){
        // we don't have the feed name
        models.feedsModel.once("reset", this.renderContentHeader, this);
        models.feedsModel.fetch();
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
        var feedModel = models.feedsModel.get(this.model.get("feed_id"));
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
        if (models.articlesModel.length == 0){
          // collection empty, update it
          models.articlesModel.once("reset", this.renderPrevNext, this);
          models.articlesModel.fetch();
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
      var m = models.articlesModel.get(this.model.id);
      if (m == null){
        return;
      }

      var index = models.articlesModel.indexOf(m);
      if (index == -1){
        // nothing to do, article not in the collection
        return ;
      }

      // base link
      var ln = "#" + Backbone.history.fragment;
      ln = ln.substring(0, ln.lastIndexOf("art") + 3);

      if (index > 0){
        // do we have a previous article?
        var prevArt = models.articlesModel.at(index - 1);

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

      if (index + 1 < models.articlesModel.length){
        // do we have a next article?
        var nextArt = models.articlesModel.at(index + 1);

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
      this.$lv = this.$('div[data-role="content"] ' +
        'ul[data-role="listview"]');
    } // initialize

  }); // ArticlePageView



  /******* for the settings page ****/

  var SettingsPageView = Backbone.View.extend({

    render: function(){
      var artNumber = this.model.get("articlesNumber");
      var artOldestFirst = this.model.get("articlesOldestFirst");
      this.$("#articles-number").attr("value", artNumber);
      this.$("#articles-oldest-first").prop("checked", artOldestFirst).checkboxradio("refresh");
      return this;
    },

    settingsChanged: function (event){
      /* function called when any form element
      * change on the settings page */
      event.data.model.set(
        {
          articlesNumber: $("#articles-number").val(),
          articlesOldestFirst: $("#articles-oldest-first").prop("checked")
        },
        {validate: true}
      );

     // persist data
      event.data.model.save();
    }, //settingsChanged

    settingsError: function(event){
      alert(this.model.validationError);

      // reset articles number on error
      document.getElementById('articles-number').value =
        this.model.get("articlesNumber");
    },

    initialize: function(){
      // bind the view to the model
      this.model = models.settingsModel;
    
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



  return {

    categoriesPageView: categoriesPage,

    feedsPageView:
      new FeedsPageView({
        el: $("#feeds"),
        collection: models.feedsModel
      }),

    articlesPageView:
      new ArticlesPageView({
        el: $("#articles"),
        collection: models.articlesModel
      }),

    articlePageView:
      new ArticlePageView({
        el: $("#read")
      }),

    settingsPageView: 
      new SettingsPageView({ el: $("#settings") })

  } //return


}); // module define

