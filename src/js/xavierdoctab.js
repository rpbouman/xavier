/*

Copyright 2014 - 2016 Roland Bouman (roland.bouman@gmail.com)

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
if (iUnd(docDir)) {
  var docDir = "../doc/";
}
/**
*   Welcome tab
*/
var XavierDocumentTab;
(XavierDocumentTab = function(conf){
  this.classes = ["welcome"];
  if (conf.text) {
    this.text = conf.text;
  }
  arguments.callee._super.apply(this, [conf]);
}).prototype = {
  createToolbar: false,
  forCube: false,
  text: gMsg("Welcome!"),
  createDom: function(){
    var conf = this.conf;
    var url = conf.url || docDir + gMsg("en/welcome.html");
    var dom = cEl("IFRAME", {
      id: this.getId(),
      src: url,
      style: {
        "border-style": "none"
      },
      width: "100%",
      height: "100%"
    });
    return dom;
  }
};
adopt(XavierDocumentTab, XavierTab);
