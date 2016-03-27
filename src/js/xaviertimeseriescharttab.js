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
    categories: Xmla.Dataset.AXIS_PAGES,
    multiColumns: Xmla.Dataset.AXIS_SECTIONS,
    multiRows: Xmla.Dataset.AXIS_CHAPTERS
  },
  generateTitleText: function(dataset, queryDesigner){
    var categoriesAxisLabel = "";
    var categoriesAxis = queryDesigner.getRowAxis();
    var lastHierarchy = categoriesAxis.getHierarchyCount() - 1;
    categoriesAxis.eachHierarchy(function(hierarchy, i){
      if (categoriesAxisLabel) {
        categoriesAxisLabel += ((i === lastHierarchy) ? " " + gMsg("and") : ",") + " ";
      }
      categoriesAxisLabel += hierarchy.HIERARCHY_CAPTION;
    }, this);
    this.categoriesAxisLabel = categoriesAxisLabel;

    var measuresAxisLabel = "";
    var measuresAxis = dataset.getColumnAxis();
    var lastTuple = measuresAxis.tupleCount() - 1;
    measuresAxis.eachTuple(function(measure){
      if (measuresAxisLabel) {
        measuresAxisLabel +=  ((measure.index === lastTuple) ? " " + gMsg("and") : ",") + " ";
      }
      measuresAxisLabel += this.getLabelForTuple(measure);
    }, this);
    this.measuresAxisLabel = measuresAxisLabel;

    return measuresAxisLabel + " " + gMsg("per") + " " + categoriesAxisLabel;
  },
  renderCharts: function(dom, dataset, queryDesigner, axisDesignations){
    var timeAxis = dataset.getAxis(axisDesignations.time);
    var measuresAxis = dataset.getAxis(axisDesignations.measures);
    var cellset = dataset.getCellset();

    var svg = dimple.newSvg("#" + dom.id, dom.clientWidth, dom.clientHeight);

    //prepare the data set. data will be an array of {category, measure, value} objects
    var data = [],
        categoryOrder = [], categoryLabels = [],
        measureOrder = [], measureOrderIndices = {}
    ;
    var categoriesAxisLabel = this.categoriesAxisLabel;
    timeAxis.eachTuple(function(categoryTuple){
      var categoryAndLabel = this.getCategoryAndLabelForTuple(categoryTuple);
      var category = categoryAndLabel.category;
      var label = categoryAndLabel.label;
      categoryOrder.push(category);
      categoryLabels.push(label);
      measuresAxis.eachTuple(function(measureTuple){
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
        datum[categoriesAxisLabel] = categoryTuple.index;
        data.push(datum);
        cellset.nextCell();
      }, this);

    }, this);

    var chart = new dimple.chart(svg, data);

    var categoryAxis = chart.addCategoryAxis("x", [categoriesAxisLabel, "measure"]);

    categoryAxis.title = this.categoriesAxisLabel;

    categoryAxis.addOrderRule(categoryOrder);
    categoryAxis.addGroupOrderRule(measureOrder);

    var measureAxis = chart.addMeasureAxis("y", "value");
    measureAxis.title = this.measuresAxisLabel;

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
        categoriesAxisLabel + ": " + datum.label
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
          tooltip: gMsg("Drag two members of one date hierarchy level to define the time period."),
          hint: gMsg("Drag two members of one date hierarchy level to define the time period."),
          mandatory: true,
          canBeEmpty: false,
          isDistinct: true,
          "class": "dimensiontype1",
          userSortable: false,
          drop: {
            include: ["member"]
          },
          metadataFilter: {
            DIMENSION_TYPE: Xmla.Rowset.MD_DIMTYPE_TIME
          },
          maxHierarchyCount: 1,
          maxMemberCount: 2,
          minMemberCount: 2,
          canDropItem: function(target, dragInfo){
            //first, do all the "regular", "standard" drop item checks.
            var canDrop = this._canDropItem(target, dragInfo);
            if (!canDrop) {
              return false;
            }
            var memberFrom; //start of time period
            var memberTo;   //end of time period
            this.eachSetDef(function(setDef, setDefIndex, hierarchyDef, hierarchyIndex){
              if (setDef.type === "member") {
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
          },
          getMdx: function(){
            var mdx = "";
            //make a date range out of the time series members.
            this.eachSetDef(function(setDef){
              if (mdx) {
                mdx += ":";
              }
              mdx += setDef.expression;
            }, this);
            mdx = "{" + mdx + "}";
            mdx = this.getNonEmptyClauseMdx() + mdx;
            mdx += this.getDimensionPropertiesMdx();
            mdx += this.getOnAxisClauseMdx();
            return mdx;
          }
/*
          checkAxisValid: function(){
            var valid = false;
            this.eachSetDef(function(setDef, setDefIndex, hierarchy, hierarchyIndex){
              if (hierarchy.DIMENSION_TYPE)
            }, this);
            return valid;
          }
*/
        },
        {
          id: Xmla.Dataset.AXIS_PAGES,
          label: gMsg("Categories"),
          tooltip: gMsg("Use series to draw multiple lines for each measure."),
          hint: gMsg("Optionally, drop levels or members on the series axis to draw multiple lines for each measure."),
          canBeEmpty: false,
          isDistinct: true,
          "class": "categories",
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
      ]
    });
    return queryDesigner;
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
