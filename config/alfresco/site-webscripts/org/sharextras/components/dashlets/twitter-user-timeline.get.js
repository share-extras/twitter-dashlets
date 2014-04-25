function main()
{
   var endpointId = "twitter-auth",
      connector = remote.connect(endpointId);

   model.endpointId = endpointId;
   model.connectorId = connector !== null ? connector.getDescriptor().getStringProperty("connector-id") : "";
   model.endpointUrl = connector !== null ? connector.getDescriptor().getStringProperty("endpoint-url") : "";
   model.authorizationUrl = connector !== null ? connector.getDescriptor().getStringProperty("authorization-url") : "";

   var hasConfigPermission = false;
   
   // Work out if the user has permission to configure the dashlet
   
   if (page.url.templateArgs.site != null) // Site or user dashboard?
   {
      // Call the repository to see if the user is a site manager or not
      var obj = context.properties["memberships"];
      if (!obj)
      {
         var json = remote.call("/api/sites/" + page.url.templateArgs.site + "/memberships/" + stringUtils.urlEncode(user.name));
         if (json.status == 200)
         {
            obj = eval('(' + json + ')');
         }
      }
      if (obj)
      {
         hasConfigPermission = (obj.role == "SiteManager");
      }
   }
   else
   {
      hasConfigPermission = true; // User dashboard
   }

   model.hasConfigPermission = hasConfigPermission;
}

main();