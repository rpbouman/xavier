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
