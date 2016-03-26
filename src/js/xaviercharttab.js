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


//https://math.stackexchange.com/questions/466198/algorithm-to-get-the-maximum-size-of-n-squares-that-fit-into-a-rectangle-with-a/466248#466248?newreg=f0d605cdff574d58bec6ace96f918b7c
function divideRectangleIntoSquares(x, y, n){
  var px = Math.ceil(Math.sqrt(n * x / y));
  var sx, sy;
  if(Math.floor(px * y / x) * px < n) { //does not fit, y/(x/px)=px*y/x
    sx = y / Math.ceil(px * y / x);
  }
  else {
    sx = x / px;
  }
  var py = Math.ceil(Math.sqrt(n * y / x));
  if(Math.floor(py * x / y) * py < n) { //does not fit
    sy = x / Math.ceil(x * py / y);
  }
  else {
    sy = y / py;
  }
  return Math.max(sx,sy);
}

var XavierVisualizer;
(XavierVisualizer = function(conf){
  conf = conf || {};
  this.conf = conf;
  if (!conf.id) {
    conf.id = arguments.callee.prefix + arguments.callee.id++;
  }
  if (!conf.classes) {
    conf.classes = [];
  }
  conf.classes.push(arguments.callee.prefix);
}).prototype = {
  titlePosition: "top",
  padding: 5,
  axisDesignations: {
    series: Xmla.Dataset.AXIS_COLUMNS,
    categories: Xmla.Dataset.AXIS_ROWS,
    multiColumns: Xmla.Dataset.AXIS_PAGES,
    multiRows: Xmla.Dataset.AXIS_CHAPTERS
  },
  getAxisDesignations: function(){
    var conf = this.conf || {};
    return merge(
      conf.axisDesignations || {},
      this.axisDesignations || {},
      XavierVisualizer.prototype.axisDesignations
    );
  },
  getTab: function(){
    return this.conf.tab;
  },
  getQueryDesigner: function(){
    return this.getTab().getQueryDesigner();
  },
  getChartId: function(){
    var ctor = XavierVisualizer;
    var id = this.getId()
    return id + "-instance-" + ctor.instanceId++;
  },
  clear: function(){
    this.isCleared = true;
    dCh(this.getBody());
    dCh(this.getTitle());
  },
  getContainer: function(){
    return this.conf.container;
  },
  getId: function(){
    return this.conf.id;
  },
  generateTitleText: function(dataset, queryDesigner) {
    return "Please implement me: generateTitleText";
  },
  getTitle: function(){
    var id = this.getId();
    return gEl(id + "-title");
  },
  getBody: function(){
    var id = this.getId();
    return gEl(id + "-body");
  },
  hasTitle: function(){
    return this.getTitle() !== null;
  },
  setTitleText: function(text){
    var title = this.getTitle();
    title.innerHTML = text;
  },
  getTitleText: function(){
    var title = this.getTitle();
    var text = title ? title.textContent : null;
    return text;
  },
  createDom: function(){
    var container = this.getContainer();
    var dom = this.makeChartDom(container, 0, 0, container.clientWidth, container.clientHeight, "", this.titlePosition, this.getId());
    dom.className = confCls(this.conf).join(" ");
    return dom;
  },
  getDom: function(){
    var id = this.getId();
    var el = gEl(id);
    if (el) {
      return el;
    }
    return this.createDom();
  },
  tupleToString: function(tuple, property, separator) {
    var members = tuple.members, i, n = members.length, member, label = "";
    for (i = 0; i < n; i++){
      member = members[i];
      if (i) {
        label += separator;
      }
      label += member[property];
    }
    return label;
  },
  getCategoryForTuple: function(tuple) {
    return this.tupleToString(tuple, Xmla.Dataset.Axis.MEMBER_UNIQUE_NAME, ".");
  },
  getLabelForTuple: function(tuple) {
    return this.tupleToString(tuple, Xmla.Dataset.Axis.MEMBER_CAPTION, " - ");
  },
  getCategoryAndLabelForTuple: function(tuple){
    var members = tuple.members, i, n = members.length, member, label = "", category = "";
    for (i = 0; i < n; i++){
      member = members[i];
      if (i) {
        label += " - ";
        category += ".";
      }
      category += member[Xmla.Dataset.Axis.MEMBER_UNIQUE_NAME];
      label += member[Xmla.Dataset.Axis.MEMBER_CAPTION];
    }
    return {
      category: category,
      label: label
    };
  },
  getLegend: function(dimpleSeries) {
    var items = [];
    var list = cEl("OL", {
      "class": "xavier-chart-legend"
    }, items, null);
    return list;
  },
  makeChartDom: function(dom, x, y, width, height, title, titlePosition, id){
    if (!id) {
      id = this.getChartId();
    }

    var children = [];
    if (titlePosition) {
      var chartTitle = cEl("DIV", {
        id: id + "-title",
        "class": "xavier-chart-title"
      }, title || String.fromCharCode(160));
      children.push(chartTitle);
    }

    var chartBody = cEl("DIV", {
      id: id + "-body",
      "class": "xavier-chart-body"
    });
    children.push(chartBody);

    var position = dom.tagName === "TD" ? "relative" : "absolute";
    var div = cEl("DIV", {
      id: id,
      "class": "xavier-chart",
      style: {
        position: position,
        top: y + "px",
        left: x + "px",
        width: width + "px",
        height: height + "px"
      }
    }, children, dom);

    if (chartTitle) {
      //chartBody.style.width = (width - 2 * chartTitle.clientHeight) + "px";
      //chartBody.style.height = (height - chartTitle.clientHeight) + "px";
      //chartBody.style.left = chartTitle.clientHeight + "px";
      switch (titlePosition) {
        case "top":
          chartTitle.style.top = "0px";
          chartBody.style.top = chartTitle.clientHeight + "px";
          break;
        case "bottom":
          chartBody.style.top = "0px";
          chartTitle.style.top = chartBody.clientHeight - 20 + "px";
          break;
      }
      chartBody.style.margin = "auto"; //chartTitle.clientHeight + "px";
    }
    return div;
  },
  createGridForTuples: function(dom, axis, titlePosition, callback, scope){
    var numTuples = axis.tupleCount();
    var w, h;
    if (dom.tagName !== "TD") {
      w = dom.clientWidth;
      h = dom.clientHeight;
    }
    else {
      var row = dom.parentNode;
      var tbody = row.parentNode;
      var table = tbody.parentNode;
      w = table.rows[0].cells[1].clientWidth;
      h = row.cells[0].clientHeight;
    }
    var len = divideRectangleIntoSquares(w, h, numTuples);
    var x = 0, y = 0;
    axis.eachTuple(function(tuple){
      var label = this.getLabelForTuple(tuple);

      var div = this.makeChartDom(dom, x, y, len, len, label, titlePosition);
      callback.call(scope, tuple, div, len);

      x += len;
      if ((x + len) > w) {
        x = 0;
        y += len;
      }

    }, this);
  },
  generateTrellisList: function(dom, dataset, queryDesigner, axisDesignations) {
    var trellisColumnsAxis = dataset.getAxis(axisDesignations.multiColumns);
    this.createGridForTuples(dom, trellisColumnsAxis, "top", function(tuple, dom, len){
      dom.className += " xavier-trellis-list-item";
      this.renderCharts(dom.lastChild, dataset, queryDesigner, axisDesignations);
    }, this);
  },
  generateTrellisMatrix: function(dom, dataset, queryDesigner, axisDesignations) {
    var trellisColumnsAxis = dataset.getAxis(axisDesignations.multiColumns);
    var trellisRowsAxis = dataset.getAxis(axisDesignations.multiRows);
    var matrix = cEl("TABLE", {
      "class": "xavier-chart xavier-trellis-matrix",
      cellpadding: 2,
      cellspacing: 2
    }, null, dom);

    //column header
    var columnWidth = dom.clientWidth / (1 + trellisColumnsAxis.tupleCount());
    var tr = matrix.insertRow(matrix.rows.length);
    var td = tr.insertCell(tr.cells.length);
    td.className = "trellis-pivot";
    trellisColumnsAxis.eachTuple(function(tuple) {
      td = tr.insertCell(tr.cells.length);
      td.style.width = columnWidth + "px";
      td.className = "trellis-header trellis-column-header";
      td.innerHTML = this.getLabelForTuple(tuple);
    }, this);

    var rowHeight = (dom.clientHeight - tr.clientHeight) / trellisRowsAxis.tupleCount();
    trellisRowsAxis.eachTuple(function(tuple){
      //row header
      tr = matrix.insertRow(matrix.rows.length);
      td = tr.insertCell(tr.cells.length);
      td.style.height = rowHeight + "px";
      td.className = "trellis-header trellis-row-header";
      td.innerHTML = this.getLabelForTuple(tuple);

      trellisColumnsAxis.eachTuple(function(tuple) {
        td = tr.insertCell(tr.cells.length);
        this.renderCharts(td, dataset, queryDesigner, axisDesignations);
      }, this);
    }, this);
  },
  renderDataset: function(dataset, queryDesigner, axisDesignations){
    axisDesignations = merge(axisDesignations || {}, this.getAxisDesignations());
    this.clear();
    this.dataset = dataset;
    if (this.hasTitle()) {
      var generatedTitleText = this.generateTitleText(dataset, queryDesigner);
      this.setTitleText(generatedTitleText);
    }
    var dom = this.getBody();
    this.charts = [];
    this.chartDivs = [];
    if (dataset.hasAxis(axisDesignations.multiRows)){
      this.generateTrellisMatrix(dom, dataset, queryDesigner, axisDesignations);
    }
    else
    if (dataset.hasAxis(axisDesignations.multiColumns)) {
      this.generateTrellisList(dom, dataset, queryDesigner, axisDesignations);
    }
    else {
      this.renderCharts(dom, dataset, queryDesigner, axisDesignations);
    }
  },
  forEachChart: function(callback, scope){
    var charts = this.charts;
    if (!charts) {
      return;
    }
    var n = charts.length, i, chart;
    for (i = 0; i < n; i++) {
      chart = charts[i];
      if (callback.call(scope || null, chart) === false) {
        return false;
      }
    }
    return true;
  },
  reDrawCharts: function(){
    this.forEachChart(function(chart){
      var container = chart.svg.parentNode;
      chart.width(container.clientWidth);
      chart.height(container.clientHeight);
      chart.draw();
    }, this);
  },
  reCalculateLayout: function(){

  },
  doLayout: function(){
    this.reCalculateLayout();
    this.reDrawCharts();
  }
};
XavierVisualizer.prefix = "xavier-visualizer";
XavierVisualizer.id = 0;
XavierVisualizer.instanceId = 0;

