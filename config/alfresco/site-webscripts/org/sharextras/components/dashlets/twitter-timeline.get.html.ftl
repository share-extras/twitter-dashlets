<script type="text/javascript">//<![CDATA[
   var timeline = new Extras.dashlet.TwitterTimeline("${args.htmlid}").setOptions(
   {
      "componentId": "${instance.object.id}",
      "activeFilter": "${args.activeFilter!'home'}",
      "pageSize": ${(config.script['twitter-timeline'].pageSize?string)?number?c},
      "checkInterval": ${(config.script["twitter-timeline"].checkInterval?string)?number?c}
   }).setMessages(
      ${messages}
   );
   new Alfresco.widget.DashletResizer("${args.htmlid}", "${instance.object.id}");

   if (typeof Alfresco.widget.DashletTitleBarActions == "function")
   {
       var disconnectEvent = new YAHOO.util.CustomEvent("onDisconnectClick");
       disconnectEvent.subscribe(timeline.onDisconnectClick, timeline, true);
    
       new Alfresco.widget.DashletTitleBarActions("${args.htmlid}").setOptions(
       {
          actions:
          [
             {
                cssClass: "disconnect",
                eventOnClick: disconnectEvent,
                tooltip: "${msg("dashlet.disconnect.tooltip")?js_string}"
             },
             {
                cssClass: "help",
                bubbleOnClick:
                {
                   message: "${msg("dashlet.help")?js_string}"
                },
                tooltip: "${msg("dashlet.help.tooltip")?js_string}"
             }
          ]
       });
   }
//]]></script>

<div class="dashlet twitter-dashlet twitter-timeline">
   <div class="title" id="${args.htmlid}-title">${msg("header.timeline")}</div>
   <div class="twitter-dashlet-toolbar toolbar flat-button" id="${args.htmlid}-toolbar">
      <div class="actions">
         <a id="${args.htmlid}-link-new-tweet" class="theme-color-1" title="${msg('link.new-tweet')}" href="#">${msg('link.new-tweet')}</a>
      </div>
      <div>
	      <input id="${args.htmlid}-filter" type="button" name="filter" value="${msg("filter.home")}" />
	      <select id="${args.htmlid}-filter-menu">
	         <option value="home">${msg("filter.home")}</option>
	         <option value="mentions">${msg("filter.mentions")}</option>
	         <option value="favorites">${msg("filter.favorites")}</option>
	         <option value="direct">${msg("filter.direct")}</option>        
	      </select>
          <span id="${args.htmlid}-loading" class="twitter-dashlet-loading"><span>loading</span></span>
      </div>
   </div>
   <div id="${args.htmlid}-body" class="body scrollableList" <#if args.height??>style="height: ${args.height}px;"</#if>>
      <div id="${args.htmlid}-notifications" class="notifications"></div>
      <div id="${args.htmlid}-connect" class="twitter-timeline-connect" style="display: none;">
     	   <div>${msg('message.notConnected')}</div>
     	   <input type="button" id="${args.htmlid}-btn-connect" value="${msg('button.connect')}" />
 	   </div>
      <div id="${args.htmlid}-timeline" class="timeline"></div>
      <div id="${args.htmlid}-buttons" class="buttons"><input type="button" id="${args.htmlid}-btn-more" value="${msg('button.more')}" /></div>
 	   <div id="${args.htmlid}-utils" class="twitter-timeline-utils"><a id="${args.htmlid}-link-disconnect" class="theme-color-1" href="#">${msg('link.disconnect')}</a></div>
   </div>
</div>