/*

Copyright 2014 - 2017 Roland Bouman (roland.bouman@gmail.com)

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

  http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

*/
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
