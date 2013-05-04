ttrss-mobile
============

A mobile webapp for *Tiny Tiny RSS*

What is it?
-----------

This webapp is a client for [Tiny Tiny RSS](http://tt-rss.org).
It uses its [JSON API](http://tt-rss.org/redmine/projects/tt-rss/wiki/JsonApiReference).

I started working on this because the default mobile version was somtimes slow,
limited and not in good shape for future development.

ttrss-mobile is using:
 * [jQuery Mobile](http://jquerymobile.com/)
 * [Backbone.js](http://backbonejs.org/)
 * [RequireJS](http://requirejs.org/)


How to install?
--------------

* Download the last version available here: [releases](dist)
* Unpack the archive somewhere on your server
* In the scripts dir, copy `conf.js-dist` to `conf.js` and set
  the variable `window.apiPath`

###Updates
* Download the update
* Unpack it over your previous installation
* Compare the new conf.js-dist with yours and merge them
* It should be ready
* (Don't forget to clear your cache if you see something strange)

How to hack on it?
------------------

You need *[node.js](http://nodejs.org/)* to make a build but you can still
hack without it.

* Clone this repo on your webserver
* Hack on the files in *src*
* Test on the version in *src*
* Build with make/make.sh
* Test with the built version in build
* Make a pull request with your awesome contribution

Caveats
-------

* You should not put this webapp in a subdir of your *Tiny Tiny RSS* install. On update, it could
be wiped. For more info, see [this post](http://tt-rss.org/forum/viewtopic.php?f=10&t=1216&p=8411#p8359)
from *HunterZ* on the forum.

* Make sure that the user you'll use to connect has the API activated in *Tiny Tiny RSS* preferences :
  * in *Tiny Tiny RSS* go into `Actions` -> `Preferences`
  * `Configuration` -> `Enable external API`

* If you want to host this webapp on another hostname than your *Tiny Tiny RSS* instance,
  you'll find a solution using *CORS* in [this issue](https://github.com/mboinet/ttrss-mobile/issues/36).


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
