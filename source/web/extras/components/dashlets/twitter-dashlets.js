/**
 * Copyright (C) 2010-2011 Share Extras contributors.
 */

/**
* Extras root namespace.
* 
* @namespace Extras
*/
if (typeof Extras == "undefined" || !Extras)
{
   var Extras = {};
}

/**
* Extras dashlet namespace.
* 
* @namespace Extras.dashlet
*/
if (typeof Extras.dashlet == "undefined" || !Extras.dashlet)
{
   Extras.dashlet = {};
}

/**
* Base Twitter dashlet
 * 
 * @namespace Alfresco
 * @class Extras.dashlet.TwitterBase
 */
(function()
{
   /**
    * YUI Library aliases
    */
   var Dom = YAHOO.util.Dom,
      Event = YAHOO.util.Event;

   /**
    * Alfresco Slingshot aliases
    */
   var $html = Alfresco.util.encodeHTML,
      $combine = Alfresco.util.combinePaths;


   /**
    * Dashboard TwitterBase constructor.
    * 
    * @param {String} htmlId The HTML id of the parent element
    * @return {Extras.dashlet.TwitterBase} The new component instance
    * @constructor
    */
   Extras.dashlet.TwitterBase = function TwitterBase_constructor(name, id, components)
   {
      return Extras.dashlet.TwitterBase.superclass.constructor.call(this, name, id, components);
   };

   /**
    * Extend from Alfresco.component.Base and add class implementation
    */
   YAHOO.extend(Extras.dashlet.TwitterBase, Alfresco.component.Base,
   {
       /**
        * Object container for initialization options
        *
        * @property options
        * @type object
        */
       options:
       {
          /**
           * The component id.
           *
           * @property componentId
           * @type string
           * @default ""
           */
          componentId: "",

          /**
           * Number of Tweets to load per batch
           * 
           * @property pageSize
           * @type int
           * @default 50
           */
          pageSize: 50,

          /**
           * How often the dashlet should poll for new Tweets, in seconds. Setting to zero disabled checking.
           * 
           * @property checkInterval
           * @type int
           * @default 300
           */
          checkInterval: 300
       },

       /**
        * ID of the latest known Tweet, not including newly-posted tweets from the current user
        * 
        * @property latestTweetId
        * @type string
        * @default null
        */
       latestTweetId: null,

       /**
        * New Tweets cache. Populated by polling function, but cached so that the user
        * can then choose to display the tweets by clicking a link.
        * 
        * @property newTweets
        * @type object
        * @default null
        */
       newTweets: null,

       /**
        * Timer for new tweets poll function
        * 
        * @property pollTimer
        * @type object
        * @default null
        */
       pollTimer: null,

       /**
        * OAuth helper for connecting to the Twitter service
        * 
        * @property oAuth
        * @type Extras.OAuthHelper
        * @default null
        */
       oAuth: null,

       /**
        * Fired by YUI when parent element is available for scripting
        * 
        * @method onReady
        */
       onReady: function TwitterBase_onReady()
       {
          Event.addListener(this.id + "-configure-link", "click", this.onConfigClick, this, true);
          
          // The user timeline container
          this.widgets.timeline = Dom.get(this.id + "-timeline");
          
          // The dashlet title container
          this.widgets.title = Dom.get(this.id + "-title");
          
          // The new tweets notification container
          this.widgets.notifications = Dom.get(this.id + "-notifications");
          Event.addListener(this.widgets.notifications, "click", this.onShowNewClick, null, this);
          
          // Set up the buttons container and the More Tweets button
          this.widgets.buttons = Dom.get(this.id + "-buttons");
          this.widgets.moreButton = new YAHOO.widget.Button(
             this.id + "-btn-more",
             {
                disabled: true,
                onclick: {
                   fn: this.onMoreButtonClick,
                   obj: this.widgets.moreButton,
                   scope: this
                }
             }
          );
       },

       /**
        * Reload the timeline from the Twitter API and refresh the contents of the dashlet
        * 
        * @method load
        */
       load: function TwitterBase_load()
       {
          // Load the timeline
          this._request(
          {
             dataObj:
             {
                pageSize: this.options.pageSize
             },
             successCallback:
             {
                fn: this.onLoadSuccess,
                scope: this
             },
             failureCallback:
             {
                fn: this.onLoadFailure,
                scope: this
             }
          });
       },
       
       /**
        * Timeline loaded successfully
        * 
        * @method onLoadSuccess
        * @param p_response {object} Response object from request
        * @param p_obj {object} Custom object passed to function
        */
       onLoadSuccess: function TwitterBase_onLoadSuccess(p_response, p_obj)
       {
       },

       /**
        * Timeline load failed
        * 
        * @method onLoadFailure
        * @param p_response {object} Response object from request
        * @param p_obj {object} Custom object passed to function
        */
       onLoadFailure: function TwitterBase_onLoadFailure(p_response, p_obj)
       {
       },

       /**
        * Load Tweets further back in time from the Twitter API and add to the dashlet contents
        * 
        * @method extend
        */
       extend: function TwitterBase_extend()
       {
          // Load the user timeline
          this._request(
          {
             dataObj:
             {
                maxId: this._getEarliestTweetId(),
                pageSize: this.options.pageSize + 1
             },
             successCallback:
             {
                fn: this.onExtensionLoaded,
                scope: this
             },
             failureCallback:
             {
                fn: this.onExtensionLoadFailure,
                scope: this
             }
          });
       },
       
       /**
        * Extended timeline loaded successfully
        * 
        * @method onExtensionLoaded
        * @param p_response {object} Response object from request
        * @param p_obj {object} Custom object passed to function
        */
       onExtensionLoaded: function TwitterBase_onExtensionLoaded(p_response, p_obj)
       {
          this._refreshDates(); // Refresh existing dates
          this.widgets.timeline.innerHTML += this._generateTweetsHTML(p_response.json.slice(1)); // Do not include duplicate tweet
          this.widgets.moreButton.set("disabled", false);
       },
       
       /**
        * Extended timeline load failed
        * 
        * @method onExtensionLoadFailure
        * @param p_response {object} Response object from request
        * @param p_obj {object} Custom object passed to function
        */
       onExtensionLoadFailure: function TwitterBase_onExtensionLoadFailure(p_response, p_obj)
       {
          Alfresco.util.PopupManager.displayMessage(
          {
             text: this.msg("message.extendFailed")
          });
          
          // Re-enable the button
          this.widgets.moreButton.set("disabled", false);
       },
       
       /**
        * Check for new Tweets since the last Tweet shown. Display a notice to the user
        * indicating that new Tweets are available, if shown.
        * 
        * @method pollNew
        */
       pollNew: function TwitterBase_pollNew()
       {
          // Refresh existing dates
          this._refreshDates();
           
          // Load the user timeline
          this._request(
          {
             dataObj:
             {
                minId: this.latestTweetId
             },
             successCallback:
             {
                fn: this.onNewTweetsLoaded,
                scope: this
             },
             failureCallback:
             {
                fn: this.onNewTweetsLoadFailure,
                scope: this
             }
          });
       },
       
       /**
        * New tweets loaded successfully
        * 
        * @method onNewTweetsLoaded
        * @param p_response {object} Response object from request
        * @param p_obj {object} Custom object passed to function
        */
       onNewTweetsLoaded: function TwitterBase_onNewTweetsLoaded(p_response, p_obj)
       {
          this.newTweets = p_response.json;
          this._refreshNotification();
          
          // Schedule a new poll
          this._resetTimer();
       },
       
       /**
        * New tweets load failed
        * 
        * @method onNewTweetsLoadFailure
        * @param p_response {object} Response object from request
        * @param p_obj {object} Custom object passed to function
        */
       onNewTweetsLoadFailure: function TwitterBase_onNewTweetsLoadFailure(p_response, p_obj)
       {
          // Schedule a new poll
          this._resetTimer();
       },
       
       /**
        * PRIVATE FUNCTIONS
        */
       
       /**
        * Generate HTML markup for a collection of Tweets
        * 
        * @method _generateTweetsHTML
        * @private
        * @param tweets {array} Tweet objects to render into HTML
        * @return {string} HTML markup
        */
       _generateTweetsHTML: function TwitterBase__generateTweetsHTML(tweets)
       {
          var html = "", t;
          for (var i = 0; i < tweets.length; i++)
          {
             t = tweets[i];
             if (t.retweeted_status)
             {
                html += this._generateTweetHTML(t.retweeted_status, t);
             }
             else
             {
                html += this._generateTweetHTML(t);
             }
          }
          return html;
       },
       
       /**
        * Generate HTML markup for a single Tweet
        * 
        * @method _generateTweetHTML
        * @private
        * @param t {object} Tweet object to render into HTML
        * @param rt {object} Retweet object, if the Tweet has been RT'ed
        * @return {string} HTML markup
        */
       _generateTweetHTML: function TwitterBase__generateTweetHTML(t, rt)
       {
          var html = "", 
             profileUri = "http://twitter.com/" + encodeURIComponent(t.user.screen_name),
             userLink = "<a href=\"" + profileUri + "\" title=\"" + $html(t.user.name) + "\" class=\"theme-color-1\">" + $html(t.user.screen_name) + "</a>",
             postedRe = /([A-Za-z]{3}) ([A-Za-z]{3}) ([0-9]{2}) ([0-9]{2}:[0-9]{2}:[0-9]{2}) (\+[0-9]{4}) ([0-9]{4})/,
             postedMatch = postedRe.exec(t.created_at),
             postedOn = postedMatch != null ? (postedMatch[1] + ", " + postedMatch[3] + " " + postedMatch[2] + " " + postedMatch[6] + " " + postedMatch[4] + " GMT" + postedMatch[5]) : (t.created_at),
             postedLink = "<a href=\"" + profileUri + "\/status\/" + encodeURIComponent(t.id_str) + "\"><span class=\"tweet-date\" title=\"" + postedOn + "\">" + this._relativeTime(new Date(postedOn)) + "</span><\/a>";

          html += "<div class=\"user-tweet" + " detail-list-item\" id=\"" + $html(this.id) + "-tweet-" + $html(t.id_str) + "\">\n";
          html += "<div class=\"user-icon\"><a href=\"" + profileUri + "\" title=\"" + $html(t.user.name) + "\"><img src=\"" + $html(t.user.profile_image_url) + "\" alt=\"" + $html(t.user.screen_name) + "\" width=\"48\" height=\"48\" /></a></div>\n";
          html += "<div class=\"tweet\">\n";
          html += "<div class=\"tweet-hd\">\n";
          html += "<span class=\"screen-name\">" + userLink + "</span> <span class=\"user-name\">" + $html(t.user.name) + "</span>\n";
          html += !YAHOO.lang.isUndefined(rt) ? " <span class=\"retweeted\">" + this.msg("label.retweetedBy", rt.user.screen_name) + "</span>\n" : "";
          html += "</div>\n";
          html += "<div class=\"tweet-bd\">" + this._formatTweet(t.text) + "</div>\n";
          html += "<div class=\"tweet-details\">\n";
          html += "<span>" + this.msg("text.tweetDetails", postedLink, t.source) + "</span>";
          if (this.oAuth != null)
          {
              html += "<span class=\"twitter-actions\">\n";
              //html += "<a href=\"\" class=\"twitter-favorite-link\"><span>" + this.msg("link.favorite") + "</span></a>\n";
              html += "<a href=\"\" class=\"twitter-retweet-link\"><span>" + this.msg("link.retweet") + "</span></a>\n";
              html += "<a href=\"\" class=\"twitter-reply-link\"><span>" + this.msg("link.reply") + "</span></a>\n";
              html += "</span>\n";
          }
          html += "</div>\n";
          html += "</div>\n"; // end tweet
          html += "</div>\n"; // end list-tweet
          return html;
       },

       /**
        * Insert links into Tweet text to highlight users, hashtags and links
        * 
        * @method _formatTweet
        * @private
        * @param {string} text The plain tweet text
        * @return {string} The tweet text, with hyperlinks added
        */
       _formatTweet: function TwitterBase__formatTweet(text)
       {
          return text.replace(
                /https?:\/\/\S+[^\s.]/gm, "<a href=\"$&\">$&</a>").replace(
                /@(\w+)/gm, "<a href=\"http://twitter.com/$1\">$&</a>").replace(
                /#(\w+)/gm, "<a href=\"http://twitter.com/search?q=%23$1\">$&</a>");
       },
       
       /**
        * Get the ID of the earliest Tweet in the timeline
        * 
        * @method _getEarliestTweetId
        * @private
        * @return {string} The ID of the earliest Tweet shown in the timeline, or null if
        * no Tweets are available or the last Tweet has no compatible ID on its element
        */
       _getEarliestTweetId: function TwitterBase__getEarliestTweetId()
       {
          var div = Dom.getLastChild(this.widgets.timeline);
          if (div !== null)
          {
             var id = Dom.getAttribute(div, "id");
             if (id !== null && id.lastIndexOf("-") != -1)
             {
                return id.substring(id.lastIndexOf("-") + 1);
             }
          }
          return null;
       },
       
       /**
        * Get the ID of the latest Tweet in the timeline
        * 
        * @method _getLatestTweetId
        * @private
        * @return {string} The ID of the latest Tweet shown in the timeline, or null if
        * no Tweets are available or the last Tweet has no compatible ID on its element
        */
       _getLatestTweetId: function TwitterBase__getLatestTweetId()
       {
          var div = Dom.getFirstChild(this.widgets.timeline);
          if (div !== null)
          {
             var id = Dom.getAttribute(div, "id");
             if (id !== null && id.lastIndexOf("-") != -1)
             {
                return id.substring(id.lastIndexOf("-") + 1);
             }
          }
          return null;
       },

       /**
        * Reset the poll timer
        * 
        * @method _resetCounter
        * @private
        */
       _resetTimer: function TwitterBase__resetTimer()
       {
          this._stopTimer();
          if (this.options.checkInterval > 0)
          {
             // Schedule next transition
             this.pollTimer = YAHOO.lang.later(this.options.checkInterval * 1000, this, this.pollNew);
          }
       },

       /**
        * Stop the poll timer
        * 
        * @method _stopTimer
        * @private
        */
       _stopTimer: function TwitterBase__stopTimer()
       {
          if (this.pollTimer != null)
          {
             this.pollTimer.cancel();
          }
       },
       
       /**
        * Set up or refresh new tweets notification area
        * 
        * @method _refreshNotification
        * @private
        */
       _refreshNotification: function TwitterBase__refreshNotification()
       {
           if (this.newTweets != null && this.newTweets.length > 0)
           {
              // Create notification
              if (this.newTweets.length == 1)
              {
                 this.widgets.notifications.innerHTML = this.msg("message.newTweet");
              }
              else
              {
                 this.widgets.notifications.innerHTML = this.msg("message.newTweets", this.newTweets.length);
              }
              Dom.setStyle(this.widgets.notifications, "display", "block");
           }
           else
           {
              // Remove notification
              Dom.setStyle(this.widgets.notifications, "display", "none");
           }
       },
       
       /**
        * Get relative time where possible, otherwise just return a simple string representation of the suppplied date
        * 
        * @method _relativeTime
        * @private
        * @param d {date} Date object
        */
       _relativeTime: function TwitterBase__getRelativeTime(d)
       {
           return typeof(Alfresco.util.relativeTime) === "function" ? Alfresco.util.relativeTime(d) : Alfresco.util.formatDate(d)
       },

       /**
        * Re-render relative post times in the tweet stream
        * 
        * @method _refreshDates
        * @private
        */
       _refreshDates: function TwitterBase__refreshDates()
       {
          var els = Dom.getElementsByClassName("tweet-date", "span", this.widgets.timeline), dEl;
          for (var i = 0; i < els.length; i++)
          {
             dEl = els[i];
             dEl.innerHTML = this._relativeTime(new Date(Dom.getAttribute(dEl, "title")));
          }
       },

       /**
        * Request data from the web service
        * 
        * @method _request
        */
       _request: function TwitterBase__request(p_obj)
       {
       },

       /**
        * YUI WIDGET EVENT HANDLERS
        * Handlers for standard events fired from YUI widgets, e.g. "click"
        */

       /**
        * Click handler for Show More button
        *
        * @method onMoreButtonClick
        * @param e {object} HTML event
        */
       onMoreButtonClick: function TwitterBase_onMoreButtonClick(e, obj)
       {
          // Disable the button while we make the request
          this.widgets.moreButton.set("disabled", true);
          this.extend();
       },

       /**
        * Click handler for show new tweets link
        *
        * @method onShowNewClick
        * @param e {object} HTML event
        */
       onShowNewClick: function TwitterBase_onShowNewClick(e, obj)
       {
          Event.stopEvent(e);
          if (this.newTweets !== null && this.newTweets.length > 0)
          {
             var thtml = this._generateTweetsHTML(this.newTweets), tEl;
             // Remove existing tweets with the same ID
             for (var i = 0; i < this.newTweets.length; i++)
             {
                tEl = document.getElementById(this.id + "-tweet-" + this.newTweets[i].id_str);
                if (tEl != null)
                {
                   this.widgets.timeline.removeChild(tEl);
                }
             }
             this._refreshDates(); // Refresh existing dates
             this.widgets.timeline.innerHTML = thtml + this.widgets.timeline.innerHTML;
             this.newTweets = null;
             this.latestTweetId = this._getLatestTweetId();
          }
          
          // Fade out the notification
          this._refreshNotification();
       }
   });
   
})();

/**
 * Twitter timeline dashlet.
 * 
 * @namespace Alfresco
 * @class Extras.dashlet.TwitterTimeline
 */
(function()
{
   /**
    * YUI Library aliases
    */
   var Dom = YAHOO.util.Dom,
      Event = YAHOO.util.Event;

   /**
    * Alfresco Slingshot aliases
    */
   var $html = Alfresco.util.encodeHTML,
      $combine = Alfresco.util.combinePaths;


   /**
    * Dashboard TwitterTimeline constructor.
    * 
    * @param {String} htmlId The HTML id of the parent element
    * @return {Extras.dashlet.TwitterTimeline} The new component instance
    * @constructor
    */
   Extras.dashlet.TwitterTimeline = function TwitterTimeline_constructor(htmlId)
   {
      return Extras.dashlet.TwitterTimeline.superclass.constructor.call(this, "Extras.dashlet.TwitterTimeline", htmlId, ["selector", "event-delegate"]);
   };

   /**
    * Extend from Extras.dashlet.TwitterBase and add class implementation
    */
   YAHOO.extend(Extras.dashlet.TwitterTimeline, Extras.dashlet.TwitterBase,
   {

      /**
       * Fired by YUI when parent element is available for scripting
       * 
       * @method onReady
       */
      onReady: function TwitterTimeline_onReady()
      {
          Extras.dashlet.TwitterTimeline.superclass.onReady.call(this);
          
          // Connect button
          this.widgets.connect = Dom.get(this.id + "-connect");

          // Toolbar div
          this.widgets.toolbar = Dom.get(this.id + "-toolbar");
          
          // Set up the Connect button
          this.widgets.connectButton = new YAHOO.widget.Button(
             this.id + "-btn-connect",
             {
                disabled: true,
                onclick: {
                   fn: this.onConnectButtonClick,
                   obj: this.widgets.connectButton,
                   scope: this
                }
             }
          );
          
          // Utility links
          this.widgets.utils = Dom.get(this.id + "-utils");
          Event.addListener(this.id + "-link-disconnect", "click", this.onDisconnectClick, this, true);

          // New tweet link
          Event.addListener(this.id + "-link-new-tweet", "click", this.onNewTweetClick, this, true);

          // Delegate setting up the favorite/retweet/reply links
          Event.delegate(this.widgets.timeline, "click", this.onTweetFavoriteClick, "a.twitter-favorite-link", this, true);
          Event.delegate(this.widgets.timeline, "click", this.onTweetRetweetClick, "a.twitter-retweet-link", this, true);
          Event.delegate(this.widgets.timeline, "click", this.onTweetReplyClick, "a.twitter-reply-link", this, true);
          
         // TODO Check OAuth is supported and warn if not
         
         this.oAuth = new Extras.OAuthHelper().setOptions({
             providerId: "twitter",
             endpointId: "twitter-auth",
             requestTokenCallbackUri: window.location.href + "?cmpt_htmlid="  + encodeURIComponent(this.id)
         });
         
         this.oAuth.init({
             successCallback: { 
                 fn: function TwitterTimeline_onReady_oAuthInit()
                 {
                     if (this.oAuth.isAuthorized()) // An access token exists
                     {
                         // Run the success handler directly to load the messages
                         this.onAuthSuccess();
                     }
                     else if (this.oAuth.hasToken()) // Found a request token (TODO persist verifier via a web script and redirect user back)
                     {
                         // Get verifier from URL
                         var verifier = Alfresco.util.getQueryStringParameter("oauth_verifier", window.location.href),
                             cid = Alfresco.util.getQueryStringParameter("cmpt_htmlid", window.location.href);
                         if (verifier != null && cid != null && cid == this.id)
                         {
                             this.oAuth.requestAccessToken(this.oAuth.authData, verifier, {
                                 successCallback: {
                                     fn: this.onAuthSuccess, 
                                     scope: this
                                 },
                                 failureHandler: {
                                     fn: this.onAuthFailure,
                                     scope: this
                                 }
                             });
                         }
                     }
                     else // Not connected at all
                     {
                         // Display the Connect information and button
                         Dom.setStyle(this.widgets.connect, "display", "block");
                         // Enable the button
                         this.widgets.connectButton.set("disabled", false);
                         // Display the toolbar
                         Dom.setStyle(this.widgets.toolbar, "display", "block");
                     }
                 }, 
                 scope: this
             },
             failureHandler: { 
                 fn: function TwitterTimeline_onReady_oAuthInit() {
                     // Failed to init the oauth helper, e.g. credentials not loaded
                     Alfresco.util.PopupManager.displayMessage({
                         text: this.msg("error.initOAuth")
                     });
                 }, 
                 scope: this
             }
         });
      },
      
      /**
       * Callback method used to prompt the user for a verification code to confirm that the
       * application has been granted access
       * 
       * @method onRequestTokenGranted
       * @param {object} obj Object literal containing properties
       *    authParams {object} Parameters received from get token stage
       *    onComplete {function} the callback function to be called to pass back the value provided by the user
       */
      onRequestTokenGranted: function TwitterTimeline_onRequestTokenGranted(obj)
      {
          Alfresco.util.assertNotEmpty(obj);
          Alfresco.util.assertNotEmpty(obj.authParams);
          Alfresco.util.assertNotEmpty(obj.onComplete);
          
          var authToken = obj.authParams.oauth_token,
              callbackConfirmed = obj.authParams.oauth_callback_confirmed,
              callbackFn = obj.onComplete,
              authorizationUrl = "http://api.twitter.com/oauth/authorize?oauth_token=" + authToken;
          
          if (callbackConfirmed == "true")
          {
              // Save the request token data
              this.oAuth.saveCredentials({
                  successCallback: {
                      fn: function() {
                          // Navigate to the authorization page
                          window.location.href = authorizationUrl;
                      },
                      scope: this
                  }
              });
          }
          else
          {
              Alfresco.util.PopupManager.displayMessage({
                  text: "Callback was not confirmed"
              });
          }
      },
      
      /**
       * Callback method to use to set up the dashlet when it is known that the authentication
       * has completed successfully
       * 
       * @method onAuthSuccess
       */
      onAuthSuccess: function TwitterTimeline_onAuthSuccess()
      {
          // TODO Wire this up with Bubbling, so multiple dashlets will work

          // Remove the Connect information and button, if they are shown
          Dom.setStyle(this.widgets.connect, "display", "none");
          
          // Enable the Disconnect button
          Dom.setStyle(this.widgets.utils, "display", "block");
          
          // Display the toolbar
          Dom.setStyle(this.widgets.toolbar, "display", "block");
          
          this.load();
      },
      
      /**
       * Callback method when a problem occurs with the authentication
       * 
       * @method onAuthFailure
       */
      onAuthFailure: function TwitterTimeline_onAuthFailure()
      {
          Alfresco.util.PopupManager.displayMessage({
              text: this.msg("error.general")
          });
      },
      
      /**
       * Timeline loaded successfully
       * 
       * @method onLoadSuccess
       * @param p_response {object} Response object from request
       * @param p_obj {object} Custom object passed to function
       */
      onLoadSuccess: function TwitterTimeline_onLoadSuccess(p_response, p_obj)
      {
         // Update the dashlet title
         this.widgets.title.innerHTML = this.msg("header.userTimeline", this._getTwitterUser());
         
         var html = "", tweets, t,userLink, postedLink, isList = this._getTwitterUser().indexOf("/") > 0;
         
         if (p_response.json)
         {
            tweets = p_response.json;
            
            if (tweets.length > 0)
            {
               html += this._generateTweetsHTML(tweets);
            }
            else
            {
               html += "<div class=\"detail-list-item first-item last-item\">\n";
               html += "<span>\n";
               if (isList)
               {
                  html += this.msg("list.noTweets");
               }
               else
               {
                  html += this.msg("user.noTweets");
               }
               html += "</span>\n";
               html += "</div>\n";
            }
         }
         
         this.widgets.timeline.innerHTML = html;
         
         // Enable the Load More button
         this.widgets.moreButton.set("disabled", false);
         Dom.setStyle(this.widgets.buttons, "display", "block");
         
         // Start the timer to poll for new tweets, if enabled
         this._resetTimer();
      },

      /**
       * Timeline load failed
       * 
       * @method onLoadFailure
       * @param p_response {object} Response object from request
       * @param p_obj {object} Custom object passed to function
       */
      onLoadFailure: function TwitterTimeline_onLoadFailure(p_response, p_obj)
      {
         // Update the dashlet title
         this.widgets.title.innerHTML = this.msg("header.userTimeline", this._getTwitterUser());
          
         var status = p_response.serverResponse.status,
            isList = this._getTwitterUser().indexOf("/") > 0;
         if (status == 401 || status == 404)
         {
            this.widgets.timeline.innerHTML = "<div class=\"msg\">" + this.msg("error." + (isList ? "list" : "user") + "." + status) + "</div>";
         }
         else
         {
            this.widgets.timeline.innerHTML = "<div class=\"msg\">" + this.msg("label.error") + "</div>";
         }
         
         // Disable the Load More button
         this.widgets.moreButton.set("disabled", true);
         Dom.setStyle(this.widgets.buttons, "display", "none");
      },
      
      /**
       * PRIVATE FUNCTIONS
       */
      
      /**
       * Get the current Twitter user or list ID
       * 
       * @method _getTwitterUser
       * @private
       * @return {string} The name of the currently-configured user or list, or the default
       * user/list if unconfigured or blank
       */
      _getTwitterUser: function TwitterTimeline__getTwitterUser()
      {
         if (this.oAuth.authData && this.oAuth.authData.screen_name)
         {
             return this.oAuth.authData.screen_name;
         }
         else
         {
             return null;
         }
      },

      /**
       * Request data from the web service
       * 
       * @method _request
       */
      _request: function TwitterTimeline__request(p_obj)
      {
         var url;
         var params = {};

         url = "/1/statuses/home_timeline.json";
         params = {
                 per_page: p_obj.dataObj.pageSize || this.options.pageSize
         };

         if (p_obj.dataObj.maxId != null)
         {
             params.max_id = p_obj.dataObj.maxId;
         }
         if (p_obj.dataObj.minId != null)
         {
             params.since_id = p_obj.dataObj.minId;
         }
         
         // Load the timeline
         this.oAuth.request(
         {
            url: url,
            dataObj: params,
            successCallback: p_obj.successCallback,
            failureCallback:  p_obj.failureCallback
         });
      },
      
      /**
       * Post a new tweet
       *
       * @method _postTweet
       * @param replyToId {string} ID of tweet this is in reply to, null otherwise
       * @param text {string} Text to prepopulate the textarea
       */
      _postTweet: function TwitterTimeline__postTweet(replyToId, text)
      {
         var panel = Alfresco.util.PopupManager.getUserInput({
             title: this.msg("title.new-tweet"),
             value: text || "",
             callback:
             {
                 fn: function TwitterTimeline_onNewPostClick_postCB(value, obj) {
                     if (value != null && value != "")
                     {
                         var dataObj = {
                                 status: value
                         };
                         if (replyToId)
                             dataObj.in_reply_to_status_id = replyToId;
                         
                         // Post the update
                         this.oAuth.request({
                             url: "/1/statuses/update.json",
                             method: "POST",
                             dataObj: dataObj,
                             requestContentType: Alfresco.util.Ajax.FORM,
                             successCallback: {
                                 fn: function(o) {
                                     if (o.responseText == "")
                                     {
                                         throw "Empty response received";
                                     }
                                     else
                                     {
                                         if (typeof o.json == "object")
                                         {
                                             var thtml = this._generateTweetsHTML([o.json]);
                                             this._refreshDates(); // Refresh existing dates
                                             this.widgets.timeline.innerHTML = thtml + this.widgets.timeline.innerHTML;
                                         }
                                         else
                                         {
                                             throw "Could not parse JSON response";
                                         }
                                     }
                                 },
                                 scope: this
                             },
                             failureCallback: {
                                 fn: function() {
                                     Alfresco.util.PopupManager.displayMessage({
                                         text: this.msg("error.post-tweet")
                                     });
                                 },
                                 scope: this
                             }
                         });
                     }
                 },
                 scope: this
             }
         });
      },

      /**
       * YUI WIDGET EVENT HANDLERS
       * Handlers for standard events fired from YUI widgets, e.g. "click"
       */

      /**
       * Click handler for Connect button
       *
       * @method onConnectButtonClick
       * @param e {object} HTML event
       */
      onConnectButtonClick: function TwitterTimeline_onConnectButtonClick(e, obj)
      {
         // Disable the button while we make the request
         this.widgets.connectButton.set("disabled", true);

         if (!this.oAuth.isAuthorized()) // Double-check we are still not connected
         {
             this.oAuth.requestToken({
                 successCallback: { 
                     fn: this.onAuthSuccess, 
                     scope: this
                 },
                 failureHandler: { 
                     fn: this.onAuthFailure, 
                     scope: this
                 },
                 requestTokenHandler:  { 
                     fn: this.onRequestTokenGranted, 
                     scope: this
                 }
             });
         }
         else
         {
             this.onAuthSuccess();
         }
      },
      
      /**
       * Click handler for Disconnect link
       *
       * @method onDisconnectClick
       * @param e {object} HTML event
       */
      onDisconnectClick: function TwitterTimeline_onDisconnectClick(e, obj)
      {
         // Prevent default action
         Event.stopEvent(e);
         
         var me = this;
         
         Alfresco.util.PopupManager.displayPrompt({
             title: this.msg("title.disconnect"),
             text: this.msg("label.disconnect"),
             buttons: [
                 {
                     text: Alfresco.util.message("button.ok", this.name),
                     handler: function TwitterTimeline_onDisconnectClick_okClick() {
                         me.oAuth.clearCredentials();
                         me.oAuth.saveCredentials();
                         // Remove existing messages
                         me.widgets.timeline.innerHTML = "";
                         // Display the Connect information and button
                         Dom.setStyle(me.widgets.connect, "display", "block");
                         // Enable the Connect button
                         me.widgets.connectButton.set("disabled", false);
                         // Disable the Disconnect button and More button
                         Dom.setStyle(me.widgets.utils, "display", "none");
                         Dom.setStyle(me.widgets.buttons, "display", "none");
                         // Disable the toolbar
                         Dom.setStyle(me.widgets.toolbar, "display", "none");
                         this.destroy();
                     },
                     isDefault: true
                 },
                 {
                     text: Alfresco.util.message("button.cancel", this.name),
                     handler: function TwitterTimeline_onDisconnectClick_cancelClick() {
                         this.destroy();
                     }
                 }
             ]
         });
      },
      
      /**
       * Click handler for New Tweet link
       *
       * @method onNewTweetClick
       * @param e {object} HTML event
       */
      onNewTweetClick: function TwitterTimeline_onNewPostClick(e, obj)
      {
         // Prevent default action
         Event.stopEvent(e);
         this._postTweet(null);
      },
      
      /**
       * Click handler for Reply link
       *
       * @method onTweetReplyClick
       * @param e {object} HTML event
       */
      onTweetReplyClick: function TwitterTimeline_onTweetReplyClick(e, matchEl, obj)
      {
         // Prevent default action
         Event.stopEvent(e);
         
         var tEl = Dom.getAncestorByClassName(matchEl, "tweet"),
             elId = tEl.id,
             tId = elId.substring(elId.lastIndexOf("-") + 1), // Tweet id
             snEl = Dom.getElementsByClassName("screen-name", "span" ,tEl)[0],
             sn = snEl.textContent || snEl.innerText;
         
         this._postTweet(tId, "@" + sn + " ");
      },
      
      /**
       * Click handler for Retweet link
       *
       * @method onTweetRetweetClick
       * @param e {object} HTML event
       */
      onTweetRetweetClick: function TwitterTimeline_onTweetRetweetClick(e, matchEl, obj)
      {
         // Prevent default action
         Event.stopEvent(e);
         
         var elId = Dom.getAncestorByClassName(matchEl, "user-tweet").id,
             tId = elId.substring(elId.lastIndexOf("-") + 1); // Tweet id
         
         var me = this;
         
         Alfresco.util.PopupManager.displayPrompt({
             title: this.msg("title.retweet"),
             text: this.msg("label.retweet"),
             buttons: [
                 {
                     text: Alfresco.util.message("button.ok", this.name),
                     handler: function TwitterTimeline_onRetweetClick_okClick() {
                         me.oAuth.request({
                             url: "/1/statuses/retweet/" + tId + ".json",
                             method: "POST",
                             successCallback: {
                                 fn: function(o) {
                                     if (o.responseText == "")
                                     {
                                         throw "Empty response received";
                                     }
                                     else
                                     {
                                         if (typeof o.json == "object")
                                         {
                                             var thtml = me._generateTweetsHTML([o.json]);
                                             me._refreshDates(); // Refresh existing dates
                                             me.widgets.timeline.innerHTML = thtml + me.widgets.timeline.innerHTML;
                                         }
                                         else
                                         {
                                             throw "Could not parse JSON response";
                                         }
                                     }
                                 },
                                 scope: this
                             },
                             failureCallback: {
                                 fn: function() {
                                     Alfresco.util.PopupManager.displayMessage({
                                         text: me.msg("error.retweet")
                                     });
                                 },
                                 scope: this
                             }
                         });
                         this.destroy();
                     },
                     isDefault: true
                 },
                 {
                     text: Alfresco.util.message("button.cancel", this.name),
                     handler: function TwitterTimeline_onDisconnectClick_cancelClick() {
                         this.destroy();
                     }
                 }
             ]
         });
      }
      
   });
})();

/**
 * Twitter feed dashlet.
 * 
 * @namespace Alfresco
 * @class Extras.dashlet.TwitterUserTimeline
 */
(function()
{
   /**
    * YUI Library aliases
    */
   var Dom = YAHOO.util.Dom,
      Event = YAHOO.util.Event;

   /**
    * Alfresco Slingshot aliases
    */
   var $html = Alfresco.util.encodeHTML,
      $combine = Alfresco.util.combinePaths;


   /**
    * Dashboard TwitterUserTimeline constructor.
    * 
    * @param {String} htmlId The HTML id of the parent element
    * @return {Extras.dashlet.TwitterUserTimeline} The new component instance
    * @constructor
    */
   Extras.dashlet.TwitterUserTimeline = function TwitterUserTimeline_constructor(htmlId)
   {
      return Extras.dashlet.TwitterUserTimeline.superclass.constructor.call(this, "Extras.dashlet.TwitterUserTimeline", htmlId);
   };

   /**
    * Extend from Extras.dashlet.TwitterBase and add class implementation
    */
   YAHOO.extend(Extras.dashlet.TwitterUserTimeline, Extras.dashlet.TwitterBase,
   {
      /**
       * Object container for initialization options
       *
       * @property options
       * @type object
       */
      options: YAHOO.lang.merge(Extras.dashlet.TwitterBase.prototype.options,
      {
         /**
          * Twitter username of the user to display the timeline for
          * 
          * @property twitterUser
          * @type string
          * @default ""
          */
         twitterUser: "",

         /**
          * Default Twitter username of the user to display the timeline for, if no specific user is configured
          * 
          * @property defaultTwitterUser
          * @type string
          * @default ""
          */
         defaultTwitterUser: ""
      }),

      /**
       * Fired by YUI when parent element is available for scripting
       * 
       * @method onReady
       */
      onReady: function TwitterUserTimeline_onReady()
      {
          Extras.dashlet.TwitterTimeline.superclass.onReady.call(this);
          // Load the timeline
          this.load();
      },
      
      /**
       * Timeline loaded successfully
       * 
       * @method onLoadSuccess
       * @param p_response {object} Response object from request
       * @param p_obj {object} Custom object passed to function
       */
      onLoadSuccess: function TwitterUserTimeline_onLoadSuccess(p_response, p_obj)
      {
         // Update the dashlet title
         this.widgets.title.innerHTML = this.msg("header.userTimeline", this._getTwitterUser());
         
         var html = "", tweets, t,userLink, postedLink, isList = this._getTwitterUser().indexOf("/") > 0;
         
         if (p_response.json)
         {
            tweets = p_response.json;
            
            if (tweets.length > 0)
            {
               html += this._generateTweetsHTML(tweets);
            }
            else
            {
               html += "<div class=\"detail-list-item first-item last-item\">\n";
               html += "<span>\n";
               if (isList)
               {
                  html += this.msg("list.noTweets");
               }
               else
               {
                  html += this.msg("user.noTweets");
               }
               html += "</span>\n";
               html += "</div>\n";
            }
         }
         
         this.widgets.timeline.innerHTML = html;
         
         // Enable the Load More button
         this.widgets.moreButton.set("disabled", false);
         Dom.setStyle(this.widgets.buttons, "display", "block");
         
         // Start the timer to poll for new tweets, if enabled
         this._resetTimer();
      },

      /**
       * Timeline load failed
       * 
       * @method onLoadFailure
       * @param p_response {object} Response object from request
       * @param p_obj {object} Custom object passed to function
       */
      onLoadFailure: function TwitterUserTimeline_onLoadFailure(p_response, p_obj)
      {
         // Update the dashlet title
         this.widgets.title.innerHTML = this.msg("header.userTimeline", this._getTwitterUser());
          
         var status = p_response.serverResponse.status,
            isList = this._getTwitterUser().indexOf("/") > 0;
         if (status == 401 || status == 404)
         {
            this.widgets.timeline.innerHTML = "<div class=\"msg\">" + this.msg("error." + (isList ? "list" : "user") + "." + status) + "</div>";
         }
         else
         {
            this.widgets.timeline.innerHTML = "<div class=\"msg\">" + this.msg("label.error") + "</div>";
         }
         
         // Disable the Load More button
         this.widgets.moreButton.set("disabled", true);
         Dom.setStyle(this.widgets.buttons, "display", "none");
      },
      
      /**
       * PRIVATE FUNCTIONS
       */
      
      /**
       * Get the current Twitter user or list ID
       * 
       * @method _getTwitterUser
       * @private
       * @return {string} The name of the currently-configured user or list, or the default
       * user/list if unconfigured or blank
       */
      _getTwitterUser: function TwitterUserTimeline__getTwitterUser()
      {
         return (this.options.twitterUser != null && this.options.twitterUser != "") ? 
               this.options.twitterUser : this.options.defaultTwitterUser;
      },

      /**
       * Request data from the web service
       * 
       * @method _request
       */
      _request: function TwitterUserTimeline__request(p_obj)
      {
         var url;
         var uparts = this._getTwitterUser().split("/");
         var params = {};

         if (uparts.length > 1)
         {
            url = Alfresco.constants.PROXY_URI.replace("/alfresco/", "/twitter/") + "1/" + uparts[0] + "/lists/" + uparts[1] + 
               "/statuses.json";
            params = {
                    per_page: p_obj.dataObj.pageSize || this.options.pageSize
            };
            /*
            url = Alfresco.constants.PROXY_URI.replace("/alfresco/", "/twitter/") + "1/statuses/lists/show.json";
            params = {
                    slug: uparts[0],
                    owner_screen_name: uparts[1],
                    per_page: p_obj.dataObj.pageSize || this.options.pageSize
            };*/
         }
         else
         {
            url = Alfresco.constants.PROXY_URI.replace("/alfresco/", "/twitter/") + "1/statuses/user_timeline.json";
            params = {
                    screen_name: uparts[0],
                    count: p_obj.dataObj.pageSize || this.options.pageSize,
                    include_rts: true
            };
         }

         if (p_obj.dataObj.maxId != null)
         {
             params.max_id = p_obj.dataObj.maxId;
         }
         if (p_obj.dataObj.minId != null)
         {
             params.since_id = p_obj.dataObj.minId;
         }
         
         // Load the timeline
         Alfresco.util.Ajax.request(
         {
            url: url,
            dataObj: params,
            successCallback: p_obj.successCallback,
            failureCallback: p_obj.failureCallback,
            scope: this,
            noReloadOnAuthFailure: true
         });
      },

      /**
       * YUI WIDGET EVENT HANDLERS
       * Handlers for standard events fired from YUI widgets, e.g. "click"
       */

      /**
       * Configuration click handler
       *
       * @method onConfigClick
       * @param e {object} HTML event
       */
      onConfigClick: function TwitterUserTimeline_onConfigClick(e)
      {
         var actionUrl = Alfresco.constants.URL_SERVICECONTEXT + "modules/dashlet/config/" + encodeURIComponent(this.options.componentId);
         
         Event.stopEvent(e);
         
         if (!this.configDialog)
         {
            this.configDialog = new Alfresco.module.SimpleDialog(this.id + "-configDialog").setOptions(
            {
               width: "50em",
               templateUrl: Alfresco.constants.URL_SERVICECONTEXT + "extras/modules/dashlets/twitter-user-timeline/config", actionUrl: actionUrl,
               onSuccess:
               {
                  fn: function VideoWidget_onConfigFeed_callback(response)
                  {
                     // Refresh the feed
                     var u = YAHOO.lang.trim(Dom.get(this.configDialog.id + "-twitterUser").value),
                        newUser = (u != "") ? u : this.options.defaultTwitterUser;
                     
                     if (this.options.twitterUser != newUser)
                     {
                        this.options.twitterUser = newUser;
                        this.load();
                     }
                  },
                  scope: this
               },
               doSetupFormsValidation:
               {
                  fn: function VideoWidget_doSetupForm_callback(form)
                  {
                     Dom.get(this.configDialog.id + "-twitterUser").value = this._getTwitterUser();

                     // Search term is mandatory
                     this.configDialog.form.addValidation(this.configDialog.id + "-twitterUser", Alfresco.forms.validation.mandatory, null, "keyup");
                     this.configDialog.form.addValidation(this.configDialog.id + "-twitterUser", Alfresco.forms.validation.mandatory, null, "blur");
                  },
                  scope: this
               }
            });
         }
         else
         {
            this.configDialog.setOptions(
            {
               actionUrl: actionUrl,
               twitterUser: this.options.twitterUser
            });
         }
         this.configDialog.show();
      }
      
   });
})();

/**
 * Twitter search dashlet.
 * 
 * @namespace Alfresco
 * @class Extras.dashlet.TwitterSearch
 */
(function()
{
   /**
    * YUI Library aliases
    */
   var Dom = YAHOO.util.Dom,
      Event = YAHOO.util.Event;

   /**
    * Alfresco Slingshot aliases
    */
   var $html = Alfresco.util.encodeHTML,
      $combine = Alfresco.util.combinePaths;

   /**
    * Dashboard TwitterSearch constructor.
    * 
    * @param {String} htmlId The HTML id of the parent element
    * @return {Extras.dashlet.TwitterSearch} The new component instance
    * @constructor
    */
   Extras.dashlet.TwitterSearch = function TwitterSearch_constructor(htmlId)
   {
      return Extras.dashlet.TwitterSearch.superclass.constructor.call(this, "Extras.dashlet.TwitterSearch", htmlId);
   };

   /**
    * Extend from Extras.dashlet.TwitterBase and add class implementation
    */
   YAHOO.extend(Extras.dashlet.TwitterSearch, Extras.dashlet.TwitterBase,
   {
      /**
       * Object container for initialization options
       *
       * @property options
       * @type object
       */
      options: YAHOO.lang.merge(Extras.dashlet.TwitterBase.prototype.options,
      {
         /**
          * Twitter search term
          * 
          * @property searchTerm
          * @type string
          * @default ""
          */
         searchTerm: "",

         /**
          * Default Twitter search term, if no specific search term is configured
          * 
          * @property defaultSearchTerm
          * @type string
          * @default ""
          */
         defaultSearchTerm: ""
      }),

      /**
       * Fired by YUI when parent element is available for scripting
       * @method onReady
       */
      onReady: function TwitterSearch_onReady()
      {
          Extras.dashlet.TwitterTimeline.superclass.onReady.call(this);
         // Load the results
         this.load();
      },
      
      /**
       * Search results loaded successfully
       * 
       * @method onLoadSuccess
       * @param p_response {object} Response object from request
       * @param p_obj {object} Custom object passed to function
       */
      onLoadSuccess: function TwitterSearch_onLoadSuccess(p_response, p_obj)
      {
         // Update the dashlet title
         this.widgets.title.innerHTML = this.msg("header.search", encodeURIComponent(this._getSearchTerm()), this._getSearchTerm());
         
         var html = "", tweets;
         
         if (p_response.json)
         {
            tweets = p_response.json.results;
            
            if (tweets.length > 0)
            {
               html += this._generateTweetsHTML(tweets);
            }
            else
            {
               html += "<div class=\"msg\">\n";
               html += "<span>\n";
               html += this.msg("label.noTweets");
               html += "</span>\n";
               html += "</div>\n";
            }
         }
         
         this.widgets.timeline.innerHTML = html;
         
         // Empty the new tweets cache and remove any notification
         this.newTweets = [];
         this._refreshNotification();
         
         // Enable the Load More button
         this.widgets.moreButton.set("disabled", false);
         Dom.setStyle(this.widgets.buttons, "display", "block");
         
         // Start the timer to poll for new tweets, if enabled
         this._resetTimer();
      },

      /**
       * Search results load failed
       * 
       * @method onLoadFailure
       * @param p_response {object} Response object from request
       * @param p_obj {object} Custom object passed to function
       */
      onLoadFailure: function TwitterSearch_onLoadFailure(p_response, p_obj)
      {
         // Update the dashlet title
         this.widgets.title.innerHTML = this.msg("header.search", encodeURIComponent(this._getSearchTerm()), this._getSearchTerm());
         
         // Update the content
         this.widgets.timeline.innerHTML = "<div class=\"msg\">" + this.msg("label.error") + "</div>";
         
         // Disable the Load More button
         this.widgets.moreButton.set("disabled", true);
         Dom.setStyle(this.widgets.buttons, "display", "none");
      },
      
      /**
       * Extended timeline loaded successfully
       * 
       * @method onExtensionLoaded
       * @param p_response {object} Response object from request
       * @param p_obj {object} Custom object passed to function
       */
      onExtensionLoaded: function TwitterSearch_onExtensionLoaded(p_response, p_obj)
      {
         this._refreshDates(); // Refresh existing dates
         this.widgets.timeline.innerHTML += this._generateTweetsHTML(p_response.json.results.slice(1)); // Do not include duplicate tweet
         this.widgets.moreButton.set("disabled", false);
      },
      
      /**
       * PRIVATE FUNCTIONS
       */
      
      /**
       * Generate HTML markup for a single Tweet
       * 
       * @method _generateTweetHTML
       * @private
       * @param t {object} Tweet object to render into HTML
       * @param rt {object} Retweet object, if the Tweet has been RT'ed
       * @return {string} HTML markup
       */
      _generateTweetHTML: function TwitterSearch__generateTweetHTML(t, rt)
      {
         var html = "", 
            profileUri = "http://twitter.com/" + encodeURIComponent(t.from_user),
            userLink = "<a href=\"" + profileUri + "\" title=\"" + $html(t.from_user) + "\" class=\"theme-color-1\">" + $html(t.from_user) + "</a>",
            postedRe = /([A-Za-z]{3}) ([A-Za-z]{3}) ([0-9]{2}) ([0-9]{2}:[0-9]{2}:[0-9]{2}) (\+[0-9]{4}) ([0-9]{4})/,
            postedMatch = postedRe.exec(t.created_at),
            postedOn = postedMatch != null ? (postedMatch[1] + ", " + postedMatch[3] + " " + postedMatch[2] + " " + postedMatch[6] + " " + postedMatch[4] + " GMT" + postedMatch[5]) : (t.created_at),
            postedLink = "<a href=\"" + profileUri + "\/status\/" + encodeURIComponent(t.id_str) + "\"><span class=\"tweet-date\" title=\"" + postedOn + "\">" + this._relativeTime(new Date(postedOn)) + "</span><\/a>";

         html += "<div class=\"user-tweet detail-list-item\" id=\"" + $html(this.id) + "-tweet-" + $html(t.id_str) + "\">\n";
         html += "<div class=\"user-icon\"><a href=\"" + profileUri + "\" title=\"" + $html(t.from_user) + "\"><img src=\"" + $html(t.profile_image_url) + "\" alt=\"" + $html(t.from_user) + "\" width=\"48\" height=\"48\" /></a></div>\n";
         html += "<div class=\"tweet\">\n";
         html += "<div class=\"tweet-hd\">\n";
         html += "<span class=\"screen-name\">" + userLink + "</span>\n";
         html += "</div>\n";
         html += "<div class=\"tweet-bd\">" + this._formatTweet(t.text) + "</div>\n";
         html += "<div class=\"tweet-details\">" + this.msg("text.tweetDetails", postedLink, Alfresco.util.decodeHTML(t.source)) + "</div>\n";
         html += "</div>\n"; // end tweet
         html += "</div>\n"; // end list-tweet
         return html;
      },
      
      /**
       * Get the current search term
       * 
       * @method getSearchTerm
       * @private
       * @return {string} The currently-configured search term, or the default if no value is configured
       */
      _getSearchTerm: function TwitterSearch__getSearchTerm()
      {
         return (this.options.searchTerm != "") ?
                 this.options.searchTerm : this.options.defaultSearchTerm;
      },

      /**
       * Request data from the web service
       * 
       * @method _request
       */
      _request: function TwitterSearch__request(p_obj)
      {
         var url = Alfresco.constants.PROXY_URI.replace("/alfresco/", "/twitter-search/") + "search.json";
         var params = {
                q: this._getSearchTerm(),
                result_type: "recent",
                rpp: p_obj.dataObj.pageSize || this.options.pageSize
         };

         if (p_obj.dataObj.maxId != null)
         {
             params.max_id = p_obj.dataObj.maxId;
         }
         if (p_obj.dataObj.minId != null)
         {
             params.since_id = p_obj.dataObj.minId;
         }
         
         // Load the timeline
         Alfresco.util.Ajax.request(
         {
            url: url,
            dataObj: params,
            successCallback: p_obj.successCallback,
            failureCallback: p_obj.failureCallback,
            scope: this,
            noReloadOnAuthFailure: true
         });
      },

      /**
       * YUI WIDGET EVENT HANDLERS
       * Handlers for standard events fired from YUI widgets, e.g. "click"
       */

      /**
       * Configuration click handler
       *
       * @method onConfigClick
       * @param e {object} HTML event
       */
      onConfigClick: function TwitterSearch_onConfigClick(e)
      {
         var actionUrl = Alfresco.constants.URL_SERVICECONTEXT + "modules/dashlet/config/" + encodeURIComponent(this.options.componentId);
         
         Event.stopEvent(e);
         
         if (!this.configDialog)
         {
            this.configDialog = new Alfresco.module.SimpleDialog(this.id + "-configDialog").setOptions(
            {
               width: "50em",
               templateUrl: Alfresco.constants.URL_SERVICECONTEXT + "extras/modules/dashlets/twitter-search/config", actionUrl: actionUrl,
               onSuccess:
               {
                  fn: function VideoWidget_onConfigFeed_callback(response)
                  {
                     // Refresh the feed
                     var u = YAHOO.lang.trim(Dom.get(this.configDialog.id + "-searchTerm").value),
                         newSearchTerm = (u != "") ? u : this.options.defaultSearchTerm;
                     
                     if (newSearchTerm != this.options.searchTerm)
                     {
                        this.options.searchTerm = newSearchTerm;
                        this.load();
                     }
                  },
                  scope: this
               },
               doSetupFormsValidation:
               {
                  fn: function VideoWidget_doSetupForm_callback(form)
                  {
                     Dom.get(this.configDialog.id + "-searchTerm").value = this._getSearchTerm();
                     
                     // Search term is mandatory
                     this.configDialog.form.addValidation(this.configDialog.id + "-searchTerm", Alfresco.forms.validation.mandatory, null, "keyup");
                     this.configDialog.form.addValidation(this.configDialog.id + "-searchTerm", Alfresco.forms.validation.mandatory, null, "blur");
                  },
                  scope: this
               }
            });
         }
         else
         {
            this.configDialog.setOptions(
            {
               actionUrl: actionUrl,
               searchTerm: this.options.searchTerm
            })
         }
         this.configDialog.show();
      }
      
   });
})();
