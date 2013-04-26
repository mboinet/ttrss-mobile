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
      this.model.on("change:unread", this.updateUnread, this);
      this.model.on("change:title", this.updateTitle, this);
      this.el = document.createElement('li');
      this.$el = $(this.el);
    }
  });

  // a view for page with all the categories
  var CategoriesPageView = Backbone.View.extend({

    // category removed
    delCat : function(model){
      this.$('#cat' + model.id).remove();
      this.LVrefreshNeeded = true;
    }, //delCat

    
    // when a category is added
    addCat: function(model){

      var catId = model.get('id');
      var row = new CategoryRowView({model: model});

      this.LVrefreshNeeded = true;

      // if nothing yet, cleanup listview
      if (this.$('li.ui-li-static').html() == "Loading..."){
        this.$lv.empty();
      }

      // li element to add
      var li = row.render().el;

      // add an id to the li element
      li.id = 'cat' + catId;

      if (catId < 0){
        // Special category comes at the top with a separator
        this.$lv.prepend(tpl.listSeparator({ text: '&nbsp;' }));

        //TODO Labels category can be added here

        this.$lv.prepend(li);
      } else {
        // Other categories comes at the bottom, we order them
        // accordingly to the collection order
        
        // current position in the collection
        var pos = this.collection.indexOf(row.model);

        if (pos == this.collection.length - 1){
          // the last one in the collection
          this.$lv.append(li);
        } else {
          // we insert it before the next in the collection
          var nextModel = this.collection.at(pos + 1);
          var nextLi = this.$('#cat' + nextModel.id);
          if (nextLi[0] != undefined){
            $(nextLi[0]).before(li);
          } else {
            // nextModel has no view yet
            this.$lv.append(li);
          }
        }
      }

    }, //addCat

    // called when the data must be refreshed
    refresh: function(){

      // update associated collection
      this.collection.fetch();

      return this;
    },

    // this is called each time the collection is
    // synced
    onSync: function(){
      if (this.LVrefreshNeeded){
        this.$lv.listview("refresh");
        this.LVrefreshNeeded = false;
      }
    },

    initialize: function() {
      // when a category is added
      this.collection.on("add", this.addCat, this);
      // when a category is removed
      this.collection.on("remove", this.delCat, this);

      // a flag so that the view knows when a listview refresh is
      // needed
      this.LVrefreshNeeded = false;

      // when a sync goes well, refresh the list
      this.collection.on("sync", this.onSync, this);

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

    // callback to add an icon to the list element
    addIcon: function(){
      // get the icons directory from the conf
      var iconsDir = models.configModel.get("icons_dir");

      var iconSrc = conf.apiPath + iconsDir +
                    "/" + this.model.id + ".ico";

      var img = document.createElement('img');
      img.src = iconSrc;
      img.classList.add("ui-li-icon");
      img.classList.add("ui-li-thumb");

      // tell the li element to make space for the icon
      this.el.classList.add("ui-li-has-icon");

      // add the image to the element
      this.$('a').prepend(img);
    },

    render: function(event){
      var html;
      
      // get the icons directory from the conf
      var iconsDir = models.configModel.get("icons_dir");

      if ((iconsDir == undefined) && (this.model.get("has_icon"))){
        // request to be notifed when icons path will be ready
        // asked by the page view
        models.configModel.once("change:icons_dir", this.addIcon, this);
      }

      // the link src
      var link = "#cat" + utils.getCurrentCatId() + "/feed" + this.model.id;

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

    updateUnread: function(){
      var newCount = this.model.get('unread');
      this.$('span.ui-li-count').html(newCount);
    },

    updateTitle: function(){
      var newTitle = this.model.get('title');
      var childNodes = this.$('a')[0].childNodes;

      if (childNodes[0].nodeType == 3){
        //no icon
        childNodes[0].data = newTitle;
      } else {
        //icon as firstChild
        childNodes[1].data = newTitle;
      }
    },

    initialize: function() {
      this.model.on("change:unread", this.updateUnread, this);
      this.model.on("change:title", this.updateTitle, this);
      this.el = document.createElement('li');
      this.$el = $(this.el);
    },
    tagName: 'li'
  });



  // a view for the page of the list of feeds of a category
  var FeedsPageView = Backbone.View.extend({

    // callback to render the title in the header
    renderTitle: function(event){
      // placeholder for the title of the category
      var $h1Tag = this.$("div:jqmData(role='header') h1");

      // catId on the fragment
      var catId = utils.getCurrentCatId();

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

    // callback to delete a feed from the list
    delFeed: function(model){
      this.$('#feed' + model.id).remove();
      this.LVrefreshNeeded = true;
    },

    // callback to add a feed to the list
    addFeed: function(model){

      this.LVrefreshNeeded = true;

      // if nothing yet, cleanup listview
      if (this.$('li.ui-li-static').html() == "Loading..."){
        this.$lv.empty();
      }

      var row = new FeedRowView({model: model});

      // li element to add
      var li = row.render().el;

      // add an id to the li element to find it back easily later
      li.id = 'feed' + model.id;

      // append it to the list at the good position
      var pos = this.collection.indexOf(row.model);

      if (pos == this.collection.length - 1){
        // the last one in the collection
        this.$lv.append(li);
      } else {
        // we insert it before the next in the collection
        var nextModel = this.collection.at(pos + 1);
        var nextLi = this.$('#feed' + nextModel.id);
        if (nextLi[0] != undefined){
          $(nextLi[0]).before(li);
        } else {
          // nextModel has no view yet
          this.$lv.append(li);
        }
      }

    }, //addFeed

    // called when the data must be refreshed
    refresh: function(){
      // update associated collection
      this.collection.fetch();

      // do we have the icons_dir in the config
      // it will be necessary for the feeds
      if (models.configModel.get("icons_dir") == undefined){
        models.configModel.fetch();
        // rows will be notified
      }

      // render the title
      this.renderTitle();

      // no category names yet
      if (models.categoriesModel.length == 0){
        // request the categories and ask to be notified once
        models.categoriesModel.once("sync",
                                    this.renderTitle,
                                    this);
        models.categoriesModel.fetch();
      }

      // do we have feeds from this category?
      var catId = utils.getCurrentCatId();
      if (this.collection.where({cat_id: catId}).length == 0){
        // no, show loading info
        lvData = tpl.roListElement({text: "Loading..."});

        this.$lv.html(lvData);
        this.$lv.listview("refresh");
      }

      return this;
    },

    // this is called each time the collection is
    // synced
    onSync: function(){
      if (this.LVrefreshNeeded){
        this.$lv.listview("refresh");
        this.LVrefreshNeeded = false;
      }
    },

    initialize: function(){
      // when a feed is added
      this.collection.on("add", this.addFeed, this);
      // when a feed is deleted
      this.collection.on("remove", this.delFeed, this);

      // register refresh button for feeds
      this.$("a.refreshButton").on(
        // this is on from jQuery
        "click",
        this,
        function(e){
          e.data.refresh();
          $('#feedsMenuPopup').popup('close');
          e.preventDefault();
        }
      );

      // listview div
      this.$lv = this.$('div[data-role="content"] ' +
        'ul[data-role="listview"]');

      // a flag so that the view knows when a listview refresh is
      // needed
      this.LVrefreshNeeded = false;

      // when sync goes well, refresh the list
      this.collection.on("sync", this.onSync, this);

      // first time, no data yet in the collection
      this.$lv.html(tpl.roListElement({text: "Loading..."}));
    } // initialize
    
  }); //FeedsPageView





  /*************** Articles *************/

  // a view for each row (article) of a feeds list
  var ArticleRowView = Backbone.View.extend({

    render: function(event){
      var link = "#cat" + utils.getCurrentCatId() +
        "/feed" + utils.getCurrentFeedId() +
        "/art" + this.model.id;

      var dateStr = utils.updateTimeToString(this.model.get("updated"));

      var html;
      var catId = utils.getCurrentCatId();
      var feedId = utils.getCurrentFeedId();
      var feedTitle = this.model.get("feed_title");
      var unread = this.model.get("unread");

      if (((catId >= 0) && (feedId != -9)) || (feedTitle == undefined)){
        // normal cat, we don't need to show the feed name (it's in the header)
        // or we don't have it yet

        html = tpl.articleLiElement({
          href:  link,
          date:  dateStr,
          title: this.model.get('title') });

      } else {
        // special cat, we show the feed name

        html = tpl.articleFeedLiElement({
          href:  link,
          date:  dateStr,
          title: this.model.get('title'),
          feed: feedTitle });
      }

      this.el.innerHTML = html;
      if (! unread){
        this.el.classList.add("read");
      }

      return this;
    }, // render

    updateUnread: function(){
      this.el.classList.toggle("read");
    },

    initialize: function() {
      this.el = document.createElement('li');
      this.$el = $(this.el);

      this.model.on('change:unread', this.updateUnread, this);
    },

    tagName: 'li'
  });
 

  // a view for the page with the list of articles of a feed
  var ArticlesPageView = Backbone.View.extend({

    // callback to update the href of the back button
    updateBackButton: function(){
      // back button href
      var href = Backbone.history.fragment;
      href = "#" + href.substr(0, href.lastIndexOf("/"));

      this.$("div:jqmData(role='header') a:first").attr("href", href);
    },

    // callback to update the title in the header
    updateTitle: function(){

      // placeholder for the title of the category
      var $h1Tag = this.$("div:jqmData(role='header') h1");

      // feedId from the fragment
      var feedId = utils.getCurrentFeedId();
      
      // feed model
      var feedModel = models.feedsModel.get(feedId);
      if (feedModel == undefined){
        // default title
        $h1Tag.html("Articles");
      } else {
        // title is available now
        $h1Tag.html(feedModel.get("title"));
      }
    }, //updateTitle

    addArt: function(model){

      this.LVrefreshNeeded = true;

      // if nothing yet, cleanup listview
      if (this.$('li.ui-li-static').html() == "Loading..."){
        this.$lv.empty();
      }

      var row = new ArticleRowView({model: model});

      // li element to add
      var li = row.render().el;

      // add an id to the li element to find it back easily later
      li.id = 'art' + model.id;

      // append it to the list at the good position
      var pos = this.collection.indexOf(row.model);

      if (pos == this.collection.length - 1){
        // the last one in the collection
        this.$lv.append(li);
      } else {
        // we insert it before the next in the collection
        var nextModel = this.collection.at(pos + 1);
        var nextLi = this.$('#art' + nextModel.id);
        if (nextLi[0] != undefined){
          $(nextLi[0]).before(li);
        } else {
          // nextModel has no view yet
          this.$lv.append(li);
        }
      }

    }, //addArt


    delArt: function(model){
      this.$('#art' + model.id).remove();
      this.LVrefreshNeeded = true;
    }, //delArt

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

    // called when the data must be refreshed
    refresh: function(){

      var feedId = utils.getCurrentFeedId();

      // update the collection
      this.collection.fetch();

      // update the back button
      this.updateBackButton();

      // render the title with the feed name
      this.updateTitle();

      /* if the feed model isn't available, we need to
      fetch it and update the title when it will be
      ready */
      var feedModel = models.feedsModel.get(feedId);
      if (feedModel == undefined){
        models.feedsModel.once("sync", this.updateTitle, this);
        models.feedsModel.fetch();
      }

      // do we have articles from this feed?
      if (this.collection.feedId != feedId){
        // no, show loading info
        lvData = tpl.roListElement({text: "Loading..."});
        this.$lv.html(lvData);
        this.$lv.listview("refresh");
      }

      return this;
    },

    // this is called each time the collection is
    // synced
    onSync: function(){
      if (this.LVrefreshNeeded){
        this.$lv.listview("refresh");
        this.LVrefreshNeeded = false;
      }

      if (this.collection.length == 0){
        // no elements in the collection
        this.$lv.html(tpl.roListElement({text: "No articles"}));
        this.$lv.listview("refresh");
      }

      // update the mark all as read/unread button
      this.renderMarkAllButton();
    },

    initialize: function(){

      this.collection.on("add", this.addArt, this);
      this.collection.on("remove", this.delArt, this);

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


      // a flag so that the view knows when a listview refresh is
      // needed
      this.LVrefreshNeeded = false;

      // after an update of the collection
      this.collection.on("sync", this.onSync, this);

      // listview div
      this.$lv = this.$('div[data-role="content"] ' +
        'ul[data-role="listview"]');
    } // initialize
    
  }); //ArticlesPageView


  /************** 1 ARTICLE view, reading **************/

  var ArticlePageView = Backbone.View.extend({

    // called when the data must be refreshed
    refresh: function(){

      var artId = utils.getCurrentArtId();

      if ((this.model == undefined) ||
          (this.model.id != artId)){

        if (this.model != undefined){
          // stop listening for events from the old model
          this.stopListening();
        }

        // no model associated with this view yet or
        // not the good one
        var m = models.articlesModel.get(artId);


        if (m != undefined){
          // we found it in the collection
          this.model = m;
        } else {
          // we have to create it
          this.model = new models.article({id: artId});
        }
      }
      
      // update the view parts
      this.updateBackButton();

      this.updateLink();
      if (! this.model.has("link")){
        this.model.once("change:link", this.updateLink, this);
      }

      this.updateTitle();
      if (! this.model.has("title")){
        this.model.once("change:title", this.updateTitle, this);
      }

      this.updateFeedName();
      if (utils.getCurrentCatId() < 0){
        // this is a special feed

        if (! this.model.has("feed_title")){
          models.articlesModel.once("change:feed_title", this.updateFeedName, this);
          // no need to fetch the articles, this will be done for
          // the next/prev links if needed
        }
      } else {
        // this is a normal feed
        var feedModel = models.feedsModel.get(
          utils.getCurrentFeedId()
        );

        if (! feedModel){
          models.feedsModel.once("sync", this.updateFeedName, this);
          models.feedsModel.fetch();
        }
      }

      this.updateTime();
      if (! this.model.has("updated")){
        this.model.once("change:updated", this.updateTime, this);
      }

      this.updateContent();
      if (! this.model.has("content")){
        this.model.once("change:content",
                        this.updateContent, this);
        // do the fetch now!
        this.model.fetch();
      }

      this.renderUnreadToggleButton();
      this.listenTo(this.model, "change:unread",
                    this.renderUnreadToggleButton);
      
      this.renderStarredToggleButton();
      this.listenTo(this.model, "change:marked",
                    this.renderStarredToggleButton);
      
      this.renderPublishToggleButton();
      this.listenTo(this.model, "change:published",
                    this.renderPublishToggleButton);

      return this;
    },

    // callback to update the href of the back button
    updateBackButton: function(){
      // back button href
      var href = Backbone.history.fragment;
      href = "#" + href.substr(0, href.lastIndexOf("/"));

      this.$("div:jqmData(role='header') a:first").attr("href", href);
    },

    updateLink: function(){
      var link = this.model.get("link");
      if (! link){
        link = "";
      }
      this.$("div:jqmData(role='content') > div.header > h3 > a").
        attr("href", link); 
    },

    updateTitle: function(){
      var title = this.model.get("title");
      if (! title){
        title = "Title loading...";
      }
      this.$("div:jqmData(role='content') > div.header " +
        '> h3 > a'). html(title);
    }, 

    updateFeedName: function(){

      // try to use feed_title
      var feedTitle = this.model.get("feed_title");

      if (! feedTitle){
        // feed_title cannot be used, we can try on the feed model

        var feedModel = models.feedsModel.get(utils.getCurrentFeedId());

        if (feedModel){
          feedTitle = feedModel.get("title");
        } else {
          // no model yet in the collection
          feedTitle = "loading...";
        }
      }

      this.$("div:jqmData(role='content') > div.header " +
        '> p.feed span').html(feedTitle);
    },

    updateTime: function(){
      var time = this.model.get("updated");
      if (! time){
        time = "loading...";
      } else {
        time = utils.updateTimeToString(time);
      }

      this.$("div:jqmData(role='content') > div.header " +
        '> p.updateTime span').html(time);
    },

    // this callback can be called as a method or an event callback
    updateContent: function(){

      // the div for the content
      var $contentDiv = this.$("div:jqmData(role='content') > div.main");

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
        if (this.model.get("unread")){
          this.model.save({ unread: false});
        }

      } else {
        $contentDiv.html("Content loading...");
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