var XavierChartTab;
(XavierChartTab = function(conf){
  conf = conf || {};
  if (!conf.classes) {
    conf.classes = [];
  }
  conf.classes.push(arguments.callee.prefix);
  arguments.callee._super.apply(this, [conf]);
}).prototype = {
  text: gMsg("Generic Chart"),
  createQueryDesigner: function(dom, tab){
    //noop. Override.
  },
  initChart: function(dom, tab){
    //noop. Override.
  },
  createDom: function(){
    var me = this;
    var dom = cEl("DIV", {
      id: this.getId(),
      "class": [XavierChartTab.prefix]
    });
    this.initQueryDesigner(dom);
    this.visualizer = this.initChart(dom, this);
    return dom;
  },
  layoutChartArea: function() {
    var queryDesigner = this.getQueryDesigner();
    var queryDesignerDom = queryDesigner.getDom().firstChild;

    var visualizer = this.getVisualizer();
    var visualizerDom = visualizer.getDom();

    var dom = this.getDom();
    var width = dom.clientWidth - queryDesignerDom.clientWidth - scrollbarWidth;
    //horizontal distance from query designer.
    var distance = 10;
    width -= distance;

    var style = visualizerDom.style;
    style.top = 0 + "px";
    style.width = width + "px";
    style.left = queryDesignerDom.clientWidth + distance + "px";
    style.height = (dom.clientHeight - scrollbarHeight) + "px";
  },
  doLayout: function(){
    this.layoutChartArea();
    XavierChartTab._super.prototype.doLayout.call(this);
  }
};
XavierChartTab.prefix = "xavier-chart-tab";
adopt(XavierChartTab, XavierTab);

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
          var pct =  d3.format("%")(d.piePct);
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
          "class": "levels",
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
          id: Xmla.Dataset.AXIS_CHAPTERS,
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
            this.eachSetDef(function(setDef){
              if (mdx) {
                mdx += ":";
              }
              mdx += setDef.expression;
            }, this);
            mdx = "{" + mdx + "}";
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

