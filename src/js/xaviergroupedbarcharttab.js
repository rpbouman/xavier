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
var XavierGroupedBarChart;
(XavierGroupedBarChart = function(conf){
  conf = conf || {};
  this.conf = conf;
  if (!conf.classes) {
    conf.classes = [];
  }
  conf.classes.push(arguments.callee.prefix);
  arguments.callee._super.apply(this, [conf]);
}).prototype = {
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
    var categoriesAxis = dataset.getAxis(axisDesignations.categories);
    var measuresAxis = dataset.getAxis(axisDesignations.series);
    var cellset = dataset.getCellset();

    var svg = dimple.newSvg("#" + dom.id, dom.clientWidth, dom.clientHeight);

    //prepare the data set. data will be an array of {category, measure, value} objects
    var data = [],
        categoryOrder = [], categoryLabels = [],
        measureOrder = [], measureOrderIndices = {}
    ;
    var categoriesAxisLabel = this.categoriesAxisLabel;
    categoriesAxis.eachTuple(function(categoryTuple){
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

    //this will create a grouped bar chart: category groups with a bar for each measure
    var categoryAxis = chart.addCategoryAxis("x", [categoriesAxisLabel, "measure"]);

    //this will create a stacked bar chart: one stack of measures per category.
    //var categoryAxis = chart.addCategoryAxis("x", "category");

    categoryAxis.title = this.categoriesAxisLabel;

    categoryAxis.addOrderRule(categoryOrder);
    categoryAxis.addGroupOrderRule(measureOrder);

    var measureAxis = chart.addMeasureAxis("y", "value");
    measureAxis.title = this.measuresAxisLabel;

    measureAxis.addOrderRule(measureOrder);
    var measureSeries = chart.addSeries("measure", dimple.plot.bar);
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

    this.addLegend(chart);
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
XavierGroupedBarChart.prefix = "xavier-grouped-bar-chart";
adopt(XavierGroupedBarChart, XavierVisualizer);

var XavierGroupedBarChartTab;
(XavierGroupedBarChartTab = function(conf){
  conf = conf || {};
  this.classes = ["grouped-bar-chart"];
  arguments.callee._super.apply(this, [conf]);
}).prototype = {
  text: gMsg("Grouped Bar Chart"),
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
          tooltip: gMsg("Each measure creates a bar, and the value of the measures controls the extent of the bars. Use the chart options to control whether measures should be grouped or stacked."),
          hint: gMsg("Drag measures to the measures axis. The measure value determines the size of the bar."),
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
          label: gMsg("Categories"),
          tooltip: gMsg("Each combination of members forms a category to generate bars in the bar chart. Choose one level, or a selection of members from a single level per hierarchy."),
          hint: gMsg("Drag levels or members to the categories axis to create categories for which bars are drawn."),
          mandatory: true,
          canBeEmpty: false,
          isDistinct: true,
          "class": "categories",
          drop: {
            include: ["level", "member"]
          }
        },
        {
          id: Xmla.Dataset.AXIS_PAGES,
          label: gMsg("Columns"),
          tooltip: gMsg("For each unique combination of members, a bar chart is created."),
          hint: gMsg("Optionally, drop levels or members on the columns axis to create a list of multiple bar charts."),
          canBeEmpty: false,
          isDistinct: true,
          "class": "columns",
          drop: {
            include: ["level", "member"]
          }
        },
        {
          id: Xmla.Dataset.AXIS_SECTIONS,
          label: gMsg("Rows"),
          tooltip: gMsg("For each unique combination of members, one row is layed out and each column is filled with a bar chart."),
          hint: gMsg("Optionally, drop levels or members on the columns axis and rows axis to create a matrix of multiple bar charts."),
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
    var chart = new XavierGroupedBarChart({
      container: dom,
      tab: tab
    });
    return chart;
  }
};
XavierGroupedBarChartTab.newInstance = function(conf){
  return new XavierGroupedBarChartTab(conf);
}
XavierGroupedBarChartTab.prefix = "xavier-grouped-bar-chart-tab";
adopt(XavierGroupedBarChartTab, XavierChartTab);
