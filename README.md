ttrss-mobile
============

A mobile webapp for Tiny Tiny RSS

What is it?
-----------

This webapp is a client for [Tiny Tiny RSS](http://tt-rss.org).
It uses its [JSON API](http://tt-rss.org/redmine/projects/tt-rss/wiki/JsonApiReference).

I wrote because the default mobile version is slow, very limited and not in good shape.

ttrss-mobile is written with:
 * jQuery Mobile
 * Backbone.js

How to use it?
--------------

You should install the files in a directory on the same host as your Tiny Tiny RSS install. As the webapp uses AJAX calls to access the API, it should be hosted on the same domain name.

*IMPORTANT*
copy conf.js-dist to conf.js

There these variables must be set:

 * window.apiPath
 * window.webappPath
