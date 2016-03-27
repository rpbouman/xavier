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
var XavierPieChart;
(XavierPieChart = function(conf){
  conf = conf || {};
  this.conf = conf;
  if (!conf.classes) {
    conf.classes = [];
  }
  conf.classes.push(arguments.callee.prefix);
  arguments.callee._super.apply(this, [conf]);
}).prototype = {
  axisDesignations: {
    series: Xmla.Dataset.AXIS_ROWS,
    categories: Xmla.Dataset.AXIS_COLUMNS
  },
  generateTitleText: function(dataset, queryDesigner){
    var categoriesAxisLabel = "";
    var categoriesAxis = queryDesigner.getColumnAxis();
    var lastHierarchy = categoriesAxis.getHierarchyCount() - 1;
    categoriesAxis.eachHierarchy(function(hierarchy, i){
      if (categoriesAxisLabel) {
        categoriesAxisLabel += ((i === lastHierarchy) ? " " + gMsg("and") : ",") + " ";
      }
      categoriesAxisLabel += hierarchy.HIERARCHY_CAPTION;
    }, this);
    this.categoriesAxisLabel = categoriesAxisLabel;

    var measuresAxisLabel = "";
    var measuresAxis = dataset.getRowAxis();
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

    var categoriesAxisLabel = this.categoriesAxisLabel;
    var titlePosition;
    if (dom.tagName === "TD") {
      titlePosition = false;
    }
    else {
      titlePosition = "bottom";
    }
    this.createGridForTuples(dom, measuresAxis, titlePosition, function(tuple, dom, len){
      var data = [];
      var measure = this.getLabelForTuple(tuple);
      var percentageLabel = gMsg("Percentage");
      var countNegative = 0, countPositive = 0;
      categoriesAxis.eachTuple(function(tuple){
        var category = this.getLabelForTuple(tuple);
        var value = cellset.cellValue();
        if (value > 0) {
          countPositive++;
        }
        else
        if (value < 0) {
          countNegative++;
          value = -value;
        }
        var datum = {
          label: category,
          fmtValue: cellset.cellFmtValue ? cellset.cellFmtValue() : String(value)
        };
        datum[categoriesAxisLabel] = tuple.index;
        datum[measure] = value;
        data.push(datum);
        cellset.nextCell();
      }, this);

      var body = dom.lastChild;
      if (countNegative > 0 && countPositive > 0) {
        body.innerHTML = "Can't render Piechart. Found negative and positive values."
        return false;
      }
      
      var svg = dimple.newSvg("#" + body.id, body.clientWidth, body.clientHeight);
      var chart = new dimple.chart(svg, data);
      var measureAxis = chart.addMeasureAxis("p", measure);
      var series = chart.addSeries("label", dimple.plot.pie);
      //innerRadius will make this a donut chart. 
      //donuts are even more useless than pies so let's not.
      //series.innerRadius = "50%";
      series.getTooltipText = function(d){
        var tooltip = [];
        var i, n = data.length, datum;
        for (i = 0; i < n; i++) {
          datum = data[i];
          if (datum.label !== d.aggField[0]) {
            continue;
          }
          break;
        }
        tooltip.push(datum.label + ": " + datum.fmtValue);
        if (datum.fmtValue.indexOf("%") === -1) {
          var pct = this.p._getFormat()(d.angle) + " (" + (d3.format("%")(d.piePct)) + ")";
          tooltip.push(percentageLabel + ": " + pct);
        }
        return tooltip;
      };
      if (this.isCleared) {
        //TODO: print legend
        chart.addLegend(0, 0, 100, dom.clientHeight, "left");
        this.isCleared = false;
      }
      chart.draw();
    }, this);
  }
};
XavierPieChart.prefix = "xavier-pie-chart";
adopt(XavierPieChart, XavierVisualizer);

var XavierPieChartTab;
(XavierPieChartTab = function(conf){
  conf = conf || {};
  this.classes = ["pie-chart"];
  arguments.callee._super.apply(this, [conf]);
}).prototype = {
  text: gMsg("Pie Chart"),
  createQueryDesigner: function(dom, tab){
    var queryDesigner = new QueryDesigner({
      container: cEl("DIV", {}, null, dom),
      dnd: this.getDnd(),
      xmla: this.getXmla(),
      xmlaTreeView: this.getXmlaTreeView(),
      axes: [
        {
          id: Xmla.Dataset.AXIS_ROWS,
          label: gMsg("Measures"),
          tooltip: gMsg("Each measure on this axis generates one pie chart for that measure. Its value determines the size of the pie chart slices."),
          hint: gMsg("Drag measures to the measures axis. A pie chart will be created for each measure, and the pie slices are sized according to the value of the measure."),
          mandatory: true,
          canBeEmpty: false,
          isDistinct: true,
          "class": "measures",
          drop: {
            include: ["measure", "derived-measure"]
          }
        },
        {
          id: Xmla.Dataset.AXIS_COLUMNS,
          label: gMsg("Categories"),
          tooltip: gMsg("Each combination of members forms a category to generate one slice of the pie chart. Choose one level, or a selection of members from a single level per hierarchy."),
          hint: gMsg("Drag levels or members to the categories axis. This will create the categories by which the pie chart(s) will be divided."),
          mandatory: true,
          canBeEmpty: false,
          isDistinct: true,
          "class": "levels",
          drop: {
            include: ["level", "member"]
          }
        },
        {
          id: Xmla.Dataset.AXIS_PAGES,
          label: gMsg("Columns"),
          tooltip: gMsg("For each unique combination of members, a list item is layed out and filled with pie charts."),
          hint: gMsg("Optionally, drop levels or members on the columns axis to create a list of multiple pies."),
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
          tooltip: gMsg("For each unique combination of members, one row is layed out and its columns are filled with pie charts."),
          hint: gMsg("Optionally, drop levels or members on the rows axis and on the column axis to create a matrix of multiple pies."),
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
    var chart = new XavierPieChart({
      container: dom,
      tab: tab
    });
    return chart;
  }
};
XavierPieChartTab.prefix = "xavier-pie-chart-tab";
XavierPieChartTab.newInstance = function(conf){
  return new XavierPieChartTab(conf);
}
adopt(XavierPieChartTab, XavierChartTab);
