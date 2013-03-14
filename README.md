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

Copy `conf.js-dist` to `conf.js` and set these variables:
 * `window.apiPath`
 * `window.webappPath`

Finally, make sure that the user you'll use to connect has the API activated in *Tiny Tiny RSS* preferences :
 * in *Tiny Tiny RSS* go into `Actions` -> `Preferences`
 * `Configuration` -> `Enable external API`
