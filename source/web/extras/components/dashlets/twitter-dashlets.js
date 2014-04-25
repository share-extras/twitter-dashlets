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
           * Endpoint ID used to access Twitter
           * 
           * @property endpointId
           * @type string
           * @default ""
           */
          endpointId: "",
          
          /**
           * Connector ID used to access Twitter
           * 
           * @property connectorId
           * @type string
           * @default ""
           */
          connectorId: "",

          /**
           * URL where the user is redirected to in order to authorize the application
           * 
           * @property authorizationUrl
           * @type string
           * @default ""
           */
          authorizationUrl: "",

          /**
           * Number of Tweets to load per batch
           * 
           * @property pageSize
           * @type int
           * @default 50
           */
          pageSize: 50,

          /**
           * Number of Tweets to load when polling for new tweets
           * 
           * @property maxNewTweets
           * @type int
           * @default 100
           */
          maxNewTweets: 100,

          /**
           * How often the dashlet should poll for new Tweets, in seconds. Setting to zero disables checking.
           * 
           * @property checkInterval
           * @type int
           * @default 300
           */
          checkInterval: 300,
          
          /**
           * Character count limit for a new tweet
           * 
           * @property tweetCharLimit
           * @type int
           * @default 140
           */
          tweetCharLimit: 140,
          
          /**
           * Maximum size of a non-HTTPS URL returned by the t.co shortening service
           * 
           * @property maxUrlSize
           * @type int
           * @default -1
           */
          maxUrlSize: -1,
          
          /**
           * Maximum size of a HTTPS URL returned by the t.co shortening service
           * 
           * @property maxUrlSize
           * @type int
           * @default -1
           */
          maxUrlSizeHttps: -1
       },

       /**
        * ID of the earlist known Tweet, not including newly-posted tweets from the current user
        * 
        * @property earliestTweetId
        * @type string
        * @default null
        */
       earliestTweetId: null,

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
          // The user timeline container
          this.widgets.timeline = Dom.get(this.id + "-timeline");
          
          // The dashlet title container
          this.widgets.title = Dom.get(this.id + "-title");

          // Loading icon div
          this.widgets.loading = Dom.get(this.id + "-loading");
          
          // The dashlet body container
          this.widgets.body = Dom.get(this.id + "-body");
          
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

          
          // Connect button
          this.widgets.connect = Dom.get(this.id + "-connect");

          // Toolbar div
          this.widgets.toolbar = Dom.get(this.id + "-toolbar");
          
          // Set up the Connect button
          if (this.widgets.connect != null)
          {
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
          }
          
          // Utility links
          this.widgets.utils = Dom.get(this.id + "-utils");
          Event.addListener(this.id + "-link-disconnect", "click", this.onDisconnectClick, this, true);

          // Delegate setting up the favorite/retweet/reply links
          Event.delegate(this.widgets.timeline, "click", this.onTweetFavoriteClick, "a.twitter-favorite-link, a.twitter-favorite-link-on", this, true);
          Event.delegate(this.widgets.timeline, "click", this.onTweetRetweetClick, "a.twitter-retweet-link", this, true);
          Event.delegate(this.widgets.timeline, "click", this.onTweetReplyClick, "a.twitter-reply-link", this, true);
          
          // Decoupled event listener for oauth disconnect events
          YAHOO.Bubbling.on("twitterDisconnect", this.onDisconnect, this);

          if (typeof Extras.OAuthHelper == "function")
          {
             this.oAuth = new Extras.OAuthHelper().setOptions({
                providerId: "twitter",
                endpointId: this.options.endpointId,
                connectorId: this.options.connectorId,
                authorizationUrl: this.options.authorizationUrl
             });
             this._oAuthInit();
          }
          else
          {
             Dom.getFirstChild(this.widgets.connect).innerHTML = this.msg("error.oauth-missing");
             this._hideToolbar();
             Dom.setStyle(this.widgets.connect, "display", "block");
          }
       },
       
       /**
        * (Re-)initialise the OAuth service. This loads data from the repo and will fire off the relevant 
        * handler methods based on the authorisation status.
        * 
        * @method _oAuthInit
        * @private
        */
       _oAuthInit: function TwitterBase__oAuthInit()
       {
          this.oAuth.init({
              successCallback: { 
                  fn: function TwitterBase_onReady_oAuthInit()
                  {
                      if (this.oAuth.isAuthorized()) // An access token exists
                      {
                          // Run the success handler directly to load the messages
                          this.onAuthSuccess();
                      }
                      else if (this.oAuth.hasToken()) // Found a request token
                      {
                          this.onRequestTokenAvailable();
                      }
                      else // Not connected at all
                      {
                         this.onNoTokenAvailable();
                      }
                  }, 
                  scope: this
              },
              failureHandler: { 
                  fn: function TwitterBase_onReady_oAuthInit() {
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
        * Callback method to use to set up the dashlet when it is known that the authentication
        * has completed successfully
        * 
        * @method onAuthSuccess
        */
       onAuthSuccess: function TwitterBase_onAuthSuccess()
       {
           // Remove the Connect information and button, if they are shown
           Dom.setStyle(this.widgets.connect, "display", "none");

           // Enable the Disconnect button
           this._showDisconnectButton();

           this.onConnect();
       },
       
       /**
        * Callback method when a problem occurs with the authentication
        * 
        * @method onAuthFailure
        */
       onAuthFailure: function TwitterBase_onAuthFailure()
       {
           Alfresco.util.PopupManager.displayMessage({
               text: this.msg("error.general")
           });
       },
       
       /**
        * Callback method for when a request token is available, but not an access token
        * 
        * @method onRequestTokenAvailable
        */
       onRequestTokenAvailable: function TwitterBase_onRequestTokenAvailable()
       {
           this._showDisconnectButton();
           // Display the Connect information and button
           Dom.setStyle(this.widgets.connect, "display", "block");
           // Enable the button
           this.widgets.connectButton.set("disabled", false);

           // Defer loading until the access token has been granted
           YAHOO.Bubbling.on("twitterAccessTokenGranted", function(layer, args) {
              // Re-initialise oauth
              this._oAuthInit();
           }, this);
       },
       
       /**
        * Callback method for when OAuth token is not available
        * 
        * @method onNoTokenAvailable
        */
       onNoTokenAvailable: function TwitterBase_onNoTokenAvailable()
       {
          // Display the Connect information and button
          Dom.setStyle(this.widgets.connect, "display", "block");
          // Enable the button
          this.widgets.connectButton.set("disabled", false);
       },

       /**
        * Reload the timeline from the Twitter API and refresh the contents of the dashlet
        * 
        * @method load
        */
       load: function TwitterBase_load()
       {
          // Reset earliest and latest tweet IDs
          this.earliestTweetId = null;
          this.latestTweetId = null;
          
          // Show the loading spinner
          this._showLoading();
          
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
          this._hideLoading();
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
          this._hideLoading();
       },

       /**
        * Load Tweets further back in time from the Twitter API and add to the dashlet contents
        * 
        * @method extend
        */
       extend: function TwitterBase_extend()
       {
          this._showLoading();
          // Load the user timeline
          this._request(
          {
             dataObj:
             {
                maxId: this.earliestTweetId,
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
          this._hideLoading();
          var tweets = p_response.json.slice(1);
          this._refreshDates(); // Refresh existing dates
          if (tweets.length > 0)
          {
             this.widgets.timeline.innerHTML += this._generateTweetsHTML(tweets);
             this.earliestTweetId = this._getEarliestTweetId(tweets);
          }
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
          this._hideLoading();
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
          
          // Show loading icon
          this._showLoading();
           
          // Load the user timeline
          this._request(
          {
             dataObj:
             {
                minId: this.latestTweetId,
                pageSize: this.options.maxNewTweets
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
          this._hideLoading();
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
          this._hideLoading();
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
                if (this.options.activeFilter == "direct")
                {
                   html += this._generateDirectMessageHTML(t);
                }
                else
                {
                   html += this._generateTweetHTML(t);
                }
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
             userLink = "<a href=\"" + profileUri + "\" title=\"" + $html(t.user.name) + "\" class=\"theme-color-1\" target=\"_blank\">" + $html(t.user.screen_name) + "</a>",
             postedRe = /([A-Za-z]{3}) ([A-Za-z]{3}) ([0-9]{2}) ([0-9]{2}:[0-9]{2}:[0-9]{2}) (\+[0-9]{4}) ([0-9]{4})/,
             postedMatch = postedRe.exec(t.created_at),
             postedOn = postedMatch != null ? (postedMatch[1] + ", " + postedMatch[3] + " " + postedMatch[2] + " " + postedMatch[6] + " " + postedMatch[4] + " GMT" + postedMatch[5]) : (t.created_at),
             postedLink = "<a href=\"" + profileUri + "\/status\/" + encodeURIComponent(t.id_str) + "\" target=\"_blank\"><span class=\"tweet-date\" title=\"" + postedOn + "\">" + this._relativeTime(new Date(postedOn)) + "</span><\/a>";

          html += "<div class=\"user-tweet" + " detail-list-item\" id=\"" + $html(this.id) + "-tweet-" + $html(t.id_str) + "\">\n";
          html += "<div class=\"user-icon\"><a href=\"" + profileUri + "\" title=\"" + $html(t.user.name) + "\" target=\"_blank\"><img src=\"" + $html(t.user.profile_image_url) + "\" alt=\"" + $html(t.user.screen_name) + "\" width=\"48\" height=\"48\" /></a></div>\n";
          html += "<div class=\"tweet\">\n";
          html += "<div class=\"tweet-hd\">\n";
          html += "<span class=\"screen-name\">" + userLink + "</span> <span class=\"user-name\">" + $html(t.user.name) + "</span>\n";
          html += !YAHOO.lang.isUndefined(rt) ? " <span class=\"retweeted\">" + this.msg("label.retweetedBy", rt.user.screen_name) + "</span>\n" : "";
          html += "</div>\n";
          html += "<div class=\"tweet-bd\">" + this._formatTweet(t) + "</div>\n";
          html += "<div class=\"tweet-details\">\n";
          html += "<span>" + this.msg("text.tweetDetails", postedLink, t.source) + "</span>";
          if (this.oAuth != null && this.oAuth.isAuthorized())
          {
              html += "<span class=\"twitter-actions\">\n";
              html += "<a href=\"\" class=\"twitter-favorite-link" + (t.favorited ? "-on" : "") + "\"><span>" + this.msg("link.favorite") + "</span></a>\n";
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
        * @param {string} t The tweet object from the JSON API
        * @return {string} The tweet text, with hyperlinks added
        */
       _formatTweet: function TwitterBase__formatTweet(t)
       {
          var text = t.text;
          function replaceLinks(url)
          {
             var title = "", entity;
             if (t.entities && t.entities.urls)
             {
                for (var i = 0; i < t.entities.urls.length; i++)
                {
                   entity = t.entities.urls[i];
                   if (url == entity.url)
                   {
                      return "<a href=\"" + url + "\" title=\"" + entity.expanded_url + "\" target=\"_blank\">" + entity.display_url + "</a>";
                   }
                }
             }
             return "<a href=\"" + url + "\" target=\"_blank\">" + url + "</a>";
          }
          return text.replace(
                /https?:\/\/\S+[^\s.]/gm, replaceLinks).replace(
                /@([^\s]+)\b/gm, "<a href=\"http://twitter.com/$1\" target=\"_blank\">$&</a>").replace(
                /#([^\s]+)\b/gm, "<a href=\"http://twitter.com/search?q=%23$1\" target=\"_blank\">#$1</a>");
       },
       
       /**
        * Get the ID of the earliest tweet a set of tweets, if later than the current known latest ID.
        * 
        * @method _getEarliestTweetId
        * @private
        * @param {array} tweets Array of tweet objects
        * @return {string} The ID of the earliest tweet, or null if no tweets are available
        */
       _getEarliestTweetId: function TwitterBase__getEarliestTweetId(tweets)
       {
           var earliestId = this.earliestTweetId, tid;
           for (var i = 0; i < tweets.length; i++)
           {
              tid = tweets[i].id_str;
              if (earliestId == null || tid.length < earliestId.length || tid < earliestId)
              {
                  earliestId = tid;
              }
           }
           return earliestId;
       },
       
       /**
        * Get the ID of the latest tweet a set of tweets, if earlier than the current known latest ID.
        * 
        * @method _getLatestTweetId
        * @private
        * @param {array} tweets Array of tweet objects
        * @return {string} The ID of the latest tweet, or null if no tweets are available
        */
       _getLatestTweetId: function TwitterBase__getLatestTweetId(tweets)
       {
          var latestId = this.latestTweetId, tid;
          for (var i = 0; i < tweets.length; i++)
          {
             tid = tweets[i].id_str;
             if (latestId == null || tid.length > latestId.length || tid > latestId)
             {
                 latestId = tid;
             }
          }
          return latestId;
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
              Dom.setStyle(this.widgets.notifications, "display", this.widgets.notifications.tagName.toLowerCase() == "span" ? "inline" : "block");
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
        * @private
        */
       _request: function TwitterBase__request(p_obj)
       {
       },
       
       /**
        * Make ajax request to the web service
        * 
        * @method _requestAjax
        * @private
        */
       _requestAjax: function TwitterBase__requestAjax(p_obj)
       {
          if (this.oAuth != null && this.oAuth.isAuthorized())
          {
             // Load the timeline via OAuth
             this.oAuth.request(
             {
                url: p_obj.url,
                dataObj: p_obj.params,
                successCallback: p_obj.successCallback,
                failureCallback:  p_obj.failureCallback
             });
          }
          else
          {
             // Load the timeline via regular XHR
             Alfresco.util.Ajax.request(
             {
                url: Alfresco.constants.PROXY_URI.replace("/alfresco/", "/" + p_obj.endpoint) + p_obj.url,
                dataObj: p_obj.params,
                successCallback: p_obj.successCallback,
                failureCallback: p_obj.failureCallback,
                scope: this,
                noReloadOnAuthFailure: true
             });
          }
       },

       /**
        * Hide the loading icon
        *
        * @method _hideLoading
        */
       _hideLoading: function TwitterBase__hideLoading()
       {
           if (this.widgets.loading != null)
           {
               Dom.setStyle(this.widgets.loading, "display", "none");
           }
       },

       /**
        * Show the loading icon
        *
        * @method _showLoading
        */
       _showLoading: function TwitterBase__showLoading()
       {
           if (this.widgets.loading != null)
           {
               Dom.setStyle(this.widgets.loading, "display", "inline");
           }
       },
       
       /**
        * Post a new tweet
        *
        * @method _postTweet
        * @param replyToId {string} ID of tweet this is in reply to, null otherwise
        * @param text {string} Text to prepopulate the textarea
        */
       _postTweet: function TwitterBase__postTweet(replyToId, text, title)
       {
          text = text || "";
          title = title || this.msg("title.new-tweet");
          var me = this,
             linkRe = new RegExp(/((http|ftp|https):\/\/[\w\-_]+(\.[\w\-_]+)+([\w\-\.,@?\^=%&:\/~\+#]*[\w\-\@?\^=%&\/~\+#])?)/gm),
             id = Alfresco.util.generateDomId(),
             maxCharCount = this.options.tweetCharLimit,
             html = '<div><textarea id="' + id + '-input" tabindex="0">' + (text || "") + '</textarea>' +
                '<input type="hidden" id="' + id + '-shortened"></input></div>' + 
                '<div><div id="' + id + '-count" class="twitter-char-count">' + (maxCharCount - text.length) + '</div>' +
                '<div id="' + id + '-status" class="twitter-post-status"></div></div>';
          
          var callBack = {
              fn: function TwitterBase_onNewPostClick_postCB(value, obj) {
                  if (value != null && value != "")
                  {
                      var dataObj = {
                              status: value
                      };
                      if (replyToId)
                          dataObj.in_reply_to_status_id = replyToId;
                      
                      // Post the update
                      this.oAuth.request({
                          url: "/1.1/statuses/update.json",
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
                                          this.onPostTweetSuccess(o);
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
          };

          /**
           * Return text
           */
          var getText = function() {
             var value = null, input = Dom.get(id + "-input");
             if (input)
             {
                value = input.value;
             }
             return value;
          }

          var countLinks = function(t) {
             if (t)
             {
                var m = t.match(linkRe);
                return m != null ? m.length : 0;
             }
             return 0;
          };

          var countContentChars = function(t) {
             if (t)
             {
                Alfresco.logger.debug("Non-link char count is " + YAHOO.lang.trim(t).replace(linkRe, "").length);
                return YAHOO.lang.trim(t).replace(linkRe, "").length;
             }
             return 0;
          };

          var countLinkChars = function(t) {
             if (t)
             {
                var count = 0, match, maxUrlSize = this.options.maxUrlSize, maxUrlSizeHttps = this.options.maxUrlSizeHttps;
                while ((match = linkRe.exec(t)) !== null)
                {
                   count += (maxUrlSize != -1 ? (match[2] == "https" ? maxUrlSizeHttps : maxUrlSize) : match[0].length);
                   if (Alfresco.logger.isDebugEnabled())
                   {
                      Alfresco.logger.debug("Link char count now " + count + " for URL " + match[0] + ", protocol " + match[2]);
                   }
                }
                if (Alfresco.logger.isDebugEnabled())
                {
                   Alfresco.logger.debug("Link char count is " + count);
                }
                return count;
             }
             return 0;
          };
  
          var countChars = function(t) {
             return countContentChars.call(this, t) + countLinkChars.call(this, t);
          };

          // Create the dialog - returns instance of YAHOO.widget.SimpleDialog
          this.widgets.postDialog = Alfresco.util.PopupManager.getUserInput({
              title: title,
              html: html,
              buttons: [
                 {
                    text: Alfresco.util.message("button.ok", this.name),
                    handler: function TwitterBase_postTweet_okClick() {
                       // Grab the input, destroy the pop-up, then callback with the value
                       var value = getText();
                       this.destroy();
                       if (callBack.fn)
                       {
                          callBack.fn.call(callBack.scope || window, value, callBack.obj);
                       }
                    },
                    isDefault: true
                 },
                 {
                    text: Alfresco.util.message("button.cancel", this.name),
                    handler: function TwitterBase_postTweet_cancelClick() {
                       this.destroy();
                    }
                 }
              ]
          });
          
          // Cache a reference to the buttons
          var buttons = this.widgets.postDialog.getButtons(); // Should be two YUI buttons

          var setCharsLeft = function(n) {
              Dom.get(id + "-count").innerHTML = n;
              if (n < 0)
              {
                 // Add the count-over class
                 Dom.addClass(id + "-count", "count-over");
                 // Disable the OK button
                 buttons[0].set("disabled", true);
              }
              else
              {
                 // Remove the count-over class
                  Dom.removeClass(id + "-count", "count-over");
                 // Enable the OK button
                  buttons[0].set("disabled", false);
              }
          }
 
          var onTextChange = function(e, obj) {
             var text = getText.call(this);
              // Set the number of characters remaining
              setCharsLeft.call(this, maxCharCount - countChars.call(this, text));
              // Set the 'Shortening...' text
              var numLinks = countLinks.call(this, text);
              if (Alfresco.logger.isDebugEnabled())
              {
                 Alfresco.logger.debug("Link count is " + numLinks);
              }
              if (numLinks > 0)
              {
                 Dom.get(id + "-status").innerHTML = this.msg(numLinks == 1 ? "label.status-shorten-single" : "label.status-shorten-multiple", numLinks);
              }
              else
              {
                 Dom.get(id + "-status").innerHTML = "";
              }
          };

          Event.on(id + "-input", "keyup", onTextChange, this, true);
          Event.on(id + "-input", "click", onTextChange, this, true);

          // Load the number of characters required for t.co URLs
          // Only do this once, if not aleady cached
          if (this.options.maxUrlSize == -1)
          {
             this._requestAjax(
             {
                url: "/1.1/help/configuration.json",
                successCallback: {
                   fn: function(o) {
                      if (o.json)
                      {
                         this.options.maxUrlSize = o.json.short_url_length;
                         this.options.maxUrlSizeHttps = o.json.short_url_length_https;
                         onTextChange.call(this);
                      }
                   },
                   scope: this
                },
                failureCallback: {
                   fn: function(o) {
                      Alfresco.logger.error("Failed to load Twitter configuration");
                   },
                   scope: this
                }
             });
          }

          // Position cursor at end of textarea
          // as per http://stackoverflow.com/questions/4715762/javascript-move-caret-to-last-character/4716021#4716021
          var moveCaretToEnd = function (el) {
              if (typeof el.selectionStart == "number") {
                  el.selectionStart = el.selectionEnd = el.value.length;
                  el.focus();
              } else if (typeof el.createTextRange != "undefined") {
                  el.focus();
                  var range = el.createTextRange();
                  range.collapse(false);
                  range.select();
              }
          }
          
          moveCaretToEnd(Dom.get(id + "-input"));

          // Work around Chrome's little problem
          window.setTimeout(function() {
              moveCaretToEnd(Dom.get(id + "-input"));
          }, 1);

       },

       /**
        * Hide the disconnect button
        *
        * @method _hideDisconnectButton
        */
       _hideDisconnectButton: function TwitterBase__hideDisconnectButton()
       {
          Dom.getElementsByClassName ("disconnect", "div", this.id, function(el) {
             Dom.setStyle(el, "display", "none");
          }, this, true);
       },

       /**
        * Show the disconnect button
        *
        * @method _showDisconnectButton
        */
       _showDisconnectButton: function TwitterBase__showDisconnectButton()
       {
          Dom.getElementsByClassName ("disconnect", "div", this.id, function(el) {
             Dom.setStyle(el, "display", "block");
          }, this, true);
       },

       /**
        * Success handler for post tweet/reply actions
        * 
        * @method onPostTweetSuccess
        * @param o {object} Response object
        */
       onPostTweetSuccess: function TwitterBase_onPostTweetSuccess(o)
       {
          var thtml = this._generateTweetsHTML([o.json]);
          this._refreshDates(); // Refresh existing dates
          this.widgets.timeline.innerHTML = thtml + this.widgets.timeline.innerHTML;

          Alfresco.util.PopupManager.displayMessage({
              text: this.msg("message.post-tweet")
          });
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
             this.latestTweetId = this._getLatestTweetId(this.newTweets);
             this.newTweets = null;
          }
          
          // Fade out the notification
          this._refreshNotification();
       },
       
       /**
        * Click handler for Reply link
        *
        * @method onTweetReplyClick
        * @param e {object} HTML event
        */
       onTweetReplyClick: function TwitterBase_onTweetReplyClick(e, matchEl, obj)
       {
          // Prevent default action
          Event.stopEvent(e);
          
          var tEl = Dom.getAncestorByClassName(matchEl, "user-tweet"),
              elId = tEl.id,
              tId = elId.substring(elId.lastIndexOf("-") + 1), // Tweet id
              snEls = Dom.getElementsByClassName("screen-name", "span", tEl),
              unEls = Dom.getElementsByClassName("user-name", "span", tEl),
              sn = snEls[0].textContent || snEls[0].innerText,
              un = unEls.length > 0 ? unEls[0].textContent || unEls[0].innerText : null;
          
          this._postTweet(tId, "@" + sn + " ", this.msg("title.reply", un || ("@" + sn)));
       },
       
       /**
        * Click handler for Retweet link
        *
        * @method onTweetRetweetClick
        * @param e {object} HTML event
        */
       onTweetRetweetClick: function TwitterBase_onTweetRetweetClick(e, matchEl, obj)
       {
          // Prevent default action
          Event.stopEvent(e);
          
          var tEl = Dom.getAncestorByClassName(matchEl, "user-tweet"), 
              elId = tEl.id,
              tId = elId.substring(elId.lastIndexOf("-") + 1), // Tweet id
              snEls = Dom.getElementsByClassName("screen-name", "span", tEl),
              unEls = Dom.getElementsByClassName("user-name", "span", tEl),
              sn = snEls[0].textContent || snEls[0].innerText,
              un = unEls.length > 0 ? unEls[0].textContent || unEls[0].innerText : null;
          
          var me = this;
          
          Alfresco.util.PopupManager.displayPrompt({
              title: this.msg("title.retweet", un || ("@" + sn)),
              text: this.msg("label.retweet"),
              buttons: [
                  {
                      text: Alfresco.util.message("button.ok", this.name),
                      handler: function TwitterBase_onRetweetClick_okClick() {
                          me.oAuth.request({
                              url: "/1.1/statuses/retweet/" + tId + ".json",
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
                                              me.onRetweetSuccess.call(me, o);
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
                      handler: function TwitterBase_onDisconnectClick_cancelClick() {
                          this.destroy();
                      }
                  }
              ]
          });
       },
       
       /**
        * Success handler for retweet action
        * 
        * @method onRetweetSuccess
        * @param o {object} Response object
        */
       onRetweetSuccess: function TwitterBase_onRetweetSuccess(o)
       {
          var thtml = this._generateTweetsHTML([o.json]);
          this._refreshDates(); // Refresh existing dates
          this.widgets.timeline.innerHTML = thtml + this.widgets.timeline.innerHTML;
          
          Alfresco.util.PopupManager.displayMessage({
              text: this.msg("message.retweet")
          });
       },
       
       /**
        * Click handler for Favorite link
        *
        * @method onTweetFavoriteClick
        * @param e {object} HTML event
        */
       onTweetFavoriteClick: function TwitterBase_onTweetFavoriteClick(e, matchEl, obj)
       {
          // Prevent default action
          Event.stopEvent(e);
          
          var elId = Dom.getAncestorByClassName(matchEl, "user-tweet").id,
              tId = elId.substring(elId.lastIndexOf("-") + 1), // Tweet id
              isFavorite = Dom.hasClass(matchEl, "twitter-favorite-link-on"),
              action = !isFavorite ? "create" : "destroy",
              newClass = !isFavorite ? "twitter-favorite-link-on" : "twitter-favorite-link",
              oldClass = !isFavorite ? "twitter-favorite-link" : "twitter-favorite-link-on",
              errMsgId = !isFavorite ? "error.favorite" : "error.unfavorite";
          
          this.oAuth.request({
              url: "/1.1/favorites/" + action + ".json",
              method: "POST",
              dataObj: {
                 id: tId
              },
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
                              Dom.addClass(matchEl, newClass);
                              Dom.removeClass(matchEl, oldClass);
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
                          text: this.msg(errMsgId)
                      });
                  },
                  scope: this
              }
          });
       },

       /**
        * Click handler for Connect button
        *
        * @method onConnectButtonClick
        * @param e {object} HTML event
        */
       onConnectButtonClick: function TwitterBase_onConnectButtonClick(e, obj)
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
       onDisconnectClick: function TwitterBase_onDisconnectClick(e)
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
                          YAHOO.Bubbling.fire("twitterDisconnect", {});
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
        * Bubbling handler for connected status
        *
        * @method onConnect
        * @param layer {string} Event name
        * @param params {object} Event parameters
        */
       onConnect: function TwitterBase_onConnect(layer, params)
       {
          Dom.addClass(this.widgets.timeline, "twitter-dashlet-auth");
       },
       
       /**
        * Bubbling handler for disconnected status
        *
        * @method onDisconnect
        * @param layer {string} Event name
        * @param params {object} Event parameters
        */
       onDisconnect: function TwitterBase_onDisconnect(layer, params)
       {
          Dom.removeClass(this.widgets.timeline, "twitter-dashlet-auth");

          // Cancel any active timer
          this._stopTimer();
          // Update the UI
          this.widgets.timeline.innerHTML = "";
          this.newTweets = [];
          this._refreshNotification();
          // Display the Connect information and button
          Dom.setStyle(this.widgets.connect, "display", "block");
          // Enable the Connect button
          this.widgets.connectButton.set("disabled", false);
          // Disable the Disconnect button and More button
          this._hideDisconnectButton();
          Dom.setStyle(this.widgets.buttons, "display", "none");
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
        * Object container for initialization options
        *
        * @property options
        * @type object
        */
       options: YAHOO.lang.merge(Extras.dashlet.TwitterBase.prototype.options,
       {
          /**
           * Active filter value
           * 
           * @property activeFilter
           * @type string
           * @default "home"
           */
           activeFilter: "home"
       }),
       
       /**
        * Array of two-valued arrays, storing the shortned links used by the 'new tweet' dialogue
        * 
        * @property shortenedLinks
        * @type array
        * @default []
        */
       shortenedLinks : [],

      /**
       * Fired by YUI when parent element is available for scripting
       * 
       * @method onReady
       */
      onReady: function TwitterTimeline_onReady()
      {
          Extras.dashlet.TwitterTimeline.superclass.onReady.call(this);
          var me = this;

          // New tweet link
          Event.addListener(this.id + "-link-new-tweet", "click", this.onNewTweetClick, this, true);
          
          // Dropdown filter
          this.widgets.filter = new YAHOO.widget.Button(this.id + "-filter",
          {
             type: "split",
             menu: this.id + "-filter-menu",
             lazyloadmenu: false
          });
          this.widgets.filter.on("click", this.onFilterClicked, this, true);
      },
      
      /**
       * Callback method to use to set up the dashlet when it is known that the authentication
       * has completed successfully
       * 
       * @method onAuthSuccess
       */
      onAuthSuccess: function TwitterTimeline_onAuthSuccess()
      {
          Extras.dashlet.TwitterTimeline.superclass.onAuthSuccess.call(this);
          
          // Display the toolbar
          this._showToolbar();

          // Set up filter menu - loading is triggerred via a click event
          var me = this;

          // Clear the lazyLoad flag and fire init event to get menu rendered into the DOM
          var menu = this.widgets.filter.getMenu();
          menu.subscribe("click", function (p_sType, p_aArgs)
          {
             var menuItem = p_aArgs[1];
             if (menuItem)
             {
                me.widgets.filter.set("label", menuItem.cfg.getProperty("text"));
                me.onFilterChanged.call(me, p_aArgs[1]);
             }
          });
          
          this.widgets.filter.value = this.options.activeFilter;

          // Loop through and find the menuItem corresponding to the default filter
          var menuItems = menu.getItems(),
             menuItem,
             i, ii;

          for (i = 0, ii = menuItems.length; i < ii; i++)
          {
             menuItem = menuItems[i];
             if (menuItem.value == this.options.activeFilter)
             {
                menu.clickEvent.fire(
                {
                   type: "click"
                }, menuItem);
                break;
             }
          }
      },
      
      /**
       * Callback method for when a request token is available, but not an access token
       * 
       * @method onRequestTokenAvailable
       */
      onRequestTokenAvailable: function TwitterTimeline_onRequestTokenAvailable()
      {
         Extras.dashlet.TwitterTimeline.superclass.onRequestTokenAvailable.call(this);
         // Hide the toolbar
         this._hideToolbar();
      },
      
      /**
       * Callback method for when OAuth token is not available
       * 
       * @method onNoTokenAvailable
       */
      onNoTokenAvailable: function TwitterTimeline_onNoTokenAvailable()
      {
         Extras.dashlet.TwitterTimeline.superclass.onNoTokenAvailable.call(this);
         // Hide the toolbar
         this._hideToolbar();
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
         this._hideLoading();
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
         this.latestTweetId = this._getLatestTweetId(tweets);
         this.earliestTweetId = this._getEarliestTweetId(tweets);
         
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
         this._hideLoading();
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
       * Generate HTML markup for a direct message
       * 
       * @method _generateDirectMessageHTML
       * @private
       * @param t {object} Tweet object to render into HTML
       * @param rt {object} Retweet object, if the Tweet has been RT'ed
       * @return {string} HTML markup
       */
      _generateDirectMessageHTML: function TwitterBase__generateDirectMessageHTML(t, rt)
      {
         var html = "", 
            profileUri = "http://twitter.com/" + encodeURIComponent(t.sender.screen_name),
            userLink = "<a href=\"" + profileUri + "\" title=\"" + $html(t.sender.name) + "\" class=\"theme-color-1\">" + $html(t.sender.screen_name) + "</a>",
            postedRe = /([A-Za-z]{3}) ([A-Za-z]{3}) ([0-9]{2}) ([0-9]{2}:[0-9]{2}:[0-9]{2}) (\+[0-9]{4}) ([0-9]{4})/,
            postedMatch = postedRe.exec(t.created_at),
            postedOn = postedMatch != null ? (postedMatch[1] + ", " + postedMatch[3] + " " + postedMatch[2] + " " + postedMatch[6] + " " + postedMatch[4] + " GMT" + postedMatch[5]) : (t.created_at),
            postedLink = "<a href=\"" + profileUri + "\/status\/" + encodeURIComponent(t.id_str) + "\"><span class=\"tweet-date\" title=\"" + postedOn + "\">" + this._relativeTime(new Date(postedOn)) + "</span><\/a>";

         html += "<div class=\"user-tweet" + " detail-list-item\" id=\"" + $html(this.id) + "-tweet-" + $html(t.id_str) + "\">\n";
         html += "<div class=\"user-icon\"><a href=\"" + profileUri + "\" title=\"" + $html(t.sender.name) + "\"><img src=\"" + $html(t.sender.profile_image_url) + "\" alt=\"" + $html(t.sender.screen_name) + "\" width=\"48\" height=\"48\" /></a></div>\n";
         html += "<div class=\"tweet\">\n";
         html += "<div class=\"tweet-hd\">\n";
         html += "<span class=\"screen-name\">" + userLink + "</span> <span class=\"user-name\">" + $html(t.sender.name) + "</span>\n";
         html += !YAHOO.lang.isUndefined(rt) ? " <span class=\"retweeted\">" + this.msg("label.retweetedBy", rt.sender.screen_name) + "</span>\n" : "";
         html += "</div>\n";
         html += "<div class=\"tweet-bd\">" + this._formatTweet(t) + "</div>\n";
         html += "<div class=\"tweet-details\">\n";
         html += "<span>" + postedLink + "</span>";
         if (this.oAuth != null)
         {
             /*
             html += "<span class=\"twitter-actions\">\n";
             html += "<a href=\"\" class=\"twitter-favorite-link" + (t.favorited ? "-on" : "") + "\"><span>" + this.msg("link.favorite") + "</span></a>\n";
             html += "<a href=\"\" class=\"twitter-retweet-link\"><span>" + this.msg("link.retweet") + "</span></a>\n";
             html += "<a href=\"\" class=\"twitter-reply-link\"><span>" + this.msg("link.reply") + "</span></a>\n";
             html += "</span>\n";
             */
         }
         html += "</div>\n";
         html += "</div>\n"; // end tweet
         html += "</div>\n"; // end list-tweet
         return html;
      },
      
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
       * @private
       * @param p_obj {object} Request parameters
       */
      _request: function TwitterTimeline__request(p_obj)
      {
         var requestItems = this._getRequestItems(p_obj),
             url = requestItems.uri,
             params = requestItems.params;

         if (p_obj.dataObj.maxId != null)
         {
             params.max_id = p_obj.dataObj.maxId;
         }
         if (p_obj.dataObj.minId != null)
         {
             params.since_id = p_obj.dataObj.minId;
         }
         
         // Load the timeline
         this._requestAjax(
         {
            url: url,
            params: params,
            successCallback: p_obj.successCallback,
            failureCallback: p_obj.failureCallback
         });
      },
      
      /**
       * Generate request url and parameters based on the current active filter
       * 
       * @method _getRequestItems
       * @private
       * @param p_obj {object} Request parameters
       */
      _getRequestItems: function TwitterTimeline__getRequestItems(p_obj)
      {
         var uri = "", 
         params = {
               count: p_obj.dataObj.pageSize || this.options.pageSize
         };
         switch (this.options.activeFilter)
         {
            case "home":
               uri = '/1.1/statuses/home_timeline.json';
               break;

            case "mentions":
               uri = '/1.1/statuses/mentions_timeline.json';
               params.include_rts = 1;
               break;

            case "favorites":
               uri = '/1.1/favorites/list.json';
               break;

            case "user":
               uri = '/1.1/statuses/user_timeline.json';
               params.include_rts = 1;
               break;

            case "direct":
               uri = '/1.1/direct_messages.json';
               break;
         }
         return {uri: uri, params: params };
      },

      /**
       * Saves active filter to dashlet config
       * 
       * @method _setActiveFilter
       * @private
       * @param filter {string} New filter to set
       * @param noPersist {boolean} [Optional] If set, preferences are not updated
       */
      _setActiveFilter: function TwitterTimeline_setActiveFilter(filter, noPersist)
      {
         this.options.activeFilter = filter;
         this.load();
         if (noPersist !== true)
         {
            // Persist state to the dashlet config
            Alfresco.util.Ajax.jsonRequest(
            {
                method: "POST",
                url: Alfresco.constants.URL_SERVICECONTEXT + "modules/dashlet/config/" + this.options.componentId,
                dataObj:
                {
                    activeFilter: filter
                },
                successCallback: function(){},
                successMessage: null,
                failureCallback: function(){},
                failureMessage: null
            });
         }
      },

      /**
       * Hide the dashlet toolbar
       *
       * @method _hideToolbar
       */
      _hideToolbar: function TwitterTimeline__hideToolbar()
      {
          Dom.setStyle(this.widgets.toolbar, "display", "none");
      },

      /**
       * Show the dashlet toolbar
       *
       * @method _showToolbar
       */
      _showToolbar: function TwitterTimeline__showToolbar()
      {
          Dom.setStyle(this.widgets.toolbar, "display", "block");
      },

      /**
       * YUI WIDGET EVENT HANDLERS
       * Handlers for standard events fired from YUI widgets, e.g. "click"
       */
      
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
       * Filter drop-down changed event handler
       * @method onFilterChanged
       * @param p_oMenuItem {object} Selected menu item
       */
      onFilterChanged: function TwitterTimeline_onFilterChanged(p_oMenuItem)
      {
         var filter = p_oMenuItem.value;
         this.widgets.filter.value = filter;
         this._setActiveFilter(filter);

         this.newTweets = [];
         this._refreshNotification();
      },

      /**
       * Filter button clicked event handler
       * 
       * @method onFilterClicked
       * @param p_oEvent {object} Dom event
       */
      onFilterClicked: function TwitterTimeline_onFilterClicked(p_oEvent)
      {
         // Re-load tweets
         this.load();
         // Clear the notification
         this.newTweets = [];
         this._refreshNotification();
      },

      /**
       * Bubbling handler for disconnected status
       *
       * @method onDisconnect
       * @param layer {string} Event name
       * @param params {object} Event parameters
       */
      onDisconnect: function TwitterTimeline_onDisconnect(layer, params)
      {
         Extras.dashlet.TwitterTimeline.superclass.onDisconnect.call(this, layer, params);
         // Disable the toolbar
         this._hideToolbar();
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
          Extras.dashlet.TwitterUserTimeline.superclass.onReady.call(this);
      },
      
      /**
       * Callback method to use to set up the dashlet when it is known that the authentication
       * has completed successfully
       * 
       * @method onAuthSuccess
       */
      onAuthSuccess: function TwitterUserTimeline_onAuthSuccess()
      {
          Extras.dashlet.TwitterUserTimeline.superclass.onAuthSuccess.call(this);
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
         this._hideLoading();
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
         this.latestTweetId = this._getLatestTweetId(tweets);
         this.earliestTweetId = this._getEarliestTweetId(tweets);
         
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
         this._hideLoading();
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
            url = "/1.1/lists/statuses.json";
            params = {
                    slug: uparts[1],
                    owner_screen_name: uparts[0],
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
            url = "/1.1/statuses/user_timeline.json";
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
         this._requestAjax(
         {
            endpoint: "twitter",
            url: url,
            params: params,
            successCallback: p_obj.successCallback,
            failureCallback: p_obj.failureCallback
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
               width: "30em",
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
         defaultSearchTerm: "",
         
         /**
          * Specifies the type of search results requested. Valid values are mixed, recent or popular
          * 
          * @property resultType
          * @type string
          * @default "recent"
          */
         resultType : "recent"
      }),

      /**
       * Fired by YUI when parent element is available for scripting
       * @method onReady
       */
      onReady: function TwitterSearch_onReady()
      {
          Extras.dashlet.TwitterSearch.superclass.onReady.call(this);
      },
      
      /**
       * Callback method to use to set up the dashlet when it is known that the authentication
       * has completed successfully
       * 
       * @method onAuthSuccess
       */
      onAuthSuccess: function TwitterSearch_onAuthSuccess()
      {
          Extras.dashlet.TwitterSearch.superclass.onAuthSuccess.call(this);
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
         this._hideLoading();
         // Update the dashlet title
         this.widgets.title.innerHTML = this.msg("header.search", encodeURIComponent(this._getSearchTerm()), this._getSearchTerm());
         
         var html = "", tweets;
         
         if (p_response.json)
         {
            tweets = p_response.json.statuses;
            
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
         this.latestTweetId = this._getLatestTweetId(tweets);
         this.firstTweetId = this._getLatestTweetId(tweets);
         this.earliestTweetId = this._getEarliestTweetId(tweets);
         
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
         this._hideLoading();
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
         this._hideLoading();
         var tweets = p_response.json.statuses.slice(1);
         this._refreshDates(); // Refresh existing dates
         if (tweets.length > 0)
         {
            this.widgets.timeline.innerHTML += this._generateTweetsHTML(tweets);
            this.earliestTweetId = this._getEarliestTweetId(tweets);
         }
         this.widgets.moreButton.set("disabled", false);
      },
      
      /**
       * New tweets loaded successfully
       * 
       * @method onNewTweetsLoaded
       * @param p_response {object} Response object from request
       * @param p_obj {object} Custom object passed to function
       */
      onNewTweetsLoaded: function TwitterSearch_onNewTweetsLoaded(p_response, p_obj)
      {
         this._hideLoading();
         this.newTweets = p_response.json.statuses;
         this._refreshNotification();
         
         // Schedule a new poll
         this._resetTimer();
      },
      
      /**
       * PRIVATE FUNCTIONS
       */
      
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
         var url = "/1.1/search/tweets.json";
         var params = {
                q: this._getSearchTerm(),
                result_type: this.options.resultType,
                count: p_obj.dataObj.pageSize || this.options.pageSize
         };

         if (p_obj.dataObj.maxId != null)
         {
             params.max_id = p_obj.dataObj.maxId;
         }
         if (p_obj.dataObj.minId != null)
         {
             params.since_id = p_obj.dataObj.minId;
         }
         if (p_obj.dataObj.page != null)
         {
             params.page = p_obj.dataObj.page;
         }

         // Load the timeline
         this._requestAjax(
         {
            url: url,
            params: params,
            successCallback: p_obj.successCallback,
            failureCallback: p_obj.failureCallback
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
               width: "30em",
               templateUrl: Alfresco.constants.URL_SERVICECONTEXT + "extras/modules/dashlets/twitter-search/config", actionUrl: actionUrl,
               onSuccess:
               {
                  fn: function VideoWidget_onConfigFeed_callback(response)
                  {
                     // Refresh the feed
                     var u = YAHOO.lang.trim(Dom.get(this.configDialog.id + "-searchTerm").value),
                         newSearchTerm = (u != "") ? u : this.options.defaultSearchTerm,
                         rtSelect = Dom.get(this.configDialog.id + "-resultType"),
                         newResultType = rtSelect.options[rtSelect.selectedIndex].value;
                     
                     if (newSearchTerm != this.options.searchTerm || newResultType != this.options.resultType)
                     {
                        this.options.searchTerm = newSearchTerm;
                        this.options.resultType = newResultType;
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
                     
                     var rtSelect = Dom.get(this.configDialog.id + "-resultType");
                     for (var i = 0; i < rtSelect.options.length; i++)
                     {
                        if (rtSelect.options[i].value == this.options.resultType)
                        {
                           rtSelect.selectedIndex = i;
                        }
                     }
                     
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
