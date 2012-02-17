<script type="text/javascript">//<![CDATA[
   var dashlet = new Extras.dashlet.TwitterUserTimeline("${args.htmlid}").setOptions(
   {
      "componentId": "${instance.object.id}",
      "twitterUser": "${(args.twitterUser!"")?js_string}",
      "defaultTwitterUser": "${(config.script["twitter-user-timeline"].defaultUser!"")?js_string}",
      "pageSize": ${(config.script["twitter-user-timeline"].pageSize?string)?number?c},
      "checkInterval": ${(config.script["twitter-user-timeline"].checkInterval?string)?number?c}
   }).setMessages(
      ${messages}
   );
   new Alfresco.widget.DashletResizer("${args.htmlid}", "${instance.object.id}");

   var editDashletEvent = new YAHOO.util.CustomEvent("onDashletConfigure");
   editDashletEvent.subscribe(dashlet.onConfigClick, dashlet, true);

   new Alfresco.widget.DashletTitleBarActions("${args.htmlid}").setOptions(
   {
      actions:
      [
<#if hasConfigPermission>
         {
            cssClass: "edit",
            eventOnClick: editDashletEvent,
            tooltip: "${msg("dashlet.edit.tooltip")?js_string}"
         },
</#if>
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
//]]></script>

<div class="dashlet twitter-dashlet twitter-user-timeline">
   <div class="title" id="${args.htmlid}-title"><#if twitterUser?? && twitterUser != "">${msg("header.userTimeline", twitterUser!'')}<#else>${msg("header.timeline")}</#if></div>
   <div id="${args.htmlid}-body" class="body scrollableList" <#if args.height??>style="height: ${args.height}px;"</#if>>
      <div id="${args.htmlid}-notifications" class="notifications"></div>
      <div id="${args.htmlid}-timeline" class="timeline"></div>
      <div id="${args.htmlid}-buttons" class="buttons"><input type="button" id="${args.htmlid}-btn-more" value="${msg('button.more')}" /></div>
   </div>
</div>