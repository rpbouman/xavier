var xmlaFactory = new XmlaFactory({
  xmlaUrl: xavierOptions.xmlaUrl,
  listeners: {
    error: function(xmlaFactory, event, error) {
      busy(false);
      var exception = error.exception;
      var message = exception.toString() || exception.message;
      if (error.code && error.desc) {
        message += "\n" + error.code + ": " + error.desc;
      }
      showAlert("Unexpected Error", message);
    },
    found: function(xmlaFactory, event, xmla){
      busy(false);
      xavierOptions.xmla = xmla;
      var xavierApplication = new XavierApplication(xavierOptions);
    },
    notfound: function(xmlaFactory, event) {
      busy(false);
      showPrompt(
        "Unfortunately, we did not find a suitable XML/A provider.\n" +
        "<br/>" + 
        "Try entering the URL of a XML/A provider below:",
        "Not Found",
        function(value){
          xmlaFactory.conf.xmlaUrl = value;
          xmlaFactory.createXmla();
        }, 
        function(value){
          debugger;
        }, 
        this
      );
    }
  }
});
xmlaFactory.createXmla();
