/*

Copyright 2014, 2015 Roland Bouman (roland.bouman@gmail.com)

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
var xmlaUrl;

(function() {
  var uri = parseUri(document.location);
  var _xmlaUrl = uri[parseUri.options.q.name]["XmlaUrl"];
  if (typeof(_xmlaUrl) !== "undefined") {
    xmlaUrl = _xmlaUrl;
  }
})();

if (typeof(xmlaUrl) === "undefined") {


  if (!xmlaUrl) {
    //if we reach this point, we are probably running as a plugin inside pentaho
    //so, dynamically find the url of the Pentaho Xmla provider
    var index;
    if ((index = document.location.href.indexOf("content")) !== -1) {
      xmlaUrl = document.location.href.substr(0, index) + "Xmla";
    }
    else
    if ((index = document.location.href.indexOf("xavier/resources/html/index.html"))) {
      xmlaUrl = document.location.href.substr(0, index) + "icCube/xmla";
    }
    else {
      alert("Could not determine XmlaUrl. Exiting.");
    }
  }

}