<div id="${args.htmlid}-configDialog" class="config-twitter-search">
   <div class="hd">${msg("label.header")}</div>
   <div class="bd">
      <form id="${args.htmlid}-form" action="" method="POST">
         <div class="yui-gd">
            <div class="yui-u first"><label for="${args.htmlid}-searchTerm">${msg("label.searchTerm")}:</label></div>
            <div class="yui-u" >
               <input type="text" name="searchTerm" id="${args.htmlid}-searchTerm" />
            </div>
         </div>
         <div class="yui-gd">
            <div class="yui-u first"><label for="${args.htmlid}-resultType">${msg("label.resultType")}:</label></div>
            <div class="yui-u">
               <select name="resultType" id="${args.htmlid}-resultType">
                  <option value="recent">${msg("option.resultType.recent")}</option>
                  <option value="popular">${msg("option.resultType.popular")}</option>
                  <option value="mixed">${msg("option.resultType.mixed")}</option>
               </select>
            </div>
         </div>
         <div class="bdft">
            <input type="submit" id="${args.htmlid}-ok" value="${msg("button.ok")}" />
            <input type="button" id="${args.htmlid}-cancel" value="${msg("button.cancel")}" />
         </div>
      </form>
   </div>
</div>