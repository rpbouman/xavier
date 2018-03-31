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
var CorrelationMatrix;
(CorrelationMatrix = function(){
  this.initDataGrid();
}).prototype = {
  initDataGrid: function(){
    this.dataGrid = new DataGrid({});
    this.dataGrid.setRowHeaders([{
      label: "Measure"    
    }]);
  },
  getDataGrid: function(){
    return this.dataGrid;
  },
  getDom: function(){
    return this.dataGrid.getDom();
  },
  clear: function(){
    this.isCleared = true;
    this.dataGrid.clear();
  },
  getDataset: function(){
    return this.dataset;
  },
  renderDataset: function(dataset, queryDesigner){
    if (this.dataset) {
      this.dataset.close();
    }
    this.dataset = dataset;
    var cellset = dataset.getCellset();
    var columns = [], rows = [], cells = [], i = 0, cellIndex = cellset.curr();
    var columnAxis = queryDesigner.getColumnAxis();
    columnAxis.eachSetDef(function(setDef1, setDefIndex1, hierarchy1, hierarchyIndex1){
      var measureCaption = setDef1.metadata.MEASURE_CAPTION;
      columns.push({
        label: measureCaption
      });
      rows.push([measureCaption]);
      var j = 0, values = [];
      columnAxis.eachSetDef(function(setDef1, setDefIndex1, hierarchy1, hierarchyIndex1){
        if (cellIndex < i) {
          cellIndex = cellset.nextCell();
        }
        if (cellIndex === i) {
          values[j] = cellset.cellValue();
        }
        j += 1;
        i += 1;
      }, this);
      cells.push(values);
    }, this);

    this.dataGrid.setData({
      columns: columns,
      rows: rows,
      cells: cells
    });
    this.isCleared = false;
    this.dataGrid.doLayout();
  },
  doLayout: function(){
    this.dataGrid.doLayout();
  }
};

/**
*   Table tab
*/
var XavierCorrelationMatrixTab;
(XavierCorrelationMatrixTab = function(conf){
  this.classes = ["correlationmatrix"];
  arguments.callee._super.apply(this, [conf]);
}).prototype = {
  text: gMsg("Correlation Matrix"),
  getActions: function(){
    var me = this;
    var conf = this.conf;
    var myActions = [
      {"class": "excel", group: "visaction", tooltip: gMsg("Export to Microsoft Excel"),
        pressedHandler: me.exportToExcel,
        scope: me
      }
    ];
    var superActions = XavierTab.prototype.getActions.call(this);
    if (superActions.length) {
      superActions = superActions.concat({"class": "separator"});
    }
    var actions = superActions.concat(myActions);
    return actions;
  },
  getMdx: function(cubeName) {
    var rowAxis = this.getRowAxis();
    var columnAxis = this.getColumnAxis();
    
    var categoriesSet = "[Categories]";

    var withClause = [
      "WITH",
      "SET " + categoriesSet,
      "AS",
      rowAxis.getMemberSetMdx()
    ].join("\n");

    //generate correlation expression for each measure against each measure.
    var measures = [];
    columnAxis.eachSetDef(function(setDef1, setDefIndex1, hierarchy1, hierarchyIndex1){
      var setDef1Metadata = setDef1.metadata,
          hierarchyUniqueName = hierarchy1.HIERARCHY_UNIQUE_NAME,
          setDef1MemberUniqueName = setDef1Metadata.MEASURE_UNIQUE_NAME,
          captionPrefix = "Correlation of " + setDef1Metadata.MEASURE_CAPTION + " and ",
          expressionPrefix = "Correlation(" + categoriesSet + ", " + setDef1MemberUniqueName + ", "
      ;
      columnAxis.eachSetDef(function(setDef2, setDefIndex2, hierarchy2, hierarchyIndex2){
        var setDef2Metadata = setDef2.metadata,
            caption = captionPrefix + setDef2Metadata.MEASURE_CAPTION,
            expression = expressionPrefix + setDef2Metadata.MEASURE_UNIQUE_NAME + ")"
        ;
        var setDef = {
          HIERARCHY_UNIQUE_NAME: hierarchyUniqueName,
          MEMBER_UNIQUE_NAME: hierarchyUniqueName + ".[" + caption + "]",
          CAPTION: caption,
          calculation: expression
        };
        withClause += [
          "",
          "MEMBER " + setDef.MEMBER_UNIQUE_NAME,
          "AS",
          setDef.calculation
        ].join("\n");
        measures.push(setDef.MEMBER_UNIQUE_NAME);
      }, this);
    }, this);

    measures = "{" + measures.join("\n,") + "}";
    var slicerAxis = this.getSlicerAxis();
    var slicerCalculatedMemberMdx = slicerAxis.getCalculatedMembersMdx();
    if (slicerCalculatedMemberMdx) {
      withClause += "\n" + slicerCalculatedMemberMdx;
    }
    var slicerMdx = slicerAxis.getMdx();

    //rely on the prototypes method to actually generate MDX
    var mdx = [
      withClause,
      "SELECT " + measures + " ON 0",
      "FROM " + QueryDesignerAxis.prototype.braceIdentifier(cubeName)
    ].join("\n");

    if (slicerMdx) {
      mdx += [
        "",
        "WHERE " + slicerMdx
      ].join("\n");
    }
    //
    return mdx;
  },
  createQueryDesigner: function(dom, tab){
    var queryDesigner = this.queryDesigner = new QueryDesigner({
      container: cEl("DIV", {}, null, dom),
      dnd: this.getDnd(),
      xmla: this.getXmla(),
      xmlaTreeView: this.getXmlaTreeView(),
      axes: [
        {
          id: Xmla.Dataset.AXIS_COLUMNS,
          label: gMsg("Measures"),
          classes: ["measures"],
          tooltip: gMsg("Items on this axis are cross-correlated"),
          hint: gMsg("Drag any measures unto this axis to compute their correlation."),
          mandatory: true,
          isDistinct: true,
          userSortable: false,
          drop: {
            include: ["measure"]
          },
          hasEmptyCheckBox: false
        },
        {
          id: Xmla.Dataset.AXIS_ROWS,
          label: gMsg("Categories"),
          tooltip: gMsg("This axis forms the series for which correlation will be calculated."),
          hint: gMsg("Drag levels or members to the categories axis. This will create the series for which correlation will be calculated."),
          mandatory: true,
          canBeEmpty: false,
          isDistinct: false,
          hierarchized: false,
          userSortable: false,
          "class": "categories",
          hasEmptyCheckBox: false,
          drop: {
            include: ["level", "member"]
          },
          allowMultipleLevels: false
        },
        {
          id: Xmla.Dataset.AXIS_SLICER
        }
      ],
      getMdx: this.getMdx
    });

    return queryDesigner;
  },
  initCorrelationMatrix: function(dom){
    var correlationMatrix = this.visualizer = new CorrelationMatrix();
    dom.appendChild(correlationMatrix.getDom());
    return correlationMatrix;
  },
  initVisualizer: function(dom){
    var visualizer = this.initCorrelationMatrix(dom);
    return this.visualizer;
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
XavierCorrelationMatrixTab.newInstance = function(conf){
  return new XavierCorrelationMatrixTab(conf);
}
adopt(XavierCorrelationMatrixTab, XavierTab);
