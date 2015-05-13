/*

Copyright 2014, 2015 Roland Bouman (roland.bouman@gmail.com)

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
var XavierTabPane;
var DataTable;

(function(){

/**
*  tab pane
*/
(XavierTabPane = function(conf){
  if (!conf) {
    conf = {};
  }
  if (!conf.classes) {
    conf.classes = ["xavier-tabpane"];
  }
  if (!conf.tabs) {
    conf.tabs = [
      new XavierDocumentTab({
        tabPane: this
      })
    ];
  }
  arguments.callee._super.apply(this, [conf]);
}).prototype = {
  closeTab: function(index) {
    var tab = this.getTab(index);
    tab.destroy();
    TabPane.prototype.closeTab.call(this, index);
  },
  getAutoRunEnabled: function(){
    return this.conf.autorun;
  },
  setAutoRunEnabled: function(autorun){
    this.conf.autorun = autorun;
  },
  getQueryDesigner: function(){
    var selectedTab = this.getSelectedTab();
    if (!selectedTab) {
      return null;
    }
    return selectedTab.getQueryDesigner();
  },
  getDnd: function(){
    return this.conf.dnd;
  },
  getXlsxExporter: function(){
    var excelExporter = this.conf.excelExporter;
    if (!excelExporter) {
      excelExporter = new XlsxExporter();
      this.conf.excelExporter = excelExporter;
    }
    return excelExporter;
  },
  getXmla: function(){
    return this.conf.xmla;
  },
  getXmlaTreeView: function(){
    return this.conf.xmlaTreeView;
  },
  newInfoTab: function(conf){
    var infoTab = new XavierDocumentTab({
      tabPane: this,
      text: conf.title,
      url: conf.url,
      forCube: true
    });
    this.addTab(infoTab);
    return infoTab;
  },
  newPivotTableTab: function(){
    var pivotTableTab = new XavierPivotTableTab({
      tabPane: this
    });
    this.addTab(pivotTableTab);
    return pivotTableTab;
  },
  newTableTab: function(){
    var tableTab = new XavierTableTab({
      tabPane: this
    });
    this.addTab(tableTab);
    return tableTab;
  },
  newPieChartTab: function(){
    var pieChartTab = new XavierPieChartTab({
      tabPane: this
    });
    this.addTab(pieChartTab);
    return pieChartTab;
  },
  newBarChartTab: function(){
    var barChartTab = new XavierBarChartTab({
      tabPane: this
    });
    this.addTab(barChartTab);
    return barChartTab;
  },
  setCube: function(metadata){
    if (metadata.cube && metadata.catalog && metadata.datasource) {
      this.setDatasource(metadata.datasource);
      this.setCatalog(metadata.catalog);
      this.setCube(metadata.cube);
    }
    else {
      this.cube = metadata;
    }
  },
  getCube: function(){
    return this.cube;
  },
  setCatalog: function(metadata){
    this.catalog = metadata;
  },
  getCatalog: function(){
    return this.catalog;
  },
  setDatasource: function(metadata){
    this.datasource = metadata;
  },
  getDatasource: function(){
    return this.datasource;
  },
  doLayout: function(){
    this.eachTab(function(tab, index){
      tab.doLayout();
    });
  },
  clear: function(){
    var selectedTab = this.getSelectedTab();
    if (!selectedTab) {
      return null;
    }
    selectedTab.clear();
  },
  executeQuery: function(){
    var selectedTab = this.getSelectedTab();
    if (!selectedTab) {
      return null;
    }
    selectedTab.executeQuery();
  },
  exportToExcel: function(){
    var selectedTab = this.getSelectedTab();
    if (!selectedTab) {
      return null;
    }
    selectedTab.exportToExcel();
  },
  hasTabsForCube: function(){
    var ret;
    if (this.eachTab(function(tab, index){
      if (tab.isForCube() === true) {
        return false;
      }
    }) === false) {
      ret = true;
    }
    else {
      ret = false;
    }
    return ret;
  },
  closeTabsForCube: function(){
    var i, n, tabsToClose = [];
    this.eachTab(function(tab, index){
      if (tab.isForCube() === true) {
        tabsToClose.push(index);
      }
    });
    for (i = tabsToClose.length - 1; i >= 0; i--){
      this.closeTab(tabsToClose[i]);
    }
  }
};
adopt(XavierTabPane, TabPane);
linkCss("../css/xaviertabpane.css");

