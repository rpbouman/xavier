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
var XavierTimeSeriesChart;
(XavierTimeSeriesChart = function(conf){
  conf = conf || {};
  this.conf = conf;
  if (!conf.classes) {
    conf.classes = [];
  }
  conf.classes.push(arguments.callee.prefix);
  arguments.callee._super.apply(this, [conf]);
}).prototype = {
  axisDesignations: {
    measures: Xmla.Dataset.AXIS_COLUMNS,
    time: Xmla.Dataset.AXIS_ROWS,
    categories: Xmla.Dataset.AXIS_ROWS,
    multiColumns: Xmla.Dataset.AXIS_PAGES,
    multiRows: Xmla.Dataset.AXIS_SECTIONS
  },
  generateTitleText: function(dataset, queryDesigner){
    var timeAxisLabel = "";
    var timeAxis = queryDesigner.getRowAxis();
    timeAxis.eachHierarchy(function(hierarchy, i){
      timeAxisLabel += hierarchy.HIERARCHY_CAPTION;
    }, this);
    this.timeAxisLabel = timeAxisLabel;
    
    var measureAxisLabel = "";
    var measureAxis = queryDesigner.getColumnAxis();
    var measureLabels = [];
    measureAxis.eachSetDef(function(setDef, i, hierarchy, hierarchyIndex){
      measureLabels.push(setDef.caption);
    }, this);
    switch (measureLabels.length) {
      case 1:
        measureAxisLabel = measureLabels[0];
        break;
      case 2:
        measureAxisLabel = measureLabels.join(gMsg(" and "));
        break;
      default:
        var last = measureLabels.pop();
        measureAxisLabel = measureLabels.join(", ");
        measureAxisLabel += ", " + gMsg("and ") + last;
    }
    this.measureAxisLabel  = measureAxisLabel;
    
    return measureAxisLabel + " " + gMsg("over") + " " + timeAxisLabel;
  },
  renderCharts: function(dom, dataset, queryDesigner, axisDesignations){
    var measureAxis = dataset.getAxis(axisDesignations.measures);
    var timeAxis = dataset.getAxis(axisDesignations.time);
    var cellset = dataset.getCellset();


    //prepare the data set. data will be an array of {category, measure, value} objects
    var data = [],
        categoryOrder = [], categoryLabels = [],
        measureOrder = [], measureOrderIndices = {}
    ;
    var timeAxisLabel = this.timeAxisLabel;
    var labelCount = queryDesigner.labelCount;
    var measureAxis = dataset.getAxis(axisDesignations.measures);
    var timeAxis = dataset.getAxis(axisDesignations.time);
    var cellset = dataset.getCellset();

    timeAxis.eachTuple(function(categoryTuple){
      var categoryAndLabel = this.getCategoryAndLabelForTuple(categoryTuple);
      var category = categoryAndLabel.category;
      var label = categoryAndLabel.label;
      categoryOrder.push(category);
      categoryLabels.push(label);
      measureAxis.eachTuple(function(measureTuple){
        var measure = this.getLabelForTuple(measureTuple);
        if (categoryTuple.index === 0) {
          measureOrderIndices[measure] = measureOrder.length;
          measureOrder.push(measure);
        }
        var value = cellset.cellValue();
        var datum = {
          label: label,
          measure: measure,
          value: value,
          fmtValue: cellset.cellFmtValue ? cellset.cellFmtValue() : String(value)
        };
        datum[timeAxisLabel] = categoryTuple.index;
        data.push(datum);
        cellset.nextCell();
      }, this);

    }, this);

    var svg = dimple.newSvg("#" + dom.id, dom.clientWidth, dom.clientHeight);
    var chart = new dimple.chart(svg, data);

    var categoryAxis = chart.addCategoryAxis("x", [timeAxisLabel, "measure"]);

    categoryAxis.title = this.timeAxisLabel;

    categoryAxis.addOrderRule(categoryOrder);
    categoryAxis.addGroupOrderRule(measureOrder);

    var measureAxis = chart.addMeasureAxis("y", "value");
    measureAxis.title = this.measureAxisLabel;

    measureAxis.addOrderRule(measureOrder);
    var measureSeries = chart.addSeries("measure", dimple.plot.line);
    measureSeries.addOrderRule(measureOrder);

    //set the tooltip text
    measureSeries.getTooltipText = function(d){
      var categoryNumber = d.xField[0];
      var measure = d.xField[1];
      var measureNumber = measureOrder.indexOf(measure);
      var datum = data[measureNumber * categoryOrder.length + categoryNumber];
      return [
        measure + ": " + datum.fmtValue,
        timeAxisLabel + ": " + datum.label
      ];
    };

    chart.draw();

    //update the category axis labels.
    //have to do this after drawing the chart.
    var chartWidth = chart._widthPixels();
    var maxAvailableLabelWidth = chartWidth / categoryLabels.length;
    var maxLabelWidth = 0;

    //http://stackoverflow.com/questions/17791926/how-to-rotate-x-axis-text-in-dimple-js
    //first pass: set the label for the categories
    //also, keep track of the maximum labelwidth
    categoryAxis.shapes.selectAll("text").each(function(d){
      this.textContent = categoryLabels[d];
      var bbox = this.getBBox();
      var width = bbox.width;
      if (width > maxLabelWidth) {
        maxLabelWidth = width;
      }
    });
    //if there are labels that are too wide, we rotate all labels so they won't overlap
    if (maxLabelWidth > maxAvailableLabelWidth) {
      categoryAxis.shapes.selectAll("text").each(function(d){
        var x = this.getAttribute("x");
        this.setAttribute("x", 0);
        this.setAttribute("transform", "translate(" + x + " -5) rotate(10)");
        this.style.textAnchor = "";
      });
    }

    //make the axis titles bold.
    categoryAxis.titleShape[0][0].style.fontWeight = "bold";
    measureAxis.titleShape[0][0].style.fontWeight = "bold";

    //position the category axis title left of the axis
    var titleShape = categoryAxis.titleShape[0][0];
    var titleShapeBBox = titleShape.getBBox();
    var categoryAxisShape = categoryAxis.shapes[0][0];
    var y = categoryAxisShape.transform.baseVal[0].matrix.f;
    var x = categoryAxisShape.children[0].transform.baseVal[0].matrix.e;
    x = x - titleShapeBBox.width;
    y = y + 2*titleShapeBBox.height;
    if (x < 70) {
      x = 70;
    }
    titleShape.setAttribute("x", x);
    titleShape.setAttribute("y", y);
  },
  renderCharts: function(dom, dataset, queryDesigner, axisDesignations){
    var measureAxis = dataset.getAxis(axisDesignations.measures);
    var timeAxis = dataset.getAxis(axisDesignations.time);
    var timeAxisLabel = this.timeAxisLabel;
    var labelCount = queryDesigner.labelCount;
    var cellset = dataset.getCellset();
    var data = [],
        categoryOrder = [], categoryLabels = [],
        measureOrder = [], measureOrderIndices = {}
    ;

    //prepare the data set. data will be an array of {category, measure, value} objects

    //get all labels for the measures axis
    var measureLabels = [], labelIndex = 0;
    measureAxis.eachTuple(function(measureTuple){
      if (labelIndex < labelCount) {
        labelIndex += 1;
        return;
      }
      measureLabels[measureTuple.index] = this.getLabelForTuple(measureTuple);
      measureOrderIndices[measureTuple] = measureOrder.length;
      measureOrder.push(measureTuple);
    }, this);

    var data = [];
    
    //get the dataset.
    timeAxis.eachTuple(function(timeTuple){
      
      //loop over the time labels
      var i, label = [], value;
      for (i = 0; i < labelCount; i++) {
        value = cellset.cellValue();
        if (value) {
          label.push(value);        
        }
        cellset.nextCell();
      }
      label = label.join("-");
      categoryOrder.push(label);
      categoryLabels.push(label);

      //loop over actual cells
      for (i; i < measureLabels.length; i++) {
        var value = cellset.cellValue();
        var datum = {
          label: label,
          measure: measureLabels[i],
          value: value,
          fmtValue: cellset.cellFmtValue ? cellset.cellFmtValue() : String(value)
        };
        datum[timeAxisLabel] = timeTuple.index;
        data.push(datum);
        cellset.nextCell();
      }
    }, this);

    var svg = dimple.newSvg("#" + dom.id, dom.clientWidth, dom.clientHeight);
    var chart = new dimple.chart(svg, data);

    var categoryAxis = chart.addCategoryAxis("x", [timeAxisLabel, "measure"]);

    categoryAxis.title = this.timeAxisLabel;

    //categoryAxis.addOrderRule(categoryOrder);
    //categoryAxis.addGroupOrderRule(measureOrder);

    var measureAxis = chart.addMeasureAxis("y", "value");
    measureAxis.title = this.measureAxisLabel;

    //measureAxis.addOrderRule(measureOrder);
    var measureSeries = chart.addSeries("measure", dimple.plot.line);
    //measureSeries.addOrderRule(measureOrder);

    //set the tooltip text
    measureSeries.getTooltipText = function(d){
      var categoryNumber = d.xField[0];
      var measure = d.xField[1];
      var measureNumber = measureOrder.indexOf(measure);
      var datum = data[measureNumber * categoryOrder.length + categoryNumber];
      return [
        measure + ": " + datum.fmtValue,
        timeAxisLabel + ": " + datum.label
      ];
    };

    chart.addLegend(0, 0, 150, dom.clientHeight, "left");
    chart.draw();

    //update the category axis labels.
    //have to do this after drawing the chart.
    var chartWidth = chart._widthPixels();
    var maxAvailableLabelWidth = chartWidth / categoryLabels.length;
    var maxLabelWidth = 0;

    //http://stackoverflow.com/questions/17791926/how-to-rotate-x-axis-text-in-dimple-js
    //first pass: set the label for the categories
    //also, keep track of the maximum labelwidth
    categoryAxis.shapes.selectAll("text").each(function(d){
      this.textContent = categoryLabels[d];
      var bbox = this.getBBox();
      var width = bbox.width;
      if (width > maxLabelWidth) {
        maxLabelWidth = width;
      }
    });
    //if there are labels that are too wide, we rotate all labels so they won't overlap
    if (maxLabelWidth > maxAvailableLabelWidth) {
      categoryAxis.shapes.selectAll("text").each(function(d){
        var x = this.getAttribute("x");
        this.setAttribute("x", 0);
        this.setAttribute("transform", "translate(" + x + " -5) rotate(10)");
        this.style.textAnchor = "";
      });
    }

    //make the axis titles bold.
    categoryAxis.titleShape[0][0].style.fontWeight = "bold";
    measureAxis.titleShape[0][0].style.fontWeight = "bold";

    //position the category axis title left of the axis
    var titleShape = categoryAxis.titleShape[0][0];
    var titleShapeBBox = titleShape.getBBox();
    var categoryAxisShape = categoryAxis.shapes[0][0];
    var y = categoryAxisShape.transform.baseVal[0].matrix.f;
    var x = categoryAxisShape.children[0].transform.baseVal[0].matrix.e;
    x = x - titleShapeBBox.width;
    y = y + 2*titleShapeBBox.height;
    if (x < 70) {
      x = 70;
    }
    titleShape.setAttribute("x", x);
    titleShape.setAttribute("y", y);
  }
};
XavierTimeSeriesChart.prefix = "xavier-time-series-chart";
adopt(XavierTimeSeriesChart, XavierVisualizer);

