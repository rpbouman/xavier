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
var XmlaMetadataFilter;

(function () {

(XmlaMetadataFilter = function(conf) {
  this.conf = conf;
}).prototype = {
  match: function(matcher, data){
    var matches = false;
    var matcherType = typeof(matcher);
    switch (matcherType) {
      case "string":
      case "number":
      case "boolean":
        matches = matcher === data;
        break;
      case "undefined":
        matches = typeof(data) === matcherType;
        break;
      case "function":
        try {
          matches = matcher(data);
        }
        catch (e) {
          //no match.
        }
        break;
      case "object":
        if (matcher === null) {
          matches = data === null;
        }
        else
        if (iRxp(matcher)) {
          matches = matcher.test(data);
        }
        else
        if (iArr(matcher)) {
          matches = false;
          var i, v, n = matcher.length;
          for (i = 0; i < n; i++){
            v = matcher[i];
            if (this.match(v, data)){
              matches = true;
              break;
            }
          }
        }
        else {
          matches = true;
          var property, value;
          for (property in matcher) {
            value = data[property];
            if (this.match(matcher[property], value) === false) {
              matches = false;
              break;
            }
          }
        }
        break;
      default:
        throw "Don't know how to handle matcher of type " + matcherType;
    }
    return matches;
  },
  eachDatasourceRule: function(callback, scope, datasourceFilter){
    var datasourceRules;
    datasourceRules = this.conf;
    if (!datasourceRules) {
      return true;
    }
    if (typeof(datasourceFilter) === "string") {
      datasourceFilter = {
        DataSourceInfo: datasourceFilter
      };
    }
    var i, n = datasourceRules.length, datasourceRule;
    for (i = 0; i < n; i++) {
      datasourceRule = datasourceRules[i];
      if (typeof(datasourceFilter) !== "undefined") {
        var matcher = datasourceRule.matcher;
        switch (typeof(matcher)) {
          case "undefined":
            break;
          case "string":
            matcher = {
              DataSourceInfo: matcher
            }
          case "object":
            if (matcher instanceof RegExp) {
              matcher = {
                DataSourceInfo: matcher
              }
            }
            if (this.match(matcher, datasourceFilter) === false) {
              continue;
            }
        }
      }
      if (callback.call(scope || this, datasourceRule) === false) {
        return false;
      }
    }
    return true;
  },
  eachRequestTypeRule: function(callback, scope, datasourceFilter, requestTypeFilter){
    var ret;
    ret = this.eachDatasourceRule(function(datasourceRule){
      var requestTypeRules = datasourceRule.rules, n = requestTypeRules.length, i, requestTypeRule;
      for (i = 0; i < n; i++) {
        requestTypeRule = requestTypeRules[i];
        if (typeof(requestTypeFilter) !== "undefined") {
          var matcher = requestTypeRule.matcher;
          if (typeof(matcher) !== "undefined") {
            if (this.match(matcher, requestTypeFilter) === false) {
              continue;
            }
          }
        }
        if (callback.call(scope || this, requestTypeRule) === false) {
          return false;
        }
      }
      return true;
    }, this, datasourceFilter);
    return ret;
  },
  eachRequestTypeRuleRule: function(callback, scope, datasourceFilter, requestTypeFilter) {
    var ret;
    ret = this.eachRequestTypeRule(function(requestTypeRule){
      var rules = requestTypeRule.rules, i, rule, n = rules.length, matcher, properties;
      for (i = 0; i < n; i++) {
        rule = rules[i];
        if (callback.call(scope || this, rule) === false) {
          return false;
        }
      }
      return true;
    }, this, datasourceFilter, requestTypeFilter);
    return ret;
  },
  eachRequestTypeRuleProperties: function(callback, scope, datasourceFilter, requestTypeFilter, metadata) {
    var ret = true;
    ret = this.eachRequestTypeRuleRule(function(requestTypeRuleRule){
      var matcher, properties;
      matcher = requestTypeRuleRule.matcher;
      if (this.match(matcher, metadata)) {
        properties = requestTypeRuleRule.ifMatch;
      }
      else {
        properties = requestTypeRuleRule.ifNotMatch;
      }
      if (callback.call(scope || this, properties) === false) {
        return false;
      }
    }, this, datasourceFilter, requestTypeFilter);
    return ret;
  },
  getProperties: function(datasourceFilter, requestTypeFilter, metadata){
    var properties = {}, found = false;
    this.eachRequestTypeRuleProperties(function(props){
      if (iUnd(props)) {
        return null;
      }
      merge(properties, props);
      found = true;
    }, this, datasourceFilter, requestTypeFilter, metadata);
    if (!found) {
      return null;
    }
    return properties;
  },
  isExcluded: function(datasourceFilter, requestTypeFilter, metadata) {
    var excluded = false;
    this.eachRequestTypeRuleProperties(function(properties){
      if (typeof(properties) !== "undefined" && properties[XmlaMetadataFilter.PROP_EXCLUDE] === true) {
        excluded = true;
        return false;
      }
    }, this, datasourceFilter, requestTypeFilter, metadata);
    return excluded;
  },
  isIncluded: function(datasourceFilter, requestTypeFilter, metadata) {
    return !this.isExcluded(datasourceFilter, requestTypeFilter, metadata);
  },
  getMandatory: function(datasourceFilter, requestTypeFilter, metadata){
    var mandatory;
    this.eachRequestTypeRuleProperties(function(properties){
      if (
        typeof(properties) === "undefined" ||
        typeof(properties.mandatory) === "undefined"
      ) {
        return;
      }
      if (typeof(mandatory) === "undefined" || mandatory === "some") {
        mandatory = properties[XmlaMetadataFilter.PROP_MANDATORY];
      }
      else
      if (properties[XmlaMetadataFilter.PROP_MANDATORY] !== "some") {
        throw "Incompatible values for mandatory: " + mandatory + " - " + properties[XmlaMetadataFilter.PROP_MANDATORY];
      }
    }, this, datasourceFilter, requestTypeFilter, metadata);
    return mandatory;
  }
};

XmlaMetadataFilter.PROP_EXCLUDE = "exclude";
XmlaMetadataFilter.PROP_MANDATORY = "mandatory";
XmlaMetadataFilter.PROP_MANDATORY_ALL = "all";
XmlaMetadataFilter.PROP_MANDATORY_SOME = "some";
XmlaMetadataFilter.PROP_MANDATORY_ONE = "one";

})();