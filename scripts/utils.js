
/* module for utilities functions */

define(['jquery'],function($){

  // to check the start of a string
  if (typeof String.prototype.startsWith != 'function') {
    String.prototype.startsWith = function (str){
      return this.indexOf(str) == 0;
    };
  }

  return {


    // clean up a dom object (article to display)
    cleanArticle: function(content, domain){
      var data = "<article>" + content + "</article>";
      var $dom = $(data);

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
        }
      );

      // make all links open in a new tab
      $toClean = $dom.find('a');
      $toClean.each(
        function(index, e){
          $(e).attr('target', '_blank');
        }
      );

      return $dom;
    }, //cleanArticle



    /* returns a valid formatted string of the update
       time representation of Tiny Tiny RSS */
    updateTimeToString: function(time){
      var date = new Date(time * 1000); 
      var now = new Date(Date.now());

      // date in YYYY-MM-DD
      var year = date.getFullYear();
      var month = date.getMonth() + 1;
      month = (month < 10 ? "0" : "") + month;
      var day = date.getDate();
      day = (day < 10 ? "0" : "") + day;
      var dateStr = year + "-" + month + "-" + day;

      // time in HH:MM
      var hour = date.getHours();
      hour = (hour < 10 ? "0" : "") + hour;
      var min = date.getMinutes();
      min = (min < 10 ? "0" : "") + min;
      var  timeStr = hour + ":" + min;

      // now in YYYY-MM-DD
      year = now.getFullYear();
      month = now.getMonth() + 1;
      month = (month < 10 ? "0" : "") + month;
      day = now.getDate();
      day = (day < 10 ? "0" : "") + day;
      var nowStr = year + "-" + month + "-" + day;

      // if today, puts the time of day
      if (dateStr == nowStr){
        // only time if it's today
        dateStr = timeStr;
      } else {
        dateStr = dateStr + " " + timeStr;
      }

      return dateStr;
    } //updateTimeToString



  } //return

}); //define
