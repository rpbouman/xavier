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
      new XavierWelcomeTab({
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
  getXmla: function(){
    return this.conf.xmla;
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
  setCube: function(metadata){
    this.cube = metadata;
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
  destroy: function(){
    if (this.toolbar) {
      this.toolbar.destroy();
    }
    this.clear();
    this.conf.tabPane = null;
    dEl(this.getId());
    if (this.queryDesigner) {
      this.queryDesigner.destroy();
    }
    if (this.visualizer) {
      this.visualizer.destroy();
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
  getXmla: function(){
    return this.getTabPane().getXmla();
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
  },
  executeQuery: function(){
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
    busy(true);
    try {
      visualizer.clear();
      var datasource = this.getDatasource();
      var catalog = this.getCatalog();
      var cube = this.getCube();
      var mdx = queryDesigner.getMdx(cube.CUBE_NAME);
      if (mdx) {
        console.log("MDX: " + mdx);
      }
      else {
        console.log("No MDX, bailing out");
        //throw "Not a valid query";
        busy(false);
        return;
      }
      console.time("executeQuery");
      xmla.execute({
        url: datasource.URL,
        properties: {
          DataSourceInfo: datasource.DataSourceInfo,
          Catalog: catalog.CATALOG_NAME
        },
        statement: mdx,
        success: function(xmla, options, dataset){
          console.timeEnd("executeQuery");
          try {
            console.time("renderDataset");
            visualizer.renderDataset(dataset, queryDesigner);
          console.timeEnd("renderDataset");
          }
          catch (exception) {
            showAlert(gMsg("Error rendering dataset"), exception.toString() || exception.message || gMsg("Unexpected error"));
          }
          busy(false);
        },
        error: function(xmla, options, exception){
          console.timeEnd("executeQuery");
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
  }
};
XavierTab.id = 0;
XavierTab.prefix = "xavier-tab";

/**
*   Welcome tab
*/
var XavierWelcomeTab;
(XavierWelcomeTab = function(conf){
  this.classes = ["welcome"];
  arguments.callee._super.apply(this, [conf]);
}).prototype = {
  text: gMsg("Welcome!"),
  createDom: function(){
    var dom = cEl("IFRAME", {
      id: this.getId(),
      src: "../doc/" + gMsg("en/welcome.html"),
      style: {
        "border-style": "none"
      },
      width: "100%",
      height: "100%"
    });
    return dom;
  }
};
adopt(XavierWelcomeTab, XavierTab);

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
  renderDataset: function(dataset, queryDesigner){
    if (!dataset.hasColumnAxis()) {
      return;
    }

    var columnAxis = queryDesigner.getColumnAxis();
    var columnAxisInfo = this.getColumnInfo(columnAxis);
    var columns = this.getColumns(columnAxisInfo)
    var cells = [];

    var primaryAxis, secondaryAxis, measureColumns, j, m = 0, cellOrdinal, cell;
    if (dataset.hasRowAxis()) {
      primaryAxis = dataset.getRowAxis();
      secondaryAxis = dataset.getColumnAxis();
      var measuresIndex = columnAxis.getHierarchyIndex("Measures");
      measureColumns = columnAxisInfo.splice(measuresIndex, 1);
      measureColumns = measureColumns[0];
      for (j in  measureColumns) {
        m++;
      }
      cellset = dataset.getCellset();
    }
    else {
      primaryAxis = dataset.getColumnAxis();
    }
    primaryAxis.eachTuple(function(tuple){
      var members = tuple.members, n = members.length, i, member, column, values = [];
      values.length = columns.length;
      for (i = 0; i < n; i++){
        member = members[i];
        column = columnAxisInfo[i][member.LNum];
        values[column.index] = member.Caption;
      }

      i = 0;
      for (column in measureColumns){
        cellOrdinal = tuple.index * m + i;
        if (cellset.cellOrdinal() === cellOrdinal) {
          column = measureColumns[column];
          values[column.index] = cellset.cellValue();
          cellset.nextCell();
        }
        i++;
      }

      cells.push(values);
    }, this);

    var data = {
      columns: columns,
      rows: [],
      cells: cells
    };

    this.dataGrid.setData(data);
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
  text: gMsg("New Table"),
  initQueryDesigner: function(dom){
    var queryDesigner = this.queryDesigner = new QueryDesigner({
      container: cEl("DIV", {
      }, null, dom),
      dnd: this.getDnd(),
      axes: [
        {
          id: Xmla.Dataset.AXIS_COLUMNS,
          label: gMsg("Columns"),
          classes: ["columns"],
          tooltip: gMsg("Items on this axis are used to generate columns for the table"),
          mandatory: true,
          drop: {
            include: ["level", "measure"]
          }
        },
        {
          id: Xmla.Dataset.AXIS_SLICER,
          label: gMsg("Slicer"),
          tooltip: gMsg("The members on this axis form a selection of the total data set (a slice) or which data are shown."),
          "class": "slicer",
          drop: {
            include: "member"
          }
        }
      ]
    });
    queryDesigner.getMdx = function(cubeName){
      var columnAxis = this.getColumnAxis();

      //rewrite query if necessary
      //if the query includes measures, then we want those on the column axis,
      //and all others on the row axis.
      var undowRewrite;
      if (columnAxis.hasHierarchy("Measures")) {
        undowRewrite = true;
        var indexOfMeasures = columnAxis.getHierarchyIndex("Measures");
        var measures = columnAxis.hierarchies.splice(indexOfMeasures, 1);
        measures = measures[0];
        var newAxis = new QueryDesignerAxis({
          id: Xmla.Dataset.AXIS_COLUMNS,
          queryDesigner: this,
          _dummy: true
        });
        newAxis.hierarchies.push(measures);
        newAxis.setDefs = columnAxis.setDefs;

        var dom = columnAxis.getDom();
        columnAxis.conf.id = Xmla.Dataset.AXIS_ROWS;
        dom.id = columnAxis.getId();

        this.axes[Xmla.Dataset.AXIS_ROWS] = columnAxis;
        this.axes[Xmla.Dataset.AXIS_COLUMNS] = newAxis;
      }
      else {
        undowRewrite = false;
      }

      //rely on the prototypes method to actually generate MDX
      var mdx = QueryDesigner.prototype.getMdx.call(this, cubeName);

      //undo rewrite query if necessary
      if (undowRewrite === true) {
        newAxis.destroy();
        columnAxis = this.axes[Xmla.Dataset.AXIS_ROWS];
        columnAxis.hierarchies.splice(indexOfMeasures, 0, measures);

        var dom = columnAxis.getDom();
        columnAxis.conf.id = Xmla.Dataset.AXIS_COLUMNS;
        var id = columnAxis.getId();
        dom.id = id;
        QueryDesignerAxis.instances[id] = columnAxis;
        this.axes[Xmla.Dataset.AXIS_COLUMNS] = columnAxis;
        delete this.axes[Xmla.Dataset.AXIS_ROWS];
      }
      return mdx;
    };
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
    var queryDesignerDom = queryDesigner.getDom().firstChild;
    var visualizer = this.getVisualizer();
    var visualizerDom = visualizer.getDom();
    var dom = this.getDom();

    var style = visualizerDom.style;
    style.top = queryDesignerDom.clientHeight + "px";

    var width = dom.getClientWidth - scrollbarWidth;
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
  text: gMsg("New Pivot Table"),
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
      axes: [
        {
          id: Xmla.Dataset.AXIS_COLUMNS,
          label: gMsg("Columns"),
          tooltip: gMsg("Items on this axis are used to generate columns for the pivot table"),
          "class": "columns",
          mandatory: true,
          intrinsicProperties: intrinsicProperties
        },
        {
          id: Xmla.Dataset.AXIS_ROWS,
          label: gMsg("Rows"),
          tooltip: gMsg("Items on this axis are used to generate rows for the pivot table"),
          "class": "rows",
          intrinsicProperties: intrinsicProperties
        },
        {
          id: Xmla.Dataset.AXIS_SLICER,
          label: gMsg("Slicer"),
          tooltip: gMsg("The members on this axis form a selection of the total data set (a slice) or which data are shown."),
          "class": "slicer",
          drop: {
            include: "member"
          }
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

/**
*   Pie Chart tab
*/
var PieChart;

(PieChart = function(conf){
  this.conf = conf || {};
  this.id = arguments.callee.prefix + (++arguments.callee.id);
  this.classes = [arguments.callee.prefix];
  this.createDom();
}).prototype = {
  chartType: "pie",
  destroy: function(){
    var id = this.getId();
    dEl(id);
  },
  getId: function() {
    return this.id;
  },
  getDom: function(){
    var dom = gEl(this.getId());
    if (!dom) {
      dom = this.createDom();
    }
    return dom;
  },
  createDom: function(){
    var id = this.getId();
    var dom = cEl("div", {
      id: id,
      "class": ["chart", PieChart.prefix]
    }, null, this.conf.container);
    return dom;
  },
  clear: function(){
    this.getDom().innerHTML = "";
  },
  createLayoutTable: function(){
    var dom = this.getDom();
    var table = cEl("TABLE", {
      style: {
        width: "100%",
        "table-layout": "fixed"
      }
    }, null, dom);
    return table;
  },
  getHeader: function(tuple) {
    var list = cEl("UL", {
    });

    var members = tuple.members, n = members.length, member, i;
    for (i = 0; i < n; i++) {
      member = members[i];
      cEl("LI", {
      }, member[Xmla.Dataset.Axis.MEMBER_CAPTION], list);
    }
    return list;
  },
  renderChapterAxis: function(dataset){
    console.time("pie chart renderChapterAxis");
    var table = this.createLayoutTable();
    var rows = table.rows;
    var chapterAxis = dataset.getChapterAxis();
    chapterAxis.eachTuple(function(tuple){
      var row = table.insertRow(rows.length), cells = row.cells, cell, list;
      cell = row.insertCell(0);
      list = this.getHeader(tuple);
      aCh(cell, list);
      this.renderPageAxis(dataset, row, tuple.index);
    }, this);
    console.timeEnd("pie chart renderChapterAxis");
  },
  renderPageAxis: function(dataset, row, chapterAxisOrdinal){
    console.time("pie chart renderPageAxis");
    var me  = this;
    function renderPieCharts(dataset, row, pageAxisOrdinal, chapterAxisOrdinal){
      var cell = row.insertCell(row.cells.length);
      me.renderPieCharts(dataset, cell, pageAxisOrdinal, chapterAxisOrdinal);
    }

    var pageAxis = dataset.getPageAxis();
    var n = pageAxis.tupleCount();
    var headerRow, headerRowCells;
    //if the row is the first row, create a header row.
    if (row.rowIndex === 0) {
      var table = row.parentNode.parentNode;
      headerRow = table.insertRow(0);
      if (dataset.hasChapterAxis()) {
        var cell;
        cell = headerRow.insertCell(0);
      }
      headerRowCells = headerRow.cells;

      pageAxis.eachTuple(function(tuple){
        headerRowCell = headerRow.insertCell(headerRowCells.length);
        var list = this.getHeader(tuple);
        aCh(headerRowCell, list);
        //local
        renderPieCharts(dataset, row, tuple.index, chapterAxisOrdinal);
      }, this);
    }
    else {
      for (i = 0; i < n; i++){
        //local
        renderPieCharts(dataset, row, i, chapterAxisOrdinal);
      }
    }
    console.timeEnd("pie chart renderPageAxis");
  },
  createChartDataTemplate: function(dataset) {
    console.time("pie chart createChartDataTemplate");
    //categories
    var columnAxis = dataset.getColumnAxis();
    var cellset = dataset.getCellset();
    var chartData = {
      type: this.chartType,
      columns: [],
      names: {}
    };
    columnAxis.eachTuple(function(tuple){
      var members = tuple.members;
      var member, i, n = members.length;
      var id = [], name = [], value;
      for (i = 0; i < n; i++) {
        member = members[i];
        id.push(member[Xmla.Dataset.Axis.MEMBER_UNIQUE_NAME]);
        name.push(member[Xmla.Dataset.Axis.MEMBER_CAPTION])
      }
      id = id.join("|");
      name = name.join(" / ");
      chartData.names[id] = name;
      value = cellset.readCell().Value;
      cellset.nextCell();
      chartData.columns.push([id, value]);
    });
    //this.chartData = chartData;
    columnAxis.reset();
    console.timeEnd("pie chart createChartDataTemplate");
    return chartData;
  },
  renderPieChartC3: function(id){
    c3.generate({
      bindto: "#" + id,
      type: this.chartType,
      data: this.chartData
    });
  },
  renderPieChartNVD3: function(id, data) {
    var el = gEl(id);
    el.innerHTML = "<svg></svg>";
    var me = this;
    nv.addGraph(function(){

      var chart = nv.models.pieChart()
        .x(function(d){
          return data.names[d[0]];
        })
        .y(function(d){
          return d[1]
        })
        .showLegend(false)
        .showLabels(false)
        .color(["red", "yellow", "blue"])
        ;

      d3.select("#" + id + " svg")
        .datum(data.columns)
        .transition().duration(350)
        .call(chart);

      return chart;
    });
  },
  renderPieChart: function(id, data){
    //this.renderPieChartC3(id);
    this.renderPieChartNVD3(id, data);
  },
  renderPieCharts: function(dataset, cell, pageAxisOrdinal, chapterAxisOrdinal) {
    console.time("pie chart renderPieCharts");
    //measures
    var rowAxis = dataset.getRowAxis();
    var n = rowAxis.tupleCount(), i;
    //categories
    var columnAxis = dataset.getColumnAxis();
    var m = columnAxis.tupleCount(), j;
    //data

    var chartWrapper, chartContainerTag;
    if (n > 1) {
      chartContainerTag = "LI";
      chartWrapper = cEl("UL", {
        "class": ["chart-container", "pie-chart-container"]
      }, null, cell);
    }
    else {
      chartContainerTag = "DIV";
      chartWrapper = cell;
    }
    //for each measure
    for (i = 0; i < n; i++) {
      var data = this.createChartDataTemplate(dataset);
      var piechartId = this.newChartId();
      var el = cEl(chartContainerTag, {
        id: piechartId,
        "class": ["chart-container", "pie-chart-container"]
      }, null, chartWrapper);
      this.renderPieChart(piechartId, data);
    }
    console.timeEnd("pie chart renderPieCharts");
  },
  newChartId: function(){
    return PieChart.prefix + "chart" + (++PieChart.chartId);
  },
  getDataset: function(){
    return this.dataset;
  },
  renderDataset: function(dataset, queryDesigner){
    console.time("pie chart renderDataset");
    this.clear();
    this.dataset = dataset;
    this.numCharts = 0;
    this.chartsRendering = 0;

    if (!dataset.hasRowAxis()){
      //nothing to do here: no measures, only categories
      return;
    }

    var numCharts = dataset.getRowAxis().tupleCount();

    if (dataset.hasChapterAxis()) {
      this.chartsRendering = this.numCharts = dataset.getChapterAxis().tupleCount() * dataset.getPageAxis().tupleCount() * dataset.getRowAxis().tupleCount();
      //generate a grid of Chapters x Pages;
      this.renderChapterAxis(dataset);
    }
    else
    if (dataset.hasPageAxis()) {
      this.chartsRendering = this.numCharts = dataset.getPageAxis().tupleCount() * dataset.getRowAxis().tupleCount();
      //generate a list of Pages x items
      var table = this.createLayoutTable();
      var row = table.insertRow(0);
      this.renderPageAxis(dataset, row, null);
    }
    else {
      this.chartsRendering = this.numCharts = dataset.getRowAxis().tupleCount();
      //render Columns x chart
      this.renderPieCharts(dataset, this.getDom(), null, null);
    }
    console.timeEnd("pie chart renderDataset");
  },
  doLayout: function(){
  }
};
PieChart.id = 0;
PieChart.prefix = "pie-chart";
PieChart.chartId = 0;


var XavierPieChartTab;
(XavierPieChartTab = function(conf){
  conf = conf || {};
  this.classes = ["pie-chart"];
  arguments.callee._super.apply(this, [conf]);
}).prototype = {
  text: gMsg("New Pie Chart"),
  initQueryDesigner: function(dom){
    var queryDesigner = this.queryDesigner = new QueryDesigner({
      container: cEl("DIV", {}, null, dom),
      dnd: this.getDnd(),
      axes: [
        {
          id: Xmla.Dataset.AXIS_COLUMNS,
          label: gMsg("Categories"),
          tooltip: gMsg("Each combination of members forms a category to generate one slice of the pie chart. Choose one level, or a selection of members from a single level per hierarchy."),
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
          tooltip: gMsg("For each unique combination of members, one column is layed out and filled with pie charts."),
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
          canBeEmpty: false,
          "class": "rows",
          drop: {
            include: ["level", "member"]
          }
        },
        {
          id: Xmla.Dataset.AXIS_SLICER,
          label: gMsg("Slicer"),
          tooltip: gMsg("The members on this axis form a selection of the total data set (a slice) or which data are shown."),
          "class": "slicer",
          drop: {
            include: "member"
          }
        }
      ]
    });
    queryDesigner.listen({
      changed: function(queryDesigner, event, data){
        if (this.getAutoRunEnabled()) {
          this.layoutChartArea();
          this.executeQuery();
        }
        else {

        }
      },
      scope: this
    });
    queryDesigner.render();
  },
  initPieChart: function(dom) {
    var pieChart = this.visualizer = new PieChart({
      container: dom
    });
  },
  createDom: function(){
    var me = this;
    var dom = cEl("DIV", {
      id: this.getId(),
      "class": ["chart", PieChart.prefix]
    });
    this.initQueryDesigner(dom);
    this.initPieChart(dom);
    return dom;
  },
  layoutChartArea: function() {
    var queryDesigner = this.getQueryDesigner();
    var queryDesignerDom = queryDesigner.getDom().firstChild;
    var visualizer = this.getVisualizer();
    var visualizerDom = visualizer.getDom();
    var dom = this.getDom();
    var width = dom.clientWidth - queryDesignerDom.clientWidth;

    var style = visualizerDom.style;
    style.top = 0 + "px";
    style.width = width + "px";
    style.left = queryDesignerDom.clientWidth + "px";
    style.height = dom.clientHeight + "px";
  },
  doLayout: function(){
    this.layoutChartArea();
    XavierPieChartTab._super.prototype.doLayout.call(this);
  }
};
adopt(XavierPieChartTab, XavierTab);

})();