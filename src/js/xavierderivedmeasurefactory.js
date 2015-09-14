var XavierDerivedMeasureFactory;

(XavierDerivedMeasureFactory = function(conf){
  this.conf = conf;
}).prototype = {
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
        mdx += "Iif( Count(" + parentExpression + ") = 1, " + parentExpression + ", " + currentMemberExpression + ")"
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
        members = "InterSect(" + members + ", " + childrenExpression + ")";
        members = "Iif( Count(" + members + ") = 0 AND Count(" + childrenExpression + ") <> 0, " + childrenExpression + ", " + members + ")";

        mdx = mdx ? "CrossJoin(" + mdx + ", " + members + ")" : members;
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
      derivedMeasure.calculation = function(metadata, queryDesigner){
        var mdx = metadata.formula;
        mdx = mdx.replace(/<MEASURE>/ig, measureMetadata.MEASURE_UNIQUE_NAME);
        mdx = mdx.replace(/<TUPLE-OF-CURRENT>/ig, XavierDerivedMeasureFactory.prototype.getTupleMdxForCurrent(queryDesigner));
        mdx = mdx.replace(/<SET-OF-CURRENT>/ig, XavierDerivedMeasureFactory.prototype.getSetMdxForCurrent(queryDesigner));
        mdx = mdx.replace(/<SET-OF-EVERYTHING>/ig, XavierDerivedMeasureFactory.prototype.getSetMdxForEverything(queryDesigner));
        mdx = mdx.replace(/<SET-OF-PARENTS>/ig, XavierDerivedMeasureFactory.prototype.getSetMdxForParents(queryDesigner));
        mdx = mdx.replace(/<SET-OF-DESCENDANTS>/ig, XavierDerivedMeasureFactory.prototype.getSetMdxForDescendants(queryDesigner));
        mdx = mdx.replace(/<SET-OF-SIBLINGS>/ig, XavierDerivedMeasureFactory.prototype.getSetMdxForSiblings(queryDesigner));
        mdx = mdx.replace(/<SET-OF-SIBLINGS-ON-ROWS-AXIS>/ig, XavierDerivedMeasureFactory.prototype.getSetMdxForSiblingsOnRowsAxis(queryDesigner));
        mdx = mdx.replace(/<SET-OF-SIBLINGS-ON-COLUMNS-AXIS>/ig, XavierDerivedMeasureFactory.prototype.getSetMdxForSiblingsOnColumnsAxis(queryDesigner));
        mdx = mdx.replace(/<SET-OF-PRECEDING-SIBLINGS>/ig, XavierDerivedMeasureFactory.prototype.getSetMdxForPrecedingSiblings(queryDesigner));
        mdx = mdx.replace(/<SET-OF-PRECEDING-SIBLINGS-ON-ROWS-AXIS>/ig, XavierDerivedMeasureFactory.prototype.getSetMdxForPrecedingSiblingsOnRowsAxis(queryDesigner));
        mdx = mdx.replace(/<SET-OF-PRECEDING-SIBLINGS-ON-COLUMNS-AXIS>/ig, XavierDerivedMeasureFactory.prototype.getSetMdxForPrecedingSiblingsOnColumnsAxis(queryDesigner));
        mdx = mdx.replace(/<SET-OF-CHILDREN>/ig, XavierDerivedMeasureFactory.prototype.getSetMdxForChildren(queryDesigner));

        mdx = "MEMBER " + metadata.MEASURE_UNIQUE_NAME + "\nAS\n" + mdx;

        if (derivedMeasure.formatString) {
          mdx += ",\nFORMAT_STRING = '" + derivedMeasure.formatString + "'";
        }
        mdx += ",\nCAPTION = \"" + metadata.MEASURE_CAPTION + "\"";

        return mdx;
      }
    }
    return derivedMeasure;
  }
};
