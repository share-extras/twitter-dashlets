function main()
{
   var endpointId = "twitter-auth",
      connector = remote.connect(endpointId);

   model.endpointId = endpointId;
   model.connectorId = connector !== null ? connector.getDescriptor().getStringProperty("connector-id") : "";
   model.endpointUrl = connector !== null ? connector.getDescriptor().getStringProperty("endpoint-url") : "";
   model.authorizationUrl = connector !== null ? connector.getDescriptor().getStringProperty("authorization-url") : "";
}

main();