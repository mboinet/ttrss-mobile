ttrss-mobile
============

A mobile webapp for *Tiny Tiny RSS*

What is it?
-----------

This webapp is a client for [Tiny Tiny RSS](http://tt-rss.org).
It uses its [JSON API](http://tt-rss.org/redmine/projects/tt-rss/wiki/JsonApiReference).

I wrote because the default mobile version is slow, very limited and not in good shape.

ttrss-mobile is using:
 * [jQuery Mobile](http://jquerymobile.com/)
 * [Backbone.js](http://backbonejs.org/)


How to use it?
--------------

You should install the files in a directory on the same host as your *Tiny Tiny RSS* install.
As the webapp uses AJAX calls to access the API, it should be hosted on the **same domain name**.

You should not put this webapp in a subdir of your *Tiny Tiny RSS* install. On update, it could
be wiped. For more info, see [this post](http://tt-rss.org/forum/viewtopic.php?f=10&t=1216&p=8411#p8359)
from *HunterZ* on the forum.

Copy `conf.js-dist` to `conf.js` and set these variables:
 * `window.apiPath`
 * `window.webappPath`

Finally, make sure that the user you'll use to connect has the API activated in *Tiny Tiny RSS* preferences :
 * in *Tiny Tiny RSS* go into `Actions` -> `Preferences`
 * `Configuration` -> `Enable external API`


Current features
----------------

* mark all as read/unread
* categories support
* feeds icon display
* image & objects adapted to the screen size (`max-width: 100%` in CSS)
* link to the original article
* unread count display
* special feeds
* publish/unpublish article support
* star/unstar article support
* mark as read/unread article support
* iPhone webapp support (startup image & icon)
* SINGLE_USER_MODE support
* settings page: only number of articles to load as of now

Other features to come are tracked as issues.
Don't hesitate to give a hand or request things :-)
