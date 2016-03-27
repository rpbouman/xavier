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

