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
var XmlaFactory;

(function(){

(XmlaFactory = function(conf){
  this.conf = conf || {};
  arguments.callee._super.call(this, conf);
}).prototype = {
  getPossibleXmlaUrls: function() {
    var location = document.location, urls = [], conf = this.conf;

    //if a xmlaUrl was specified in the conf of the factory, then that is what we'll use
    if (conf.xmlaUrl) {
      urls.push(conf.xmlaUrl);
    }
    else
    //if the xmlaUrl was specified through the url, then that is what we'll use
    if (location.search) {
      var search = location.search.substr(1); //get rid of initial ? char.
      search = search.split("&"); //cut in individual parameters;
      var i, n = search.length, param;
      for (i = 0; i < n; i++) {
        param = search[i];
        param = param.split("=");
        if (param[0].toUpperCase() !== "XMLAURL") {
          continue;
        }
        urls.push(decodeURIComponent(param[1]));
        break;
      }
    }

    //if no xmlaUrl was configured at all, we try a list of well known ones.
    if (!urls.length) {
      var origin = location.protocol + "//" + location.host;
      var base = origin + "/";
      //mondrian, f.e. http://localhost:8080/mondrian/xmla
      urls.push(base + "mondrian/xmla");
      //jasperreports, f.e. http://localhost:8080/jasperserver/xmla
      urls.push(base + "jasperserver/xmla");
      //icCube, f.e. http://localhost:8080/icCube/xmla
      urls.push(base + "icCube/xmla");
      //pentaho, f.e. http://localhost:8080/pentaho/Xmla
      urls.push(base + location.pathname.split("/")[1] + "/Xmla");
      //msas, f.e. http://localhost/OLAP/msmdpump.dll
      urls.push(base + "OLAP/msmdpump.dll");
    }
    return urls;
  },
  createXmla: function(callback, error, scope){
    var conf = this.conf;
    var xmlaOptions = {
      async: conf.async || true,
      forceResponseXMLEmulation: conf.forceResponseXMLEmulation || true
    };
    if (conf.headers) {
      xmlaOptions.headers = conf.headers;
    }
    var xmla = new Xmla(xmlaOptions);
    var urls = this.getPossibleXmlaUrls();
    this.tryXmlaUrl(xmla, urls, 0);
    return xmla;
  },
  xCsrfTokenHeader: "x-csrf-token",
  checkCsrfTokenRequired: function(xhr){
  	var xCsrfToken = xhr.getResponseHeader(this.xCsrfTokenHeader);
	return (xCsrfToken.toLowerCase() === "required");
  },
  fetchCsrfToken: function(xmla, urls, index){
	var me = this, xhr = new XMLHttpRequest();
	xhr.open("GET", urls[index], true);
	xhr.setRequestHeader(this.xCsrfTokenHeader, "Fetch");
	xhr.onreadystatechange = function(){
	  switch(xhr.readyState) {
		case 4:
	      xCsrfToken = xhr.getResponseHeader(this.xCsrfTokenHeader);
	      if (me.checkCsrfTokenRequired(xhr)) {
	    	//we didn't get a valid token. try next url
		    index += 1;
	      }
	      else {
	    	//we got a token! configure our Xmla to use it.
	    	var header = me.xCsrfTokenHeader;
	    	var xCsrfToken = xhr.getResponseHeader(header), headers = {};
	    	headers[header] = xCsrfToken;
	    	xmla.setOptions({
	    	  headers: headers
	    	});
	      }
    	  me.tryXmlaUrl(xmla, urls, index);
	      break;
	  };
	}
	xhr.send(null);
  },
  tryXmlaUrl: function(xmla, urls, index){
    var me = this;
    if (index < urls.length) {
      var url = urls[index];
      var request = {
        url: url,
        success: function(xmla, request, rowset){
          xmla.setOptions({
            url: url
          });
          me.fireEvent("found", xmla);
        },
        error: function(xmla, request, exception) {
          var exception = request.exception;
          if (exception.code === -10) {
            var data = exception.data;
            switch (data.status) {
              case 403:	//Forbidden
            	if (me.checkCsrfTokenRequired(data.xhr)) {
                  me.fetchCsrfToken(xmla, urls, index);
            	}
            	else {
            	  index++;
            	  me.tryXmlaUrl(xmla, urls, index);
            	}
            	break;
              default:
                me.tryXmlaUrl(xmla, urls, ++index);
                break;
            }
          }
          else
          if (exception.code.indexOf("SOAP-ENV") === 0) {
            try {
              var xml = request.xhr.responseXML;
              var code = xml.getElementsByTagName("code")[0].firstChild.data;
              var desc = xml.getElementsByTagName("desc")[0].firstChild.data;
              me.fireEvent("error", {
                exception: exception,
                code: code,
                desc: desc
              });
            }
            catch (e) {
              me.fireEvent("error", {
                exception: e
              });
            }
          }
        }
      };
      xmla.discoverDataSources(request);
    }
    else {
      this.fireEvent("notfound");
    }
  }
};

adopt(XmlaFactory, Observable);

})();