/**
*   Generic tab
*/
var XavierTab;
(XavierTab = function(conf){
  this.conf = conf || {};
  if (!this.classes) {
    this.classes = [];
  }
  this.classes.push(XavierTab.prefix);
  this.id = String(XavierTab.id++);
  this.selected = true;
  this.closeable = true;
  this.component = this;
}).prototype = {
  queryDesigner: null,
  visualizer: null,
  isForCube: function(){
    var forCube;
    if (this instanceof XavierDocumentTab) {
      forCube = this.conf.forCube || this.forCube;
    }
    else {
      forCube = true;
    }
    return forCube;
  },
  destroy: function(){
    if (this.toolbar) {
      this.toolbar.destroy();
    }
    this.clear();
    this.conf.tabPane = null;
    dEl(this.getId());

    var dataset = this.getDataset();
    if (dataset) {
      dataset.close();
    }

    var queryDesigner = this.getQueryDesigner();
    if (queryDesigner) {
      queryDesigner.destroy();
    }

    var visualizer = this.getVisualizer();
    if (visualizer && iFun(visualizer.destroy)) {
      visualizer.destroy();
    }
  },
  getId: function(){
    return XavierTab.prefix + this.id;
  },
  getQueryDesigner: function(){
    return this.queryDesigner;
  },
  getVisualizer: function(){
    return this.visualizer;
  },
  getDataset: function(){
    if (this.dataset) {
      return this.dataset;
    }
    var visualizer = this.getVisualizer();
    if (!visualizer) {
      return;
    }
    if (iFun(visualizer.getDataset)) {
      return visualizer.getDataset();
    }
    if (visualizer.dataset) {
      return visualizer.dataset;
    }
    //throw "Unsupported operation: getDataset";
    return null;
  },
  getDom: function(){
    var el = gEl(this.getId());
    if (!el) {
      el = this.createDom();
    }
    return el;
  },
  getTabPane: function() {
    return this.conf.tabPane;
  },
  getXlsxExporter: function(){
    return this.getTabPane().getXlsxExporter();
  },
  getXmla: function(){
    return this.getTabPane().getXmla();
  },
  getXmlaTreeView: function(){
    return this.getTabPane().getXmlaTreeView();
  },
  getDnd: function(){
    return this.getTabPane().getDnd();
  },
  getAutoRunEnabled: function(){
    return this.getTabPane().getAutoRunEnabled();
  },
  getCube: function(){
    return this.getTabPane().getCube();
  },
  getCatalog: function(){
    return this.getTabPane().getCatalog();
  },
  getDatasource: function(){
    return this.getTabPane().getDatasource();
  },
  clear: function(){
    var queryDesigner = this.getQueryDesigner();
    if (queryDesigner && iFun(queryDesigner.clear)) {
      queryDesigner.clear();
    }
    var visualizer = this.getVisualizer();
    if (visualizer && iFun(visualizer.clear)) {
      visualizer.clear();
    }
    if (this.dataset) {
      this.dataset.close();
      this.dataset = null;
    }
    else
    if (visualizer && visualizer.dataset) {
      visualizer.dataset.close();
      visualizer.dataset = null;
    }
  },
  executeQuery: function(){
    var me = this;
    var queryDesigner = this.getQueryDesigner();
    if (!queryDesigner) {
      return false;
    }
    var visualizer = this.getVisualizer();
    if (!visualizer) {
      return false;
    }
    var xmla = this.getXmla();
    if (!xmla) {
      return false;
    }
    try {
      visualizer.clear();
      if (!queryDesigner.checkValid()) {
        return;
      }
      busy(true);
      this.doLayout();
      var datasource = this.getDatasource();
      var catalog = this.getCatalog();
      var cube = this.getCube();
      var mdx = queryDesigner.getMdx(cube.CUBE_NAME);
      //console.time("executeQuery");
      xmla.execute({
        url: datasource.URL,
        properties: {
          DataSourceInfo: datasource.DataSourceInfo,
          Catalog: catalog.CATALOG_NAME,
          Format: Xmla.PROP_FORMAT_MULTIDIMENSIONAL
        },
        statement: mdx,
        success: function(xmla, options, dataset){
          //console.timeEnd("executeQuery");
          try {
            //console.time("renderDataset");
            visualizer.renderDataset(dataset, queryDesigner);
            //console.timeEnd("renderDataset");
          }
          catch (exception) {
            showAlert(gMsg("Error rendering dataset"), exception.toString() || exception.message || gMsg("Unexpected error"));
          }
          busy(false);
        },
        error: function(xmla, options, exception){
          //console.timeEnd("executeQuery");
          busy(false);
          showAlert("Error executing query", exception.toString());
        }
      });
    }
    catch (exception) {
      busy(false);
      showAlert(gMsg("Error executing query"), exception.toString() || exception.message || gMsg("Unexpected error"));
    }
  },
  doLayout: function(){
    var visualizer = this.getVisualizer();
    if (!visualizer) {
      return;
    }
    visualizer.doLayout();
  },
  exportToExcel: function(){
    try {
      var visualizer = this.getVisualizer();
      var dataset = this.getDataset();
      var queryDesigner = this.getQueryDesigner();
      if (!visualizer || !queryDesigner || !dataset) {
        throw "There is nothing to export. Please enter a query first.";
      }
      xlsxExporter = this.getXlsxExporter();
      var catalog = this.getCatalog();
      var cube = this.getCube();
      var name = catalog.CATALOG_NAME + " " + cube.CUBE_CAPTION + " - ";
      var i, hierarchyCount, hierarchies, hierarchy, measures, measure, measureNames = [];
      var measureAxis, axes = {};
      queryDesigner.eachAxis(function(id, axis){
        axes[id] = [];
        hierarchyCount = axis.getHierarchyCount();
        for (i = 0; i < hierarchyCount; i++){
          hierarchy = axis.getHierarchyByIndex(i);
          if (axis.getHierarchyName(hierarchy) === QueryDesigner.prototype.measuresHierarchyName) {
            measureAxis = id;
            var j, setDef,
                setDefs = axis.setDefs[QueryDesigner.prototype.measuresHierarchyName],
                n = setDefs.length
            ;
            for (j = 0; j < n; j++) {
              setDef = setDefs[j];
              measureNames.push(axis.getMemberCaption(setDef.metadata));
            }
          }
          else {
            axes[id].push(axis.getHierarchyCaption(hierarchy));
          }
        }
      });

      var last;
      if (measureNames.length) {
        last = measureNames.pop();
        name += measureNames.join(", ");
        if (measureNames.length) {
          name += " " + gMsg("and") + " ";
        }
        name += last;
      }
      function axisDescription(hierarchies){
        var last, name = "";
        last = hierarchies.pop();
        name += hierarchies.join(",");
        if (hierarchies.length) {
          name += " " + gMsg("and") + " ";
        }
        name += last;
        return name;
      }

      var by, hasBy, vs, slicer;
      switch (measureAxis) {
        case String(Xmla.Dataset.AXIS_COLUMNS):
        case Xmla.Dataset.AXIS_SLICER:
          by = Xmla.Dataset.AXIS_COLUMNS;
          vs = Xmla.Dataset.AXIS_ROWS;
          break;
        case String(Xmla.Dataset.AXIS_ROWS):
          by = Xmla.Dataset.AXIS_ROWS;
          vs = Xmla.Dataset.AXIS_COLUMNS;
          break;
        //no measures specified
        default:
          by = Xmla.Dataset.AXIS_COLUMNS;
          vs = Xmla.Dataset.AXIS_ROWS;
      }

      by = axes[by];
      var hasBy = by.length;
      if (hasBy) {
        if (last) {
          name += " " + gMsg("by") + " ";
        }
        name += axisDescription(by);
      }

      if (vs) {
        vs = axes[vs];
        if (vs && vs.length) {
          if (hasBy) {
            name += " " + gMsg("vs") + " ";
          }
          else {
          name += " " + gMsg("by") + " ";
          }
          name += axisDescription(vs);
        }
      }

      slicer = axes["SlicerAxis"];
      if (slicer && slicer.length) {
        name += " " + gMsg("for a selection of") + " " + axisDescription(slicer);
      }

      xlsxExporter.doExport(name, catalog.CATALOG_NAME, cube.CUBE_NAME, visualizer, queryDesigner);
    }
    catch (exception){
      showAlert(gMsg("Export Error"), gMsg(exception));
    }
  }
};
XavierTab.id = 0;
XavierTab.prefix = "xavier-tab";