var XavierTimeSeriesChartTab;
(XavierTimeSeriesChartTab = function(conf){
  conf = conf || {};
  this.classes = ["time-series-chart"];
  arguments.callee._super.apply(this, [conf]);
}).prototype = {
  text: gMsg("Time Series Chart"),
  createQueryDesigner: function(dom, tab){
    var queryDesigner = new QueryDesigner({
      container: cEl("DIV", {}, null, dom),
      dnd: this.getDnd(),
      xmla: this.getXmla(),
      xmlaTreeView: this.getXmlaTreeView(),
      axes: [
        {
          id: Xmla.Dataset.AXIS_COLUMNS,
          label: gMsg("Measures"),
          tooltip: gMsg("Each measure creates a line, and the value of the measures controls the y coordinate. Use the chart options to control whether to draw lines or areas."),
          hint: gMsg("Drag measures to the measures axis. The measure value determines the y coordinate of the line."),
          mandatory: true,
          canBeEmpty: false,
          isDistinct: true,
          "class": "measures",
          drop: {
            include: ["measure", "derived-measure"]
          },
          userSortable: false
        },
        {
          id: Xmla.Dataset.AXIS_ROWS,
          label: gMsg("Time"),
          tooltip: gMsg("Drag 2 members of one date hierarchy level to define the time period."),
          hint: gMsg("Drag 1 or 2 members from one single date hierarchy level to define the time period. Optionally, drag one or more levels from the date hierarchy to define the time unit and the date parts that make up the labels for the time series."),
          mandatory: true,
          canBeEmpty: false,
          isDistinct: true,
          "class": "dimensiontype1",
          userSortable: false,
          drop: {
            include: ["member", "level"]
          },
          metadataFilter: {
            DIMENSION_TYPE: Xmla.Rowset.MD_DIMTYPE_TIME
          },
          cardinalities: {
            hierarchies: {
               min: 1, max: 1
            },
            types: {
              member: {
                min: 1, max: 2
              }
            }
          },
          canDropItem: function(target, dragInfo){
            //first, do all the "regular", "standard" drop item checks.
            var canDrop = this._canDropItem(target, dragInfo);
            if (!canDrop) {
              return false;
            }
            var memberFrom; //start of time period
            var memberTo;   //end of time period
            this.eachSetDef(function(setDef, setDefIndex, hierarchyDef, hierarchyIndex){
              if (setDef.type !== "member") {
                return;
              }
              //is there a "from" member? If not, then this is it.
              if (!memberFrom) {
                memberFrom = setDef;
                if (dragInfo.className === "member" && eq(dragInfo.metadata, setDef.metadata)) {
                  //new item already on axis: reject
                  canDrop = false;
                  return false;
                }
              }
              //is there a "to" member? If not, then this is it.
              else
              if (!memberTo) {
                memberTo = setDef;
                if (dragInfo.className === "member" && eq(dragInfo.metadata, setDef.metadata)) {
                  //new item already on axis: reject
                  canDrop = false;
                  return false;
                }
              }
              else
              if (dragInfo.className === "member"){
                //already have two members: reject
                canDrop = false;
                return false;
              }
            }, this);
            
            //if we have a from member, and the new item is a member but of the wrong level, then reject.
            if (
              memberFrom && !memberTo && 
              dragInfo.className === "member" && 
              memberFrom.metadata.LEVEL_UNIQUE_NAME !== dragInfo.metadata.LEVEL_UNIQUE_NAME
            ) {
              return false;
            }
            return canDrop;
          }
        },
        {
          id: Xmla.Dataset.AXIS_PAGES,
          label: gMsg("Categories"),
          tooltip: gMsg("Use series to draw multiple lines for each measure."),
          hint: gMsg("Optionally, drop levels or members on the series axis to draw multiple lines for each measure."),
          canBeEmpty: false,
          isDistinct: true,
          "class": "categories",
          allowGap: true,
          drop: {
            include: ["level", "member"]
          }
        },
        {
          id: Xmla.Dataset.AXIS_SECTIONS,
          label: gMsg("Columns"),
          tooltip: gMsg("For each unique combination of members, a chart is created."),
          hint: gMsg("Optionally, drop levels or members on the columns axis to create a list of multiple charts."),
          canBeEmpty: false,
          isDistinct: true,
          "class": "columns",
          drop: {
            include: ["level", "member"]
          }
        },
        {
          id: Xmla.Dataset.AXIS_CHAPTERS,
          label: gMsg("Rows"),
          tooltip: gMsg("For each unique combination of members, one row is layed out and each column is filled with a chart."),
          hint: gMsg("Optionally, drop levels or members on the columns axis and rows axis to create a matrix of multiple charts."),
          canBeEmpty: false,
          isDistinct: true,
          "class": "rows",
          drop: {
            include: ["level", "member"]
          }
        },
        {
          id: Xmla.Dataset.AXIS_SLICER
        }
      ],
      getMdx: this.getMdx
    });
    return queryDesigner;
  },
  getMdx: function(cubeName){
    var valuesSet = QueryDesignerAxis.prototype.braceIdentifier("Values"),
        periodSet = QueryDesignerAxis.prototype.braceIdentifier("Period"), 
        labelSet = QueryDesignerAxis.prototype.braceIdentifier("Labels"),
        currentOrdinalExpression = periodSet + ".CurrentOrdinal"
        currentPeriodMember = periodSet + ".Item(" + currentOrdinalExpression + ")", 
        previousPeriodMember = currentPeriodMember + ".PrevMember", 
        categoriesSet = QueryDesignerAxis.prototype.braceIdentifier("Categories")
    ;
    var mdx = "";

    //make a named set for the measures.
    var measureAxis = this.getColumnAxis();
    var measureAxisMdx = measureAxis.getMemberSetMdx();
    var withClauseMdx = [
      "WITH",
      "SET " + valuesSet,
      "AS " + measureAxisMdx,
    ].join("\n");

    //make a named set for our period:
    var rowAxis = this.getRowAxis();

    //analyze contents of the time dimension axis, generate calculated members for time labels.
    var labelExpressions = [], periodMembers = [], periodLevels = [];
    rowAxis.eachSetDef(function(setDef){      
      var labelExpression, 
          metadata = setDef.metadata,
          levelNumber = metadata.LEVEL_NUMBER, 
          levelUniqueName = metadata.LEVEL_UNIQUE_NAME,
          labelMeasureName = [
            QueryDesigner.prototype.measuresHierarchyName,
            QueryDesignerAxis.prototype.braceIdentifier("Time Label " + levelNumber)
          ].join(".")
      ;
      switch (setDef.type) {
        case "member":
          periodMembers.push(setDef);
          break;
        case "level":
          periodLevels.push(setDef);
          break;
      }

      var ancestorExpression = "Ancestor(" + currentPeriodMember + ", " + levelUniqueName + ")",
          prevAncestorExpression = "Ancestor(" + previousPeriodMember + ", " + levelUniqueName + ")" 
          labelExpression = [
            "MEMBER " + labelMeasureName,
            "AS Iif(" + currentOrdinalExpression + " = 0 Or ",
            "       " + ancestorExpression + " <> " + prevAncestorExpression + ",", 
            "       " + ancestorExpression + ".Properties(\"MEMBER_CAPTION\"), \"\")"
          ].join("\n");
      labelExpressions[levelNumber] = {
        labelMeasureName: labelMeasureName,
        labelExpression: labelExpression,
        levelUniqueName: levelUniqueName
      };
    }, this);
    
    //make a range of our time period
    var periodSetMdx = periodMembers[0].expression;
    if (periodMembers.length === 2) {
      periodSetMdx += " : " + periodMembers[1].expression;
    }
    periodSetMdx = "{" + periodSetMdx + "}";
    
    //sort the levels by level number by ascending level number
    //this should allow us to create a label by reading cells from left to right and concatenating the cell values.
    if (periodLevels.length) {
      periodLevels.sort(function(a, b){
        var aLevel = a.metadata.LEVEL_NUMBER;
        var bLevel = b.metadata.LEVEL_NUMBER;
        if (aLevel > bLevel) {
          return -1;
        }
        else
        if (aLevel < bLevel) {
          return 1;
        }
        else {
          return 0;
        }
      });
      var maxLevel = periodLevels[periodLevels.length - 1];
      
      var minMember = periodMembers[0];
      if (labelExpressions.length > minMember.metadata.LEVEL_NUMBER) {
        //the max level exceeds the members that demarcate the interval. IOW we have a level with LEVEL_NUMBER that exceeeds the LEVEL_NUMBER of the member(s).
        //this means we have to rewrite the members to the first and last descendent that live at the max level.
        periodSetMdx = "Descendants(" + periodSetMdx + ", " + labelExpressions[labelExpressions.length - 1].levelUniqueName + ", SELF)";
      }
    }
    
    withClauseMdx += "\n" + [
      "SET " + periodSet,
      "AS " + periodSetMdx
    ].join("\n");
    
    var rowsMdx = periodSet;
    rowsMdx += rowAxis.getOnAxisClauseMdx();
    
    //add calculated members for labels
    var n = labelExpressions.length, labelCount = 0, labelSetMdx = "";
    if (n) {
      var i, labelExpression; 
      for (i = 0; i < n; i++){
        labelExpression = labelExpressions[i];
        if (iUnd(labelExpression)) {
          continue;
        }
        labelCount += 1;
        withClauseMdx += "\n" + labelExpression.labelExpression;
        if (labelSetMdx) {
          labelSetMdx += ",";
        }
        labelSetMdx += labelExpression.labelMeasureName;
      }
    }
    withClauseMdx += "\n" + [
      "SET " + labelSet,
      "AS " + "{" + labelSetMdx + "}"
    ].join("\n");
    this.labelCount = labelCount;

    var pageAxis = this.getPageAxis();
    var pageAxisMdx = pageAxis.getMemberSetMdx();
    if (pageAxisMdx) {
      withClauseMdx += [
        "",
        "SET " + categoriesSet,
        "AS " + pageAxisMdx
      ].join("\n");
    }
    
    //fold the measures and the categories into one set. This will be the columns axis
    var columnsMdx = valuesSet;
    if (pageAxisMdx) {
      labelSet  = [
        "CrossJoin(", 
          categoriesSet + ".Item(1),",
          labelSet,
        ")"
      ].join("");

      columnsMdx = [
        "CrossJoin(", 
          categoriesSet + ",",
          columnsMdx,
        ")"
      ].join("");
    }
    columnsMdx = [
      "Union(",
        labelSet + ",",
        columnsMdx,
      ")"
    ].join("");
    columnsMdx += measureAxis.getOnAxisClauseMdx();
    
    mdx = withClauseMdx;
    mdx += [
      "",
      "SELECT ",
      columnsMdx,
      ",",
      rowsMdx
    ].join("\n");

    //trellis columns. Note that since categories and measures axis are folded into the Columns axis, we have to 
    //project the sections axis which holds the trellis columns as the pages axis.
    var sectionAxis = this.getSectionAxis();
    var sectionAxisMdx = sectionAxis.getMemberSetMdx();
    if (sectionAxisMdx) {
      mdx += [
        ",",
        sectionAxisMdx,
        " ON 2"
      ].join("\n");
    }

    //trellis rows. Note that since categories and measures axis are folded into the Columns axis, we have to 
    //project the chapters axis which holds the trellis columns as the sections axis.
    var chapterAxis = this.getChapterAxis();
    var chapterAxisMdx = chapterAxis.getMemberSetMdx();
    if (chapterAxisMdx) {
      mdx += [
        ",",
        chapterAxisMdx,
        " ON 3"
      ].join("\n");
    }

    mdx += [
      "",
      "FROM " + QueryDesignerAxis.prototype.braceIdentifier(cubeName)
    ].join("\n");
    
    //slicer.
    var slicerAxis = this.getSlicerAxis();
    var slicerMdx = slicerAxis.getMdx();
    if (slicerMdx) {
      mdx += [
        "",
        "WHERE", 
        slicerMdx
      ].join("\n");
    }
    
    //done.
    return mdx;
  },
  initChart: function(dom, tab){
    var chart = new XavierTimeSeriesChart({
      container: dom,
      tab: tab
    });
    return chart;
  }
};
XavierTimeSeriesChartTab.newInstance = function(conf){
  return new XavierTimeSeriesChartTab(conf);
}
XavierTimeSeriesChartTab.prefix = "xavier-time-series-chart-tab";
adopt(XavierTimeSeriesChartTab, XavierChartTab);
