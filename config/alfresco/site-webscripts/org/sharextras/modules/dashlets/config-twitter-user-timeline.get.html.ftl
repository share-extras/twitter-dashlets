<div id="${args.htmlid}-configDialog" class="config-twitter-user-timeline">
   <div class="hd">${msg("label.header")}</div>
   <div class="bd">
      <form id="${args.htmlid}-form" action="" method="POST">
         <div class="yui-gd">
            <div class="yui-u first"><label for="${args.htmlid}-twitterUser">${msg("label.twitterUser")}:</label></div>
            <div class="yui-u" >
               @<input type="text" name="twitterUser" id="${args.htmlid}-twitterUser" />
            </div>
         </div>
         <div class="bdft">
            <input type="submit" id="${args.htmlid}-ok" value="${msg("button.ok")}" />
            <input type="button" id="${args.htmlid}-cancel" value="${msg("button.cancel")}" />
         </div>
      </form>
   </div>
</div>