/**
*   Welcome tab
*/
var XavierDocumentTab;
(XavierDocumentTab = function(conf){
  this.classes = ["welcome"];
  if (conf.text) {
    this.text = conf.text;
  }
  arguments.callee._super.apply(this, [conf]);
}).prototype = {
  text: gMsg("Welcome!"),
  createDom: function(){
    var conf = this.conf;
    var url = conf.url || "../doc/" + gMsg("en/welcome.html");
    var dom = cEl("IFRAME", {
      id: this.getId(),
      src: url,
      style: {
        "border-style": "none"
      },
      width: "100%",
      height: "100%"
    });
    return dom;
  }
};
adopt(XavierDocumentTab, XavierTab);

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
    this.dataGrid.clear();
  },
  getColumnInfo: function(queryDesignerAxis){
    var columnLookup = [], index = 0;
    queryDesignerAxis.eachSetDef(function(setDef, setDefIndex, hierarchy, hierarchyIndex){
      var levels;
      if (iUnd(columnLookup[hierarchyIndex])) {
        columnLookup[hierarchyIndex] = levels = {};
      }
      else {
        levels = columnLookup[hierarchyIndex];
      }
      var column = {
        label: setDef.caption,
        name: setDef.metadata.LEVEL_UNIQUE_NAME,
        index: index++
      };
      if (iDef(setDef.metadata.LEVEL_NUMBER)) {
        levels[setDef.metadata.LEVEL_NUMBER] = column;
      }
      else {
        levels[setDef.metadata.MEASURE_NAME] = column;
      }
    }, this);
    return columnLookup;
  },
  getColumns: function(columnInfo){
    var columns = [], i, n = columnInfo.length, levels, column;
    for (i = 0; i < n; i++) {
      levels = columnInfo[i];
      for (column in levels) {
        columns.push(levels[column]);
      }
    }
    return columns
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

    var cellOrdinal = 0;
    axis.eachTuple(function(tuple){
      var members = tuple.members, i, n = members.length, values = [];
      for (i = 0; i < n; i++){
        values[axisMap[i]] = members[i].Caption;
      }
      n = cellmap.length;
      for (i = 0; i < n; i++) {
        if (cellset.cellOrdinal() === cellOrdinal++) {
          values[cellmap[i]] = cellset.cellValue();
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

        var level = setDef.metadata.LEVEL_NUMBER;
        //store the setdef in its hierarchy.
        hierarchyStat.setDefs[level] = setDef;

        //update level stats for the hierarchy
        if (level > hierarchyStat.maxLevel) {
          hierarchyStat.maxLevel = level;
        }
        if (level < hierarchyStat.minLevel) {
          hierarchyStat.minLevel = level;
        }

      }
    }, this);

    //now that we know what the lowest level is for each hierarchy,
    //divide the set of items on those that are lowest in the hierarchy, and all others.
    var rowAxisItems = [], calculatedMeasures = [], hierarchyStat, setDefs, setDef, level;
    for (hierarchy in hierarchies) {
      hierarchyStat = hierarchies[hierarchy];
      setDefs = hierarchyStat.setDefs;

      //grab the lowest level
      setDef = setDefs[hierarchyStat.maxLevel];
      //push it to the row axis.
      rowAxisItems.push(setDef);
      setDef.dataGridColumn.memberIndex = memberIndex++;
      //remove it from the column axis.
      delete setDefs[hierarchyStat.maxLevel];

      //create a calculated measure for the other levels
      for (level in setDefs){
        setDef = setDefs[level];
        setDef.dataGridColumn.cellIndex = cellIndex++;
        calculatedMeasures.push(setDef);
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
          calculatedMeasure, metadata, hierarchyName, caption, expression
      ;
      //move the measures to the new axis
      if (columnAxis.hasMeasures()) {
        this.moveMeasures(columnAxis, rowAxis);
      }
      for (i = 0; i < n; i++) {
        calculatedMeasure = calculatedMeasures[i];
        metadata = calculatedMeasure.metadata;
        hierarchyName = rowAxis.getHierarchyName(metadata);
        hierarchyName = rowAxis.stripBracesFromIdentifier(hierarchyName);
        caption = hierarchyName + "." + metadata.LEVEL_NAME;
        expression =  "Ancestor(" +
                      " [" + hierarchyName + "].CurrentMember" +
                      ",[" + hierarchyName + "].[" + metadata.LEVEL_NAME + "]" +
                      //use explicit full property, .Caption is not supported by everyone (http://issues.iccube.com/issue/ic3pub-146)
                      ").Properties(\"MEMBER_CAPTION\")"
        ;
        rowAxis.addMember(measures.length + i, "calculated-member", {
          HIERARCHY_UNIQUE_NAME: QueryDesigner.prototype.measuresHierarchyName,
          MEMBER_UNIQUE_NAME: "[Measures].[" + caption + "]",
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
  initQueryDesigner: function(dom){
    var queryDesigner = this.queryDesigner = new QueryDesigner({
      container: cEl("DIV", {
      }, null, dom),
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
          hasEmptyCheckBox: false,
          drop: {
            include: ["level", "measure"]
          }
        },
        {
          id: Xmla.Dataset.AXIS_SLICER
        }
      ],
      getMdx: this.getMdx
    });

    queryDesigner.listen({
      changed: function(queryDesigner, event, data){
        if (this.getAutoRunEnabled()) {
          this.executeQuery();
          this.doLayout();
        }
        else {

        }
      },
      scope: this
    });
    queryDesigner.render();
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
    this.initTable(dom);
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
adopt(XavierTableTab, XavierTab);

/**
*   Pivot table tab
*/
var XavierPivotTableTab;
(XavierPivotTableTab = function(conf){
  conf = conf || {};
  conf.showColumnHierarchyHeaders = Boolean(conf.showColumnHierarchyHeaders);
  conf.showRowHierarchyHeaders = Boolean(conf.showRowHierarchyHeaders);
  this.classes = ["pivot-table"];
  arguments.callee._super.apply(this, [conf]);
}).prototype = {
  text: gMsg("Pivot Table"),
  initToolbar: function(dom){
    var conf = this.conf;
    var toolbar = this.toolbar = new Toolbar({
      container: dom
    });
    toolbar.addButton([
      {"class": "show-column-hierarchy-headers",
        tooltip: gMsg("Show column hierarchy headers"),
        toggleGroup: "show-column-hierarchy-headers",
        depressed: conf.showColumnHierarchyHeaders
      },
      {"class": "show-row-hierarchy-headers",
        tooltip: gMsg("Show row hierarchy headers"),
        toggleGroup: "show-row-hierarchy-headers",
        depressed: conf.showRowHierarchyHeaders
      }
    ]);
    toolbar.listen({
      scope: this,
      buttonPressed: function(toolbar, event, button){
        var conf = button.conf;
        var className = conf["class"];
        switch (className) {
          default:
            throw "Not implemented";
        }
      },
      afterToggleGroupStateChanged: function(toolbar, event, data){
        var depressedButton = toolbar.getDepressedButtonInToggleGroup(data.group);
        switch (data.group) {
          case "edit":
            this.editMode(depressedButton);
            break;
          case "show-empty":
            this.emptyCells(depressedButton);
            break;
          case "show-column-hierarchy-headers":
            this.visualizer.showHorizontalHierarchyHeaders(depressedButton ? true : false);
            break;
          case "show-row-hierarchy-headers":
            this.visualizer.showVerticalHierarchyHeaders(depressedButton ? true : false);
            break;
        }
      }
    });
  },
  initQueryDesigner: function(dom){
    var intrinsicProperties = "PARENT_UNIQUE_NAME";
    var queryDesigner = this.queryDesigner = new QueryDesigner({
      container: cEl("DIV", {}, null, dom),
      dnd: this.getDnd(),
      xmla: this.getXmla(),
      xmlaTreeView: this.getXmlaTreeView(),
      axes: [
        {
          id: Xmla.Dataset.AXIS_COLUMNS,
          label: gMsg("Columns"),
          tooltip: gMsg("Items on this axis are used to generate columns for the pivot table"),
          hint: gMsg("Drag any levels, members or measures unto the columns axis to create columns in the pivot table."),
          "class": "columns",
          mandatory: true,
          intrinsicProperties: intrinsicProperties
        },
        {
          id: Xmla.Dataset.AXIS_ROWS,
          label: gMsg("Rows"),
          tooltip: gMsg("Items on this axis are used to generate rows for the pivot table"),
          hint: gMsg("Optionally, drag any levels, members or measures unto the row axis to create rows in the pivot table."),
          "class": "rows",
          intrinsicProperties: intrinsicProperties
        },
        {
          id: Xmla.Dataset.AXIS_SLICER
        }
      ]
    });
    queryDesigner.listen({
      changed: function(queryDesigner, event, data){
        if (this.getAutoRunEnabled()) {
          this.executeQuery();
        }
        else {

        }
      },
      scope: this
    });
    queryDesigner.render();
  },
  showHorizontalHierarchyHeaders: function(setting){
    var toolbar = this.toolbar;
    if (iDef(setting)) {
      //todo: set the button and propery on the pivot table
    }
    else {
      return toolbar.getDepressedButtonInToggleGroup("show-column-hierarchy-headers") ? true : false;
    }
  },
  showVerticalHierarchyHeaders: function(setting){
    var toolbar = this.toolbar;
    if (iDef(setting)) {
      //todo: set the button and propery on the pivot table
    }
    else {
      return toolbar.getDepressedButtonInToggleGroup("show-row-hierarchy-headers") ? true : false;
    }
  },
  initPivotTable: function(dom){
    var pivotTable = this.visualizer = new PivotTable({
      showHorizontalHierarchyHeaders: this.showHorizontalHierarchyHeaders(),
      showVerticalHierarchyHeaders: this.showVerticalHierarchyHeaders()
    });
    dom.appendChild(pivotTable.getDom());
    pivotTable.listen({
      scope: this,
      collapse: function(pivotTable, event, data){
        this.collapseMember(data);
      },
      expand: function(pivotTable, event, data){
        this.expandMember(data);
      }
    });
    return pivotTable;
  },
  drillMember: function (drillEventData, drillDirection){
    var queryDesigner = this.getQueryDesigner();
    var xmla = this.getXmla();
    var axis = queryDesigner.getAxis(drillEventData.axis);
    if (!axis) {
      throw "Invalid axis " + drillEventData.axis;
    }
    //first, fetch the metadata for this member
    var datasource = this.getDatasource();
    var catalogName = this.getCatalog().CATALOG_NAME;
    var cubeName = this.getCube().CUBE_NAME;
    var properties = {
      DataSourceInfo: datasource.DataSourceInfo,
      Catalog: catalogName
    };
    var restrictions = {
      CATALOG_NAME: catalogName,
      CUBE_NAME: cubeName,
      MEMBER_UNIQUE_NAME: drillEventData.member
    };
    var drillAction = function(xmla, options, rowset){
      busy(false);
      var rows = rowset.fetchAllAsObject();
      if (rows.length !== 1) {
        throw "Expected exactly 1 result row, not " + rows.length;
      }
      var metadata = rows[0];
      var hierarchy = metadata.HIERARCHY_UNIQUE_NAME;
      var setDefs = axis.getSetDefs(hierarchy);
      if (!setDefs) {
        throw "Cant find set definitions for " + setDefs;
      }
      switch (drillDirection) {
        case "up":
          //TODO: find descendants with a proper metadata query.
          var descendants;
          try {
            descendants = axis.getMemberDescendants(metadata, "member");
          }
          catch (e) {
            if (e === "Member not found") {
              if (metadata.LEVEL_NUMBER === 0) {
                descendants = [];
              }
              else {
                descendants = axis.getMemberDescendants(metadata, "member-drilldown");
              }
              var member = axis.getMember(metadata, "member-drilldown");
              if (!member) {
                throw "Member not found";
              }
              descendants.push(member.setDef);
            }
          }
          var removed = axis.removeMember(descendants);
          if (!removed) {
            //apparently this member was not expanded from within the pivot table.
            //manually remove all child expressions of this member.
            debugger;
          }
          break;
        case "down":
          axis.addMember(setDefs.length, "member-drilldown", metadata);
          break;
        default:
          throw "Unknown drill direction " + drillDirection;
      }
    };

    xmla.discoverMDMembers({
      url: datasource.URL,
      properties: properties,
      restrictions: restrictions,
      success: drillAction,
      error: function(xmla, options, exception){
        busy(false);
        throw exception;
      }
    });
  },
  collapseMember: function(data){
    this.drillMember(data, "up");
  },
  expandMember: function(data) {
    this.drillMember(data, "down");
  },
  createDom: function(){
    var me = this;

    var dom = cEl("DIV", {
      id: this.getId()
    });
    this.initToolbar(dom);
    this.initQueryDesigner(dom);
    this.initPivotTable(dom);
    return dom;
  }
};
adopt(XavierPivotTableTab, XavierTab);

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
  padding: 5,
  getChartId: function(){
    var ctor = XavierVisualizer;
    return ctor.prefix + ctor.instanceId++;
  },
  clear: function(){
    dCh(this.getDom());
  },
  getContainer: function(){
    return this.conf.container;
  },
  getId: function(){
    return this.conf.id;
  },
  doLayout: function(){
  },
  createDom: function(){
    var container = this.getContainer();
    var dom = cEl("DIV", {
      id: this.getId(),
      "class": confCls(this.conf).join(" ")
    }, null, container);
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
  getLabelForTuple: function(tuple) {
    var members = tuple.members, i, n = members.length, member, label = "";
    for (i = 0; i < n; i++){
      member = members[i];
      if (i) {
        label += " - ";
      }
      label += member.Caption;
    }
    return label;
  },
  makeChartDom: function(dom, x, y, width, height, title, titlePosition){
    var id = this.getChartId();

    var children = [];
    if (titlePosition) {
      var chartTitle = cEl("DIV", {
        id: id + "-title",
        "class": "xavier-chart-title"
      }, title);
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
      chartBody.style.width = (width - 2 * chartTitle.clientHeight) + "px";
      chartBody.style.height = (height - chartTitle.clientHeight) + "px";
      chartBody.style.left = chartTitle.clientHeight + "px";
      switch (titlePosition) {
        case "top":
          chartTitle.style.top = "0px";
          chartBody.style.top = chartTitle.clientHeight + "px";
          break;
        case "bottom":
          chartBody.style.top = "0px";
          chartTitle.style.top = chartBody.style.height;
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
  generateTrellisList: function(dom, pageAxis, rowAxis, columnAxis, cellset) {
    this.createGridForTuples(dom, pageAxis, "top", function(tuple, dom, len){
      this.renderCharts(dom.lastChild, rowAxis, columnAxis, cellset);
    }, this);
  },
  generateTrellisMatrix: function(dom, chapterAxis, pageAxis, rowAxis, columnAxis, cellset) {
    var matrix = cEl("TABLE", {
      "class": "xavier-chart xavier-trellis-matrix",
      cellpadding: 2,
      cellspacing: 2
    }, null, dom);

    //column header
    var columnWidth = dom.clientWidth / (1 + pageAxis.tupleCount());
    var tr = matrix.insertRow(matrix.rows.length);
    var td = tr.insertCell(tr.cells.length);
    td.className = "trellis-pivot";
    pageAxis.eachTuple(function(tuple) {
      td = tr.insertCell(tr.cells.length);
      td.style.width = columnWidth + "px";
      td.className = "trellis-header trellis-column-header";
      td.innerHTML = this.getLabelForTuple(tuple);
    }, this);

    var rowHeight = (dom.clientHeight - tr.clientHeight) / chapterAxis.tupleCount();
    chapterAxis.eachTuple(function(tuple){
      //row header
      tr = matrix.insertRow(matrix.rows.length);
      td = tr.insertCell(tr.cells.length);
      td.style.height = rowHeight + "px";
      td.className = "trellis-header trellis-row-header";
      td.innerHTML = this.getLabelForTuple(tuple);

      pageAxis.eachTuple(function(tuple) {
        td = tr.insertCell(tr.cells.length);
        this.renderCharts(td, rowAxis, columnAxis, cellset);
      }, this);
    }, this);
  },
  renderDataset: function(dataset, queryDesigner){
    this.clear();
    this.dataset = dataset;

    var dom = this.getDom();
    this.charts = [];
    this.chartDivs = [];
    if (dataset.hasChapterAxis()){
      this.generateTrellisMatrix(
        dom,
        dataset.getChapterAxis(),
        dataset.getPageAxis(),
        dataset.getRowAxis(),
        dataset.getColumnAxis(),
        dataset.getCellset()
      );
    }
    else
    if (dataset.hasPageAxis()) {
      this.generateTrellisList(
        dom,
        dataset.getPageAxis(),
        dataset.getRowAxis(),
        dataset.getColumnAxis(),
        dataset.getCellset()
      );
    }
    else {
      this.renderCharts(
        dom,
        dataset.getRowAxis(),
        dataset.getColumnAxis(),
        dataset.getCellset()
      );
    }
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
  initQueryDesigner: function(dom){
    //noop. Override.
  },
  initChart: function(dom){
    //noop. Override.
  },
  createDom: function(){
    var me = this;
    var dom = cEl("DIV", {
      id: this.getId(),
      "class": [XavierChartTab.prefix]
    });
    var queryDesigner = this.initQueryDesigner(dom);
    this.queryDesigner = queryDesigner;
    queryDesigner.listen({
      changed: function(queryDesigner, event, data){
        if (this.getAutoRunEnabled()) {
          this.executeQuery();
        }
        else {

        }
      },
      scope: this
    });
    queryDesigner.render();

    this.visualizer = this.initChart(dom);
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
  renderCharts: function(dom, measuresAxis, categoriesAxis, cellset){
    var titlePosition;
    if (dom.tagName === "TD") {
      titlePosition = false;
    }
    else {
      titlePosition = "bottom";
    }
    this.createGridForTuples(dom, measuresAxis, titlePosition, function(tuple, dom, len){
      var data = [];
      categoriesAxis.eachTuple(function(tuple){
        data.push({
          category: this.getLabelForTuple(tuple),
          measure: cellset.cellValue()
        });
        cellset.nextCell();
      }, this);

      var ndx = crossfilter(data);
      var dimension = ndx.dimension(function(d){
        return d.category;
      });
      var group = dimension.group().reduceSum(function(d){
        return d.measure;
      });

      var chart = dc.pieChart("#" + dom.lastChild.id);
      var dim = Math.min(dom.lastChild.clientWidth, dom.lastChild.clientHeight);
      chart
        .width(dim).height(dim)
        .dimension(dimension)
        .group(group)
      ;
      chart.render();

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
  initQueryDesigner: function(dom){
    var queryDesigner = new QueryDesigner({
      container: cEl("DIV", {}, null, dom),
      dnd: this.getDnd(),
      xmla: this.getXmla(),
      xmlaTreeView: this.getXmlaTreeView(),
      axes: [
        {
          id: Xmla.Dataset.AXIS_COLUMNS,
          label: gMsg("Categories"),
          tooltip: gMsg("Each combination of members forms a category to generate one slice of the pie chart. Choose one level, or a selection of members from a single level per hierarchy."),
          hint: gMsg("Drop levels or members to the categories axis. This will create the categories by which the pie chart(s) will be divided."),
          mandatory: true,
          canBeEmpty: false,
          "class": "levels",
          drop: {
            include: ["level", "member"]
          }
        },
        {
          id: Xmla.Dataset.AXIS_ROWS,
          label: gMsg("Measures"),
          tooltip: gMsg("Each measure on this axis generates one pie chart for that measure. Its value determines the size of the pie chart slices."),
          hint: gMsg("Drop measures on the measures axis. A pie chart will be created for each measure, and the pie slices are sized according to the value of the measure."),
          mandatory: true,
          canBeEmpty: false,
          "class": "measures",
          drop: {
            include: "measure"
          }
        },
        {
          id: Xmla.Dataset.AXIS_PAGES,
          label: gMsg("Columns"),
          tooltip: gMsg("For each unique combination of members, a list item is layed out and filled with pie charts."),
          hint: gMsg("Optionally, drop levels or members on the columns axis to create a list of multiple pies."),
          canBeEmpty: false,
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
  initChart: function(dom){
    var chart = new XavierPieChart({
      container: dom
    });
    return chart;
  }
};
XavierPieChartTab.prefix = "xavier-pie-chart-tab";
adopt(XavierPieChartTab, XavierChartTab);


var XavierBarChart;
(XavierBarChart = function(conf){
  conf = conf || {};
  this.conf = conf;
  if (!conf.classes) {
    conf.classes = [];
  }
  conf.classes.push(arguments.callee.prefix);
  arguments.callee._super.apply(this, [conf]);
}).prototype = {
  renderCharts: function(dom, categoriesAxis, measuresAxis, cellset){
    var data = [];

    var yAxisLabel = "", xAxisLabel = "";
    categoriesAxis.eachHierarchy(function(hierarchy){
      if (xAxisLabel) {
        xAxisLabel += " - ";
      }
      xAxisLabel += hierarchy.name;
    });

    var numMeasures = measuresAxis.tupleCount();
    categoriesAxis.eachTuple(function(tuple){
      var datum = {
        category: this.getLabelForTuple(tuple),
        values: []
      };
      measuresAxis.eachTuple(function(measure){
        //construct the y axis label.
        if (tuple.index === 0) {
          if (yAxisLabel) {
            if (numMeasures === measure.index + 1) {
              yAxisLabel += " and ";
            }
            else {
              yAxisLabel += ", ";
            }
          }
          yAxisLabel += this.getLabelForTuple(measure);
        }
        datum.values.push(cellset.cellValue());
        cellset.nextCell();
      }, this);
      data.push(datum);
    }, this);


    var xf = crossfilter(data);
    var dimension = xf.dimension(function(d){
      return d.category;
    });

    var title = yAxisLabel + " per " + xAxisLabel;
    var div = this.makeChartDom(dom, 0, 0, dom.clientWidth, dom.clientHeight, title, "top");
    var chart = dc.barChart("#" + div.lastChild.id);
    chart
      .xAxisLabel(xAxisLabel)
      .gap(10)
      .renderHorizontalGridLines(true)
      .yAxisLabel(yAxisLabel)
      .x(d3.scale.ordinal())
      .margins({
        left: 100,
        right: 30,
        top: 30,
        bottom: 50
      })
      .xUnits(dc.units.ordinal)
      .width(div.lastChild.clientWidth)
      .height(div.lastChild.clientHeight)
      .dimension(dimension)
      .brushOn(true)
      .centerBar(false)
      .elasticX(true)
      .xAxis().tickFormat()
    ;

    var groups = [];
    categoriesAxis.eachTuple(function(tuple){
      var group = dimension.group().reduceSum(function(d){
        return d.values[tuple.index];
      });
      if (tuple.index) {
        chart.stack(group, this.getLabelForTuple(tuple));
      }
      else {
        chart.group(group);
      }
    }, this);
    chart.render();
  }
};
XavierBarChart.prefix = "xavier-bar-chart";
adopt(XavierBarChart, XavierVisualizer);

var XavierBarChartTab;
(XavierBarChartTab = function(conf){
  conf = conf || {};
  this.classes = ["bar-chart"];
  arguments.callee._super.apply(this, [conf]);
}).prototype = {
  text: gMsg("Bar Chart"),
  initQueryDesigner: function(dom){
    var queryDesigner = new QueryDesigner({
      container: cEl("DIV", {}, null, dom),
      dnd: this.getDnd(),
      xmla: this.getXmla(),
      xmlaTreeView: this.getXmlaTreeView(),
      axes: [
        {
          id: Xmla.Dataset.AXIS_COLUMNS,
          label: gMsg("Measures"),
          tooltip: gMsg("Each measure on this axis generates one group."),
          hint: gMsg("Drag measures to the measures axis. The measure value determines the size of the bar."),
          mandatory: true,
          canBeEmpty: false,
          "class": "measures",
          drop: {
            include: "measure"
          }
        },
        {
          id: Xmla.Dataset.AXIS_ROWS,
          label: gMsg("Categories"),
          tooltip: gMsg("Each combination of members forms a category to generate bars in the bar chart. Choose one level, or a selection of members from a single level per hierarchy."),
          hint: gMsg("Drag levels or members to the categories axis to create categories for which bars are drawn."),
          mandatory: true,
          canBeEmpty: false,
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
  initChart: function(dom){
    var chart = new XavierBarChart({
      container: dom
    });
    return chart;
  }
};
XavierBarChartTab.prefix = "xavier-bar-chart-tab";
adopt(XavierBarChartTab, XavierChartTab);


})();