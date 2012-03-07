<script type="text/javascript">//<![CDATA[
   var dashlet = new Extras.dashlet.TwitterSearch("${args.htmlid}").setOptions(
   {
      "componentId": "${instance.object.id}",
      "searchTerm": "${(args.searchTerm!"")?js_string}",
      "defaultSearchTerm": "${(config.script["twitter-search"].defaultSearchTerm!"")?js_string}",
      "pageSize": ${(config.script['twitter-search'].pageSize?string)?number?c},
      "checkInterval": ${(config.script["twitter-search"].checkInterval?string)?number?c},
      "resultType": "${(args.resultType!"recent")?js_string}"
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

<div class="dashlet twitter-dashlet twitter-search">
   <div class="title"><span id="${args.htmlid}-title">${msg("header.default")}</span><span id="${args.htmlid}-notifications" class="notifications"></span></div>
   <div id="${args.htmlid}-body" class="body scrollableList" <#if args.height??>style="height: ${args.height}px;"</#if>>
      <div id="${args.htmlid}-timeline" class="timeline"></div>
      <div id="${args.htmlid}-buttons" class="buttons"><input type="button" id="${args.htmlid}-btn-more" value="${msg('button.more')}" /></div>
   </div>
</div>
