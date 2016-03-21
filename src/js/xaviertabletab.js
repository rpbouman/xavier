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
var DataTable;
(DataTable = function(){
  this.initDataGrid();
}).prototype = {
  destroy: function(){
    this.dataGrid.destroy();
  },
  initDataGrid: function(){
    this.dataGrid = new DataGrid({});
    this.dataGrid.setRowHeaders([{
      label: "Row",
      isAutoRowNum: true
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
    if (!dataset.hasColumnAxis()) {
      return;
    }
    this.dataset = dataset;

    var columns = queryDesigner.dataGridColumns, column,
        cells = [], rows = [], axisMap = [], cellmap = [], i, n = columns.length
    ;
    for (i = 0; i < n; i ++) {
      column = columns[i];
      if (iDef(column.memberIndex)) {
        axisMap[column.memberIndex] = column.dataGridColumnIndex;
      }
      else
      if (iDef(column.cellIndex)){
        cellmap[column.cellIndex] = column.dataGridColumnIndex;
      }
    }

    var axis, cellset, onlyMeasures;
    if (dataset.hasRowAxis()){
      axis = dataset.getRowAxis();
      cellset = dataset.getCellset();
      onlyMeasures = false;
    }
    else {
      axis = dataset.getColumnAxis();
      var columnAxis = queryDesigner.getColumnAxis();
      if (columnAxis.hasMeasures()){
        cellset = dataset.getCellset();
        onlyMeasures = columnAxis.getHierarchyCount() === 1;
      }
      else {
        onlyMeasures = false;
      }
    }
    var cellValueExtractor = cellset.cellFmtValue ? cellset.cellFmtValue : cellset.cellValue;

    var cellOrdinal = 0, columnIndex, value;
    axis.eachTuple(function(tuple){
      var members = tuple.members, i, n = members.length, values = [];
      for (i = 0; i < n; i++){
        values[axisMap[i]] = members[i].Caption;
      }
      n = cellmap.length;
      for (i = 0; i < n; i++) {
        if (cellset.cellOrdinal() === cellOrdinal++) {
          columnIndex = cellmap[i];
          column = columns[columnIndex];
          value = cellValueExtractor.call(cellset);
          values[columnIndex] = value;
          cellset.nextCell();
        }
        if (i && onlyMeasures) {
          axis.nextTuple();
        }
      }
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
var XavierTableTab;
(XavierTableTab = function(conf){
  this.classes = ["table"];
  arguments.callee._super.apply(this, [conf]);
}).prototype = {
  text: gMsg("Table"),
  getMdx: function(cubeName) {
    //datagrid columns: this is what we will be using to render the result
    var dataGridColumns = this.dataGridColumns = [], dataGridColumn, cellIndex = 0, memberIndex = 0;
    var columnAxis = this.getColumnAxis();
    var oldSetDefs = [], hierarchies = {}, measures = [];

    //analyze the query.
    columnAxis.eachSetDef(function(setDef, setDefIndex, hierarchy, hierarchyIndex){
      //in principle, each item on the axis will become a column in the datagrid.
      dataGridColumns.push(dataGridColumn = {
        label: setDef.caption,
        dataGridColumnIndex: dataGridColumns.length,
        isMeasure: false
      });
      setDef.dataGridColumn = dataGridColumn;
      oldSetDefs.push(setDef);
      var hierarchyName = columnAxis.getHierarchyName(hierarchy);
      if (columnAxis.isMeasureHierarchy(hierarchy)) {
        measures.push(setDef);
        //measure values will apper in cells,
        //so mark where we can find the cells for those datagrid columns
        dataGridColumn.cellIndex = cellIndex++;
        dataGridColumn.classes = ["measure", "datatype" + setDef.metadata.DATA_TYPE];
        dataGridColumn.isMeasure = true;
      }
      else {
        //make an inventory of the levels in the hierarchy.
        //we need to know what is the lowest level (highest level number)
        //because we want to put that on the row axis.
        //the remaining levels will be rewritten to calculated measures
        //and will be placed on the column axis.
        var hierarchyStat = hierarchies[hierarchyName];
        if (!hierarchyStat) {
          hierarchies[hierarchyName] = hierarchyStat = {
            minLevel: Number.MAX_VALUE,
            //don't be tempted to use Number.MIN_VALUE here, it's not good for you.
            maxLevel: -1,
            setDefs: {}
          };
        }

        var levelMetadata;
        switch (setDef.type) {
          case "level":
            levelMetadata = setDef.metadata;
            break;
          case "property":
          case "member":
            levelMetadata = setDef.levelMetadata;
            break;
        }
        var levelNumber = levelMetadata.LEVEL_NUMBER;
        var levelItems = hierarchyStat.setDefs[levelNumber];
        if (!levelItems) {
          hierarchyStat.setDefs[levelNumber] = levelItems = [];
        }
        //store the setdef in its hierarchy.
        levelItems.push(setDef);

        //update level stats for the hierarchy
        if (levelNumber > hierarchyStat.maxLevel) {
          hierarchyStat.maxLevel = levelNumber;
        }
        if (levelNumber < hierarchyStat.minLevel) {
          hierarchyStat.minLevel = levelNumber;
        }

      }
    }, this);

    //now that we know what the lowest level is for each hierarchy,
    //divide the set of items on those that are lowest in the hierarchy, and all others.
    var rowAxisItems = [], calculatedMeasures = [], hierarchyStat, setDefs, setDef, levelNumber, levelItems, n, i;
    for (hierarchy in hierarchies) {
      hierarchyStat = hierarchies[hierarchy];
      setDefs = hierarchyStat.setDefs;

      //grab the lowest level (that's the one at maxLevel)
      levelItems = setDefs[hierarchyStat.maxLevel];

      setDef = levelItems[0];

      if (setDef.type === "property") {
        var levelMetadata = setDef.levelMetadata;
        setDef = {
          caption: levelMetadata.LEVEL_CAPTION,
          type: "level",
          expression: levelMetadata.LEVEL_UNIQUE_NAME + ".Members",
          metadata: levelMetadata
        };
      }

      //push it to the row axis to force the grouping.
      rowAxisItems.push(setDef);

      //create a calculated measure for the other levels
      for (levelNumber in setDefs){
        levelItems = setDefs[levelNumber];
        for (i = 0, n = levelItems.length; i < n; i++) {
          setDef = levelItems[i];
          if (String(hierarchyStat.maxLevel) === levelNumber) {
            setDef.isAtMaxLevel = true;
          }
          setDef.dataGridColumn.cellIndex = cellIndex++;
          calculatedMeasures.push(setDef);
        }
      }
    }

    //if we have measures, or have hierarchies with more than one level
    //then we need to rewrite the query to 2 axes.
    if (calculatedMeasures.length || measures.length && rowAxisItems.length){
      //silence events and dom updates so we can rewrite the query.
      this.fireEvents(false);
      this.updateDom(false);
      //create new dummy axis
      var rowAxis = this.createAxis({
            id: Xmla.Dataset.AXIS_ROWS,
            hasEmptyCheckBox: false
          }),
          i, n = calculatedMeasures.length,
          calculatedMeasure, metadata,
          hierarchyName, caption, expression
      ;
      //move the measures to the new axis
      if (columnAxis.hasMeasures()) {
        this.moveMeasures(columnAxis, rowAxis);
      }
      //create calculated members
      var measuresHierarchyUniqueName = QueryDesigner.prototype.measuresHierarchyName;
      for (i = 0; i < n; i++) {
        calculatedMeasure = calculatedMeasures[i];
        metadata = calculatedMeasure.metadata;
        hierarchyName = rowAxis.getHierarchyName(metadata);
        hierarchyName = rowAxis.stripBracesFromIdentifier(hierarchyName);
        caption = hierarchyName.split("].[").join(".") + "." + calculatedMeasure.caption;

        expression = metadata.HIERARCHY_UNIQUE_NAME + ".CurrentMember";
        if (calculatedMeasure.isAtMaxLevel !== true) {
          expression =  "Ancestor(" + expression +
                        "," + metadata.LEVEL_UNIQUE_NAME +
                        ")"
          ;
        }

        if (calculatedMeasure.type === "property") {
          property = metadata.PROPERTY_NAME;
        }
        else {
          property = "MEMBER_CAPTION";
        }
        expression += ".PROPERTIES(\"" + property + "\")";
        rowAxis.addMember(measures.length + i, "calculated-member", {
          HIERARCHY_UNIQUE_NAME: measuresHierarchyUniqueName,
          MEMBER_UNIQUE_NAME: measuresHierarchyUniqueName + ".[" + caption + "]",
          CAPTION: caption,
          calculation: expression
        });
      }
      //place the lowest level items on the column axis.
      columnAxis.clear();
      n = rowAxisItems.length;
      for (i = 0; i < n; i++) {
        setDef = rowAxisItems[i];
        columnAxis.addMember(i - 1, setDef.type, setDef.metadata);
      }
      //swap axes. Measures is now on columns, dimensions on rows.
      this.swapAxes(columnAxis, rowAxis);
    }

    //rely on the prototypes method to actually generate MDX
    var mdx = QueryDesigner.prototype.getMdx.call(this, cubeName);

    if (rowAxis){

      //restore the state of the query designer
      this.swapAxes(columnAxis, rowAxis);
      this.removeAxis(rowAxis);

      //re-store column axis to original state.
      columnAxis.clear();
      n = oldSetDefs.length;
      for (i = 0; i < n; i++){
        setDef = oldSetDefs[i];
        columnAxis.addMember(i-1, setDef.type, setDef.metadata);
      }

      //start firing events and updating the dom again.
      this.fireEvents(true);
      this.updateDom(true);
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
          label: gMsg("Columns"),
          classes: ["columns"],
          tooltip: gMsg("Items on this axis are used to generate columns for the table"),
          hint: gMsg("Drag any levels, members or measures unto the columns axis to create columns in the data table."),
          mandatory: true,
          isDistinct: true,
          hasEmptyCheckBox: false,
          drop: {
            include: ["level", "property", "measure", "derived-measure", "member"]
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
  initTable: function(dom){
    var dataTable = this.visualizer = new DataTable();
    dom.appendChild(dataTable.getDom());
    return dataTable;
  },
  createDom: function(){
    var me = this;
    var dom = cEl("DIV", {
      id: this.getId()
    });
    this.initQueryDesigner(dom);
    this.visualizer = this.initTable(dom);
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
XavierTableTab.newInstance = function(conf){
  return new XavierTableTab(conf);
}
adopt(XavierTableTab, XavierTab);
