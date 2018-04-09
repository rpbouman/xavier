/*

Copyright 2014 - 2018 Roland Bouman (roland.bouman@gmail.com)

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
var XavierDerivedMeasureFactory;

(XavierDerivedMeasureFactory = function(conf){
  this.conf = conf;
  this.initSettings(conf);
}).prototype = {
  settings: {
    derivedMeasuresGenerateCaptionMdx: true,
    derivedMeasuresGenerateFormatStringMdx: true
  },
  initSettings: function(conf){
    var staticSettings = XavierDerivedMeasureFactory.prototype.settings;
    conf = conf || this.conf;
    var settings = this.settings = {};
    var p, v;
    for (p in staticSettings) {
      settings[p] = (typeof(conf[p]) === "undefined") ? staticSettings[p] : conf[p];
    }
  },
  getSetting: function(name){
    return this.settings[name];
  },
  getTupleMdxForCurrent: function(queryDesigner, filterAxis) {
    var mdx = "";
    queryDesigner.eachAxis(function(id, axis, i){
      if (id === Xmla.Dataset.AXIS_SLICER) {
        return;
      }
      if (iDef(filterAxis) && axis.conf.id !== filterAxis) {
        return;
      }
      axis.eachHierarchy(function(hierarchy, i){
        if (axis.isMeasureHierarchy(hierarchy)) {
          return;
        }
        var hierarchyName = axis.getHierarchyName(hierarchy);
        var selfExpression = axis.braceIdentifier(hierarchyName) + ".CurrentMember";
        if (mdx) {
          mdx += ", ";
        }
        mdx += selfExpression
      });
    });
    if (mdx) {
      mdx = "(" + mdx + ")";
    }
    else {
      mdx = "{}.Item(0)";
    }
    return mdx;
  },
  getSetMdxForCurrent: function(queryDesigner, filterAxis) {
    var mdx = XavierDerivedMeasureFactory.prototype.getTupleMdxForCurrent(queryDesigner, filterAxis);
    return "{" + mdx + "}";
  },
  getSetMdxForEverything: function(queryDesigner) {
    var mdx = "";
    queryDesigner.eachAxis(function(id, axis, i){
      if (id === Xmla.Dataset.AXIS_SLICER) {
        return;
      }
      axis.eachHierarchy(function(hierarchy, i){
        if (axis.isMeasureHierarchy(hierarchy)) {
          return;
        }
        var hierarchyName = axis.getHierarchyName(hierarchy);
        var topLevelMembersExpression = axis.braceIdentifier(hierarchyName) + ".Levels(0).Members";
        if (mdx) {
          mdx = "CrossJoin(" + mdx + ", " + topLevelMembersExpression + ")";
        }
        else {
          mdx = topLevelMembersExpression;
        }
      });
    });
    if (!mdx) {
      mdx = "{}";
    }
    return mdx;
  },
  getSetMdxForParents: function(queryDesigner) {
    var mdx = "";
    queryDesigner.eachAxis(function(id, axis, i){
      if (id === Xmla.Dataset.AXIS_SLICER) {
        return;
      }
      axis.eachHierarchy(function(hierarchy, i){
        if (axis.isMeasureHierarchy(hierarchy)) {
          return;
        }
        var hierarchyName = axis.getHierarchyName(hierarchy);
        var currentMemberExpression = axis.braceIdentifier(hierarchyName) + ".CurrentMember";
        var parentExpression = currentMemberExpression + ".Parent";
        if (mdx) {
          mdx += ", ";
        }
        mdx += "Iif(" + parentExpression + ".Count = 1, " + parentExpression + ", " + currentMemberExpression + ")"
      });
    });
    if (mdx) {
      mdx = "(" + mdx + ")";
    }
    mdx = "{" + mdx + "}";
    return mdx;
  },
  getSetMdxForChildren: function(queryDesigner) {
    var mdx = "";
    queryDesigner.eachAxis(function(id, axis, i){
      if (id === Xmla.Dataset.AXIS_SLICER) {
        return;
      }
      axis.eachHierarchy(function(hierarchy, i){
        if (axis.isMeasureHierarchy(hierarchy)) {
          return;
        }
        var hierarchyName = axis.getHierarchyName(hierarchy);
        var currentMemberExpression = axis.braceIdentifier(hierarchyName) + ".CurrentMember";
        var childrenExpression = currentMemberExpression + ".Children";

        var members = "";
        axis.eachSetDef(function(setDef, setDefIndex){
          var type = setDef.type;
          switch (type) {
            case "property":
            case "derived-measure":
              return;
          }
          if (members.length) {
            members += ", ";
          }
          members += setDef.expression;
        }, null, hierarchy);
        members = "{" + members + "}";

        var intersectExpression = "InterSect(" + members + ", " + childrenExpression + ")";
        var iifCondition = intersectExpression + ".Count = 0 AND " + childrenExpression + ".Count > 0";
        var iifExpression = "Iif(" + iifCondition + ", " + childrenExpression + ", " + intersectExpression + ")";

        mdx = mdx ? "CrossJoin(" + mdx + ", " + iifExpression + ")" : iifExpression;
      });
    });
    if (!mdx) {
      mdx = "{}";
    }
    return mdx;
  },
  getSetMdxForDescendants: function(queryDesigner) {
    var mdx = "";
    queryDesigner.eachAxis(function(id, axis, i){
      if (id === Xmla.Dataset.AXIS_SLICER) {
        return;
      }
      axis.eachHierarchy(function(hierarchy, i){
        if (axis.isMeasureHierarchy(hierarchy)) {
          return;
        }
        var hierarchyName = axis.getHierarchyName(hierarchy);

        var members = "";
        axis.eachSetDef(function(setDef, setDefIndex){
          var type = setDef.type;
          switch (type) {
            case "property":
            case "derived-measure":
              return;
          }
          if (members.length) {
            members += ", ";
          }
          members += setDef.expression;
        }, null, hierarchy);
        members = "{" + members + "}";

        var currentMemberExpression = axis.braceIdentifier(hierarchyName) + ".CurrentMember";
        var ascendantsExpression = "Ascendants(" + currentMemberExpression + ")";
        var levelExpression = currentMemberExpression + ".Level";
        var distanceExpression = levelExpression + ".Ordinal";
        var tailExpression = "Tail(" + ascendantsExpression + ", " + distanceExpression + ")";

        var intersectExpression = "InterSect(" + members + ", " + tailExpression + ")";
        var headExpression = "Head(" + intersectExpression + ", 1)";

        var descendantsExpression = "Descendants(" + headExpression + ", " + levelExpression + ", SELF)";
        intersectExpression = "InterSect(" + members + ", " + descendantsExpression + ")";

        mdx = mdx ? "CrossJoin(" + mdx + ", " + intersectExpression + ")" : intersectExpression;
      });
    });
    if (!mdx) {
      mdx = "{}";
    }
    return mdx;
  },
  getSetMdxForSiblingsOnRowsAxis: function(queryDesigner){
    return XavierDerivedMeasureFactory.prototype.getSetMdxForSiblings(queryDesigner, Xmla.Dataset.AXIS_ROWS);
  },
  getSetMdxForSiblingsOnColumnsAxis: function(queryDesigner){
    return XavierDerivedMeasureFactory.prototype.getSetMdxForSiblings(queryDesigner, Xmla.Dataset.AXIS_COLUMNS);
  },
  getSetMdxForSiblings: function(queryDesigner, filterAxis, ordered) {
    var mdx = "";
    queryDesigner.eachAxis(function(id, axis, i){
      if (id === Xmla.Dataset.AXIS_SLICER) {
        return;
      }
      if (iDef(filterAxis) && axis.conf.id !== filterAxis) {
        return;
      }
      axis.eachHierarchy(function(hierarchy, i){
        if (axis.isMeasureHierarchy(hierarchy)) {
          return;
        }
        var hierarchyName = axis.getHierarchyName(hierarchy);
        var currentMemberExpression = axis.braceIdentifier(hierarchyName) + ".CurrentMember";
        var siblingExpression = currentMemberExpression + ".Siblings";
        var members = "";
        axis.eachSetDef(function(setDef, setDefIndex){
          var type = setDef.type;
          switch (type) {
            case "property":
            case "derived-measure":
              return;
          }
          if (members.length) {
            members += ", ";
          }
          members += setDef.expression;
        }, null, hierarchy);
        members = "{" + members + "}";
        members = "InterSect(" + members + ", " + siblingExpression + ")";
        mdx = mdx ? "CrossJoin(" + mdx + ", " + members + ")" : members;
      });
      if (ordered === true) {
        mdx = axis.getOrderMdx(mdx);
      }
    });

    if (!mdx) {
      mdx = "{}";
    }
    return mdx;
  },
  getSetMdxForPrecedingSiblingsOnRowsAxis: function(queryDesigner){
    return XavierDerivedMeasureFactory.prototype.getSetMdxForPrecedingSiblings(queryDesigner, Xmla.Dataset.AXIS_ROWS);
  },
  getSetMdxForPrecedingSiblingsOnColumnsAxis: function(queryDesigner){
    return XavierDerivedMeasureFactory.prototype.getSetMdxForPrecedingSiblings(queryDesigner, Xmla.Dataset.AXIS_COLUMNS);
  },
  getSetMdxForPrecedingSiblings: function(queryDesigner, filterAxis){
    var mdxForSiblings = XavierDerivedMeasureFactory.prototype.getSetMdxForSiblings(queryDesigner, filterAxis, true);
    var mdxForCurrent = XavierDerivedMeasureFactory.prototype.getTupleMdxForCurrent(queryDesigner, filterAxis);
    var mdxForRank = "Rank(" + mdxForCurrent + ", " + mdxForSiblings + ")";
    var mdxForHead = "Head(" + mdxForSiblings + ", " + mdxForRank + ")";
    return mdxForHead;
  },
  createDerivedMeasure: function(derivedMeasureConf, measureMetadata, measureCaption){
    var derivedMeasure = merge({}, derivedMeasureConf, {
      derivedFrom: measureMetadata
    });

    var measuresHierarchyUniqueName = QueryDesigner.prototype.measuresHierarchyName;

    var measureName = measureMetadata.MEASURE_NAME;
    measureName = QueryDesignerAxis.prototype.stripBracesFromIdentifier(measureName);
    var name = gMsg(derivedMeasure.name, measureName);
    var caption = gMsg(derivedMeasure.captionMessageKey, measureCaption);

    derivedMeasure.MEASURE_CAPTION = caption;
    derivedMeasure.HIERARCHY_UNIQUE_NAME = measuresHierarchyUniqueName;
    derivedMeasure.MEASURE_NAME = name;
    derivedMeasure.MEASURE_UNIQUE_NAME = QueryDesignerAxis.prototype.braceIdentifier(measuresHierarchyUniqueName) +
                                         "." +
                                         //use the caption rather than the name because
                                         //mondrian does not support the CAPTION property for calc members.
                                         QueryDesignerAxis.prototype.braceIdentifier(caption);
                                         //QueryDesignerAxis.prototype.braceIdentifier(name);

    var formatString;
    if (!derivedMeasure.formatString) {
      derivedMeasure.formatString = measureMetadata.DEFAULT_FORMAT_STRING;
    }

    var classes = ["derived-measure", "measure"];
    if (derivedMeasure.classes) {
      classes = classes.concat(derivedMeasure.classes);
    }
    derivedMeasure.classes = classes;
    if (iFun(derivedMeasure.calculation)) {
      //noop, user specified their own calculation
    }
    else
    if (derivedMeasure.formula) {
      
      var generateFormatStringMdx = this.getSetting("derivedMeasuresGenerateFormatStringMdx");
      var generateCaptionMdx = this.getSetting("derivedMeasuresGenerateCaptionMdx")
      
      derivedMeasure.calculation = function(metadata, queryDesigner){

        var calculatedMeasure = metadata.formula;
        calculatedMeasure = calculatedMeasure.replace(/<MEASURE>/ig, measureMetadata.MEASURE_UNIQUE_NAME);
        calculatedMeasure = calculatedMeasure.replace(/<TUPLE-OF-CURRENT>/ig, XavierDerivedMeasureFactory.prototype.getTupleMdxForCurrent(queryDesigner));
        calculatedMeasure = XavierDerivedMeasureFactory.prototype.replaceBuiltInSets(calculatedMeasure, queryDesigner);

        calculatedMeasure = "MEMBER " + metadata.MEASURE_UNIQUE_NAME + "\nAS\n" + calculatedMeasure;

        if (generateFormatStringMdx && derivedMeasure.formatString) {
          calculatedMeasure += ",\nFORMAT_STRING = '" + derivedMeasure.formatString + "'";
        }
        if (generateCaptionMdx && metadata.MEASURE_CAPTION) {
          calculatedMeasure += ",\nCAPTION = \"" + metadata.MEASURE_CAPTION + "\"";
        }

        return calculatedMeasure;
      }
    }
    return derivedMeasure;
  },
  isFirstDerivedMeasure: function(metadata, queryDesigner){
    if (queryDesigner.eachAxis(function(id, queryDesignerAxis, index){
      if (queryDesignerAxis.eachSetDef(function(setDef, setDefIndex, hierarchy, hierarchyIndex){
        if (setDef.type === "derived-measure" && metadata === setDef.metadata) {
          return false;
        }
      }, queryDesignerAxis) === false) {
        return false;
      }
    }, queryDesigner) === false) {
      return true;
    }
    else {
      return false;
    }
  },
  getMdxIdentifierForBuiltInName: function(name){
    var identifier = QueryDesignerAxis.prototype.braceIdentifier(name);
    return identifier;
  },
  getMdxPlaceHolderForBuiltInName: function(name) {
    var placeHolder = "<" + name + ">";
    return placeHolder;
  },
  getRegExpForBuiltInName: function(builtInName){
    var regExps = XavierDerivedMeasureFactory.RegExpsForBuiltInNames;
    if (!regExps) {
      regExps = XavierDerivedMeasureFactory.RegExpsForBuiltInNames = {};
    }
    var regExp = regExps[builtInName];
    if (!regExp){
      var placeHolder = XavierDerivedMeasureFactory.prototype.getMdxPlaceHolderForBuiltInName(builtInName);
      regExps[name] = regExp = new RegExp(placeHolder, "ig");
    }
    regExp.lastIndex = 0;
    return regExp;
  },
  testStringMatchesBuiltInName: function(string, builtInName){
    var regExp = XavierDerivedMeasureFactory.prototype.getRegExpForBuiltInName(builtInName);
    return regExp.test(string);
  },
  replaceBuiltInName: function(search, builtInName, replace){
    var regExp = XavierDerivedMeasureFactory.prototype.getRegExpForBuiltInName(builtInName);
    return search.replace(regExp, replace);
  },
  replaceBuiltInSets: function(formula, queryDesigner, full){
    var builtInSets = XavierDerivedMeasureFactory.builtInSets, builtInSet, method, setMdx, re;
    for (builtInSet in builtInSets) {
      method = builtInSets[builtInSet];
      setMdx = method.call(null, queryDesigner);
      formula = XavierDerivedMeasureFactory.prototype.replaceBuiltInName(formula, builtInSet, setMdx);
    }
    return formula;
  }
};

XavierDerivedMeasureFactory.builtInSets = {
  "SET-OF-CHILDREN": XavierDerivedMeasureFactory.prototype.getSetMdxForChildren,
  "SET-OF-CURRENT": XavierDerivedMeasureFactory.prototype.getTupleMdxForCurrent,
  "SET-OF-DESCENDANTS": XavierDerivedMeasureFactory.prototype.getSetMdxForDescendants,
  "SET-OF-EVERYTHING": XavierDerivedMeasureFactory.prototype.getSetMdxForEverything,
  "SET-OF-PARENTS": XavierDerivedMeasureFactory.prototype.getSetMdxForParents,
  "SET-OF-PRECEDING-SIBLINGS": XavierDerivedMeasureFactory.prototype.getSetMdxForPrecedingSiblings,
  "SET-OF-PRECEDING-SIBLINGS-ON-ROWS-AXIS": XavierDerivedMeasureFactory.prototype.getSetMdxForPrecedingSiblingsOnRowsAxis,
  "SET-OF-PRECEDING-SIBLINGS-ON-COLUMNS-AXIS": XavierDerivedMeasureFactory.prototype.getSetMdxForPrecedingSiblingsOnColumnsAxis,
  "SET-OF-SIBLINGS": XavierDerivedMeasureFactory.prototype.getSetMdxForSiblings,
  "SET-OF-SIBLINGS-ON-ROWS-AXIS": XavierDerivedMeasureFactory.prototype.getSetMdxForSiblingsOnRowsAxis,
  "SET-OF-SIBLINGS-ON-COLUMNS-AXIS": XavierDerivedMeasureFactory.prototype.getSetMdxForSiblingsOnColumnsAxis
};