var XavierCombiChart;
(XavierCombiChart = function(conf){
  this.conf = conf || {};
  arguments.callee._super.call(this ,conf);
}).prototype = {
  generateTitleText: function(dataset, queryDesigner){
    return "Bla";
  },
  renderCharts: function(dom, dataset, queryDesigner, axisDesignations){

  }
};
adopt(XavierCombiChart, XavierVisualizer);

var XavierCombiChartDesigner;
(XavierCombiChartDesigner = function(conf){
  this.conf = conf = conf || {};
  arguments.callee._super.call(this, conf);
}).prototype = {
  createDom: function(){
    var conf = this.conf;
    var id = this.getId();
    var el = cEl("DIV", {
      id: id,
      "class": [QueryDesigner.prefix, XavierCombiChartDesigner.prefix]
    }, null, conf.container);

    var tab = cEl("TABLE", {
      cellpadding: "0",
      cellspacing: "0"
    }, null, el);
    var rows = tab.rows;

    var x2Row = tab.insertRow(rows.length);
    //spacer
    x2Row.insertCell(x2Row.cells.length);
    var x2Cell = x2Row.insertCell(x2Row.cells.length);
    x2Cell.colSpan = 2;
    x2Cell.className = "graph-axis graph-axis-x graph-axis-x2";
    //spacer
    x2Row.insertCell(x2Row.cells.length);

    var messageAreaCell = x2Row.insertCell(x2Row.cells.length);
    var messageArea = this.createMessageArea(messageAreaCell);
    this.createAxisMessageAreas(messageArea);

    var yRowX2 = tab.insertRow(rows.length);

    var y1Cell = yRowX2.insertCell(yRowX2.cells.length);
    y1Cell.rowSpan = 2;
    y1Cell.className = "graph-axis graph-axis-y graph-axis-y1";

    var y1Axis = this.getAxis(Xmla.Dataset.AXIS_ROWS);
    y1Cell.appendChild(y1Axis.getDom());

    var seriesX2Y1 = yRowX2.insertCell(yRowX2.cells.length);
    seriesX2Y1.className = "graph-series graph-series-x2-y1";

    var seriesX2Y2 = yRowX2.insertCell(yRowX2.cells.length);
    seriesX2Y2.className = "graph-series graph-series-x2-y2";

    var y2Cell = yRowX2.insertCell(yRowX2.cells.length);
    y2Cell.rowSpan = 2;
    y2Cell.className = "graph-axis graph-axis-y graph-axis-y2";

    var yRowX1 = tab.insertRow(rows.length);

    var seriesX1Y1 = yRowX1.insertCell(yRowX1.cells.length);
    seriesX1Y1.className = "graph-series graph-series-x1-y1";

    var seriesX1Y2 = yRowX1.insertCell(yRowX1.cells.length);
    seriesX1Y2.className = "graph-series graph-series-x1-y2";

    var x1Row = tab.insertRow(rows.length);
    //spacer
    x1Row.insertCell(x1Row.cells.length);
    var x1Cell = x1Row.insertCell(x1Row.cells.length);
    x1Cell.colSpan = 2;
    x1Cell.className = "graph-axis graph-axis-x graph-axis-x1";
    //spacer
    x1Row.insertCell(x1Row.cells.length);

    var x1Axis = this.getAxis(Xmla.Dataset.AXIS_COLUMNS);
    x1Cell.appendChild(x1Axis.getDom());

    var slicerRow = tab.insertRow(rows.length);
    var slicerCell = slicerRow.insertCell(slicerRow.cells.length);
    slicerCell.className = "graph-axis";

    var slicerAxis = this.getAxis(Xmla.Dataset.AXIS_SLICER);
    slicerCell.appendChild(slicerAxis.getDom());

    return el;
  },
  getMdx: function(cubeName){
    var measures = [];
    var dimensions = [];
    var axes = [];

    //separate into dimensions and measures.
    this.eachAxis(function(id, axis){
      if (axis.isSlicerAxis()) {
        return;
      }
      axis.eachSetDef(function(setDef, setDefIndex, hierarchy, hierarchyIndex){
        if (axis.isMeasureHierarchy(hierarchy)) {
          measures.push(setDef);
        }
        else {
          dimensions.push(setDef);
        }
      }, this);
      axes.push(axis);
    }, this);

    //suppress events and dom updates
    this.fireEvents(false);
    this.updateDom(false);

    //remove the old axes.
    var i, n = axes.length;
    for (i = 0; i < n; i++){
      this.removeAxis(axes[i]);
    }

    //convert into a flat table, putting all measures on the columns axis and all dimensions on the rows axis.
    var columnsAxis = this.createAxis(this.defaultAxesConf[Xmla.Dataset.AXIS_COLUMNS]);

    var rowssAxis = this.createAxis(this.defaultAxesConf[Xmla.Dataset.AXIS_ROWS]);

    //get the mdx
    var mdx = XavierCombiChartDesigner._super.prototype.getMdx.apply(this, arguments);

    //remove the new axes
    columnsAxis.destroy();
    rowsAxis.destroy();

    //restore the old axes
    for (i = 0; i < n; i++){
      this.addAxis(axes[i]);
    }

    //unsuppress events and dom updates
    this.fireEvents(true);
    this.updateDom(true);
    return mdx;
  }
};
XavierCombiChartDesigner.prefix = "xavier-combi-chart-designer";
XavierCombiChartDesigner.id = 0;

