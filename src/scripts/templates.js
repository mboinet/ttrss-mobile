/* My module for this webapp templates */

define(['underscore'], function(_){

  return {

    // a jQuery listview separator element
    listSeparator : 
      _.template('<li data-role="list-divider"><%= text %></li>')
    ,

    // a jQuery listview link element (to put inside a li)
    listElement : 
      _.template('<a href="<%= href %>">' +
                 '<%= title %>' +
                 '<span class="ui-li-count"><%= count %></span>' +
                 '</a>'),

    // a jQuery listview link element with icon (to put inside a li)
    listElementWithIcon : 
      _.template('<a href="<%= href %>">' +
                 '<img src="<%= src %>" class="ui-li-icon"></img>' +
                 '<%= title %>' +
                 '<span class="ui-li-count"><%= count %></span>' +
                 '</a>'),
                                  
    // a jQuery listview read-only element
    roListElement : 
      _.template('<li class="ui-li-static"><%= text %></li>'),

    // the content of a LI element for an article
    articleLiElement : 
      _.template('<a href="<%= href %>">' +
      '<h3><%= title %></h3>' +
      '<% if (( typeof excerpt !== 'undefined' ) && ( excerpt != "" )) { %><p style="white-space:normal;"><%= excerpt %></p><% } %>' +
      '<p class="ui-li-desc"><%= date %></p></a>'),

    // the content of a LI element for an article with the feed Name
    articleFeedLiElement : 
      _.template(
        '<a href="<%= href %>">' +
        '<h3><%= title %></h3>' +
        '<% if (( typeof excerpt !== 'undefined' ) && ( excerpt != "" )) { %><p style="white-space:normal;"><%= excerpt %></p><% } %>' +
        '<p class="ul-li-desc"><strong><%= feed %></strong></p>' +
        '<p class="ui-li-desc"><%= date %></p></a>'
      ),

    // button for the prev/next
    gridLeftButton : 
      _.template(
        '<div class="ui-grid-a">' +
        '<div class="ui-block-a">' +
        '<a data-role="button" data-icon="arrow-l" href="<%= href %>" class="<%= cl %>">previous</a>' +
        '<em><%= title %></em></div>'),

    gridRightButton : 
      _.template(
        '<div class="ui-block-b">' +
        '<a data-role="button" data-icon="arrow-r" ' +
        'data-iconpos="right" href="<%= href %>" class="<%= cl %>"' +
        '>next</a><em><%= title %></em></div>' +
        '</div>')

  } //return

}); //define
