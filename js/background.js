chrome.extension.onConnect.addListener(function(port) {
  port.onMessage.addListener(function(data) {
    // what to do when we get a response?
    $(document).bind('ident:update', function(){
      port.postMessage(ident.identities);
    });

    // Properties for search
    ident.useInwardEdges = true;
    ident.iconPath = "images/icons/";
    ident.addPrimaryURL = true;
    ident.search(data.urls.join(','));
  });
});
