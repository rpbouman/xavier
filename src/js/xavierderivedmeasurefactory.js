var XavierDerivedMeasureFactory;

(XavierDerivedMeasureFactory = function(conf){
  this.conf = conf;
}).prototype = {
  getTupleMdxForCurrent: function(queryDesigner) {
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
        var selfExpression = axis.braceIdentifier(hierarchyName) + ".CurrentMember";
        if (mdx) {
          mdx += ", ";
        }
        mdx += selfExpression
      });
    });
    return "(" + mdx + ")";
  },
  getSetMdxForCurrent: function(queryDesigner) {
    var mdx = XavierDerivedMeasureFactory.prototype.getTupleMdxForCurrent(queryDesigner);
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
        mdx += "Iif( Count(" + parentExpression + ") = 1, " + parentExpression + ", " + currentMemberExpression + ")"
      });
    });
    return mdx;
  },
  getSetMdxForSiblings: function(queryDesigner) {
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
    });
    return mdx;
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
    if (derivedMeasure.formatString) {
      derivedMeasure.DEFAULT_FORMAT_STRING = derivedMeasure.formatString;
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
      derivedMeasure.calculation = function(metadata, queryDesigner){
        var mdx = metadata.formula;
        mdx = mdx.replace(/<MEASURE>/ig, measureMetadata.MEASURE_UNIQUE_NAME);
        mdx = mdx.replace(/<TUPLE-OF-CURRENT>/ig, XavierDerivedMeasureFactory.prototype.getTupleMdxForCurrent(queryDesigner));
        mdx = mdx.replace(/<SET-OF-CURRENT>/ig, XavierDerivedMeasureFactory.prototype.getSetMdxForCurrent(queryDesigner));
        mdx = mdx.replace(/<SET-OF-EVERYTHING>/ig, XavierDerivedMeasureFactory.prototype.getSetMdxForEverything(queryDesigner));
        mdx = mdx.replace(/<SET-OF-PARENTS>/ig, XavierDerivedMeasureFactory.prototype.getSetMdxForParents(queryDesigner));
        mdx = mdx.replace(/<SET-OF-SIBLINGS>/ig, XavierDerivedMeasureFactory.prototype.getSetMdxForSiblings(queryDesigner));

        mdx = "MEMBER " + metadata.MEASURE_UNIQUE_NAME + "\nAS\n" + mdx;

        if (iDef(metadata.formatString)) {
          mdx += ",\nFORMAT_STRING = '" + metadata.formatString + "'";
        }
        mdx += ",\nCAPTION = '" + metadata.MEASURE_CAPTION + "'";

        return mdx;
      }
    }
    return derivedMeasure;
  }
};
