<script type="text/javascript">//<![CDATA[
   new Extras.dashlet.TwitterTimeline("${args.htmlid}").setOptions(
   {
      "componentId": "${instance.object.id}",
      "pageSize": ${(config.script['twitter-timeline'].pageSize?string)?number?c},
      "checkInterval": ${(config.script["twitter-timeline"].checkInterval?string)?number?c}
   }).setMessages(
      ${messages}
   );
   new Alfresco.widget.DashletResizer("${args.htmlid}", "${instance.object.id}");
//]]></script>

<div class="dashlet twitter-dashlet twitter-timeline">
   <div class="title" id="${args.htmlid}-title">${msg("header.timeline")}</div>
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