adopt(XavierCombiChartDesigner, QueryDesigner);

var XavierCombiChartTab;
(XavierCombiChartTab = function(conf){
  conf = conf || {};
  this.classes = ["combi-chart"];
  arguments.callee._super.apply(this, [conf]);
}).prototype = {
  text: gMsg("Combi Chart"),
  createQueryDesigner: function(dom, tab){
    var queryDesigner = this.queryDesigner = new XavierCombiChartDesigner({
      container: cEl("DIV", {}, null, dom),
      dnd: this.getDnd(),
      xmla: this.getXmla(),
      xmlaTreeView: this.getXmlaTreeView(),
      axes: [
        {
          id: Xmla.Dataset.AXIS_COLUMNS,
          label: gMsg("x-axis"),
          classes: ["columns"],
          tooltip: gMsg("Primary x-axis"),
          hint: gMsg("Drag any levels, members, measures, or properties unto the columns axis to create the primary x axis."),
          mandatory: true,
          hasEmptyCheckBox: false,
          drop: {
            include: ["level", "property", "member", "measure", "derived-measure"]
          }
        },
        {
          id: Xmla.Dataset.AXIS_ROWS,
          label: gMsg("y-axis"),
          classes: ["columns"],
          tooltip: gMsg("Primary y-axis"),
          hint: gMsg("Drag any levels, members, measures, or properties unto the columns axis to create the primary y axis."),
          mandatory: true,
          hasEmptyCheckBox: false,
          drop: {
            include: ["level", "property", "member", "measure", "derived-measure"]
          }
        },
        {
          id: Xmla.Dataset.AXIS_SLICER
        }
      ]
    });

    return queryDesigner;
  },
  initVisualizer: function(dom){
    var visualizer = this.visualizer = new XavierCombiChart({
      container: dom
    });
    return visualizer;
  },
  createDom: function(){
    var me = this;
    var dom = cEl("DIV", {
      id: this.getId()
    });
    this.initQueryDesigner(dom);
    this.initVisualizer(dom);
    return dom;
  },
  doLayout: function(){
    var queryDesigner = this.getQueryDesigner();
    var queryDesignerDom = queryDesigner.getDom();
    var visualizer = this.getVisualizer();
    var visualizerDom = visualizer.getDom();
    var dom = this.getDom();

    var style = visualizerDom.style;
    style.top = queryDesignerDom.clientHeight + "px";

    var width = dom.clientWidth - scrollbarWidth;
    style.width = width + "px";
    style.left = 0 + "px";

    var height = dom.clientHeight - queryDesignerDom.clientHeight - scrollbarHeight;
    style.height = height + "px";
    visualizer.doLayout();
  }
};
XavierCombiChartTab.prefix = "xavier-combi-chart-tab";
XavierCombiChartTab.newInstance = function(conf){
  return new XavierCombiChartTab(conf);
}
adopt(XavierCombiChartTab, XavierTab);
