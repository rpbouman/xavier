/*

Copyright 2014 - 2017 Roland Bouman (roland.bouman@gmail.com)
  
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

if (iUnd(scrollbarWidth) || iUnd(scrollbarHeight)) {
//scrollbar dimensions:
cEl("div", {
  id: "_scrollbars1",
  style: {
    "background-color": "blue",
    position: "absolute",
    overflow: "auto",
    width: "50px",
    height: "50px",
    left: "-50px",
    top: "-50px"
  }
}, cEl("div", {
  id: "_scrollbars2",
  style: {
    "background-color": "red",
    position: "absolute",
    left: "0px",
    top: "0px",
    width: "100px",
    height: "100px"
  }
}), body);
var _scrollbars1 = gEl("_scrollbars1");
var scrollbarWidth = (_scrollbars1.offsetWidth - _scrollbars1.clientWidth) + 2;
var scrollbarHeight = (_scrollbars1.offsetHeight - _scrollbars1.clientHeight) + 2;
//firefox 31 messes up
scrollbarWidth = Math.max(scrollbarHeight, scrollbarWidth);
}

/***************************************************************
*
*   PivotTable
*
***************************************************************/
var PivotTable;

(PivotTable = function(conf){
  this.id = ++PivotTable.id;
  this.conf = conf || {};
  this.conf.scrollbarWidth = scrollbarWidth;
  this.conf.scrollbarHeight = scrollbarHeight;
  this.conf.showHorizontalHierarchyHeaders = iDef(conf.showHorizontalHierarchyHeaders) ? conf.showHorizontalHierarchyHeaders : true;
  this.conf.showVerticalHierarchyHeaders = iDef(conf.showVerticalHierarchyHeaders) ? conf.showVerticalHierarchyHeaders : true;
  this.createDom();
}).prototype = {
  destroy: function(){
    this.unlisten();
    var id = this.getId();
    dEl(id);
  },
  showHorizontalHierarchyHeaders: function(setting){
    if (iDef(setting)) {
      setting = Boolean(setting);
      this.conf.showHorizontalHierarchyHeaders = setting;
      if (this.dataset) {
        if (setting) {
          this.addHorizontalHierarchyHeaders();
        }
        else {
          this.removeHorizontalHierarchyHeaders();
        }
        this.doLayout();
      }
    }
    return this.conf.showHorizontalHierarchyHeaders;
  },
  addHorizontalHierarchyHeaders: function(){
    var dataset = this.dataset;
    var axes = [this.getPagesTableDom(), this.getColumnsTableDom()];
    var left = this.getCellsDom().scrollLeft;
    var id = this.getId();
    for (i = 0; i < axes.length; i++) {
      var dom;
      if (!(dom = axes[i])) {
        continue;
      }
      var rows = dom.rows, n = rows.length, row, r = 0;
      var axis = dataset.getAxis(Xmla.Dataset[i ? "AXIS_COLUMNS" : "AXIS_PAGES"]);
      var tupleCount = axis.tupleCount();
      var j = 0;
      axis.eachHierarchy(function(hierarchy){
        while ((row = rows[r++]) && !hCls(row, "new-hierarchy"));
        if (!row) {
          return;
        }
        var className = (hierarchy.name === "Measures" ? "measures-header" : "hierarchy-header");
        row = dom.insertRow(row.rowIndex);
        var cell = row.insertCell(0);
        cell.id = id + "-hierarchy-header-" + hierarchy.name;
        var style = cell.style;
        style.backgroundPosition = (2 + left) + "px 2px";
        style.paddingLeft = (20 + left) + "px";

        cell.colSpan = tupleCount;
        row.className = cell.className = className;
        //cell.innerHTML = hierarchy.Caption || hierarchy.name;
        cell.innerHTML = this.hierarchyLabels[axis.id][j++];
        r = row.rowIndex + 2;
      }, this);
    }
  },
  removeHorizontalHierarchyHeaders: function(){
    var axes = [this.getPagesTableDom(), this.getColumnsTableDom()]
    for (i = 0; i < axes.length; i++) {
      var dom;
      if (!(dom = axes[i])) {
        continue;
      }
      var rows = dom.rows, n = rows.length -1, r, row;
      for (r = n; r >= 0; r--){
        row = rows[r];
        if (hCls(row, "hierarchy-header") || hCls(row, "measures-header")) {
          dom.deleteRow(r);
        }
      }
    }
  },
  showVerticalHierarchyHeaders: function(setting){
    if (iDef(setting)) {
      var setting = Boolean(setting);
      this.conf.showVerticalHierarchyHeaders = setting;
      if (this.dataset) {
        if (setting) {
          this.addVerticalHierarchyHeaders();
        }
        else {
          this.removeVerticalHierarchyHeaders();
        }
        this.doLayout();
      }
    }
    return this.conf.showVerticalHierarchyHeaders;
  },
  addVerticalHierarchyHeaders: function(){
    this.renderRowHeadersTable();
  },
  removeVerticalHierarchyHeaders: function(){
    dCh(this.getRowsHeadersDom());
  },
  getId: function() {
    return PivotTable.prefix + this.id;
  },
  getTupleName: function (tuple, hierarchy) {
    for (var mName = "", i = 0; i <= hierarchy.index; i++) {
      mName += tuple.members[i][Xmla.Dataset.Axis.MEMBER_UNIQUE_NAME];
    }
    return mName;
  },
  computeAxisLevels: function (axis) {
    if (axis.tuples) {
      return;
    }
    var numLevels = 0,
        tuples = [],
        hierarchies = axis.getHierarchies(),
        n = axis.hierarchyCount(), i, hierarchy,
        level, levels, allLevels = {},
        displayInfo = [],
        oldLevelNum, oldMemberName, newLevelNum, newMemberName
    ;
    axis.eachTuple(function(tuple){
      var member, members = tuple.members, j, m;
      tuples.push(tuple);
      for (i = 0; i < n; i++){
        member = members[i];
        newLevelNum = member[Xmla.Dataset.Axis.MEMBER_LEVEL_NUMBER];
        if (displayInfo[i]) {
          //if we passed a block of the same member
          oldMemberName = displayInfo[i][Xmla.Dataset.Axis.MEMBER_UNIQUE_NAME];
          newMemberName = member[Xmla.Dataset.Axis.MEMBER_UNIQUE_NAME];
          if (oldMemberName !== newMemberName) {
            //if the current member is one level below the previous member
            oldLevelNum = displayInfo[i][Xmla.Dataset.Axis.MEMBER_LEVEL_NUMBER];
            if (oldLevelNum === newLevelNum - 1) {
              //if the old level is either the ALL level or the current members parent
              if (oldLevelNum === 0 || newMemberName.indexOf(oldMemberName) === 0) {
                //TODO: walk the previous tuples that have the same member as displayInfo
                //and set the drilled down flag to 1.
                var prevTuple, prevMember;
                for (j = tuples.length - 2; j >= 0; j--){
                  prevTuple = tuples[j];
                  prevMember = prevTuple.members[i];
                  if (prevMember[Xmla.Dataset.Axis.MEMBER_UNIQUE_NAME] !== oldMemberName) {
                    break;
                  }
                  prevMember[Xmla.Dataset.Axis.MEMBER_DISPLAY_INFO] |= Xmla.Dataset.Axis.MDDISPINFO_DRILLED_DOWN;
                }
              }
            }
            //set the current member as reference.
            displayInfo[i] = member;
          }
        }
        else {
          displayInfo[i] = member;
        }
        if (!(levels = allLevels[member.hierarchy])){
          allLevels[member.hierarchy] = levels = {};
        }
        levels[newLevelNum] = true;
      }
    });
    axis.tuples = tuples;
    for (hierarchy in hierarchies){
      levels = allLevels[hierarchy];
      hierarchy = hierarchies[hierarchy];
      hierarchy.levels = [];
      for (level in levels) {
        hierarchy.levels.push(parseInt(level, 10));
        numLevels++;
      }
      levels = hierarchy.levels.sort();
      hierarchy.minLevel = Math.min.apply(null, levels);
      hierarchy.maxLevel = Math.max.apply(null, levels);
      hierarchy.levels = levels;
    }
    return numLevels;
  },
  createDom: function() {
    var id = this.getId();
    var container = cEl("div", {
      id: id,
      "class": "pivot-table " + PivotTable.prefix + "-widget"
    });
    var axisPrefix = PivotTable.prefix + "-axis";
    cEl("DIV", {
      "class": axisPrefix+ " " + axisPrefix + "-pages",
      id: id + "-pages"
    }, null, container);
    cEl("DIV", {
      "class": axisPrefix+ " " + axisPrefix + "-columns",
      id: id + "-columns"
    }, null, container);
    cEl("DIV", {
      "class": axisPrefix+ " " + axisPrefix + "-rows",
      id: id + "-rows"
    }, null, container);
    cEl("DIV", {
      "class": axisPrefix + "-rows-headers",
      id: id + "-rows-headers"
    }, null, container);

    var cells = cEl("DIV", {
      "class": axisPrefix + " " + PivotTable.prefix + "-cells",
      id: id + "-cells"
    }, null, container);

    listen(cells, "scroll", this.scrollHandler, this);
    listen(container, "click", this.clickHandler, this);

    return container;
  },
  clickHandler: function(event) {
    var target = event.getTarget();
    if (target.className !== "toggle") {
      return;
    }

    var td = target.parentNode;
    if (!hCls(td, "has-children")) {
      return;
    }

    var eventName;
    if (hCls(td, "not-drilled-down")) {
      eventName = "expand";
    }
    else
    if (hCls(td, "drilled-down")) {
      eventName = "collapse";
    }
    var uName = gAtt(td, "data-UName");
    var tr = td.parentNode;
    var thead = tr.parentNode;
    var table = thead.parentNode;
    this.fireEvent(eventName, {
      axis: parseInt(gAtt(table, "data-axis-id"), 10),
      member: uName
    });
  },
  scrollHandler: function(event) {
    var cells = this.getCellsDom(),
        left = cells.scrollLeft,
        rowsTable = this.getRowsTableDom(),
        colsTable = this.getColumnsTableDom()
    ;
    if (rowsTable) {
      rowsTable.style.top = (-cells.scrollTop) + "px";
    }
    if (colsTable) {
      colsTable.style.left = (-left) + "px";
      if (this.conf.showHorizontalHierarchyHeaders) {
        var rows = colsTable.rows, n = rows.length, i, row, style;
        for (i = 0; i < n; i++) {
          row = rows[i];
          if (row.className !== "hierarchy-header" && row.className != "measures-header") {
            continue;
          }
          style = row.cells[0].style;
          style.backgroundPosition = (2 + left) + "px 2px";
          style.paddingLeft = (20 + left) + "px";
        }
      }
    }
  },
  getPagesDom: function(){
    return gEl(this.getId() + "-pages");
  },
  getRowsDom: function(){
    return gEl(this.getId() + "-rows");
  },
  getRowsHeadersDom: function(){
    return gEl(this.getId() + "-rows-headers");
  },
  getRowsHeadersTableDom: function() {
    return gEl(this.getId() + "-rows-headers-table");
  },
  getColumnsDom: function(){
    return gEl(this.getId() + "-columns");
  },
  getCellsDom: function(){
    return gEl(this.getId() + "-cells");
  },
  getPagesTableDom: function(){
    return gEl(this.getId() + "-pages-table");
  },
  getRowsTableDom: function(){
    return gEl(this.getId() + "-rows-table");
  },
  getColumnsTableDom: function(){
    return gEl(this.getId() + "-columns-table");
  },
  getCellsTableDom: function(){
    return gEl(this.getId() + "-cells-table");
  },
  getDom: function() {
    var dom = gEl(this.getId());
    if (!dom) {
      dom = this.createDom();
    }
    return dom;
  },
  addPositionableRow: function(table, n, last, minWidthCells) {
    var c, c1, i, r = table.insertRow(last ? table.rows.length : 0);
    r.className = "positioning-row"
    for (i = 0; i < n; i++){
      c = r.insertCell(i);
      c1 = minWidthCells ? minWidthCells[i] : null;
      c.innerHTML = "<div " + (c1 ? "style=\"min-width: " + c1.clientWidth + "px\"" : "") + ">&#160;</div>"
    }
    return r;
  },
  doLayout: function() {
    var container = this.getDom(),
        containerParent = container.parentNode,
        containerParentWidth = containerParent.clientWidth,
        containerParentHeight = containerParent.clientHeight,
        pages = this.getPagesDom(),
        pagesTable = this.getPagesTableDom(),
        pagesTableHeight = (pagesTable ? pagesTable.offsetHeight + 20 : 0),
        rows = this.getRowsDom(),
        rowsTable = this.getRowsTableDom(),
        rowsTableWidth, rowsTableHeight,
        rowsHeaders = this.getRowsHeadersDom(),
        rowsHeadersTable = this.getRowsHeadersTableDom(),
        cols = this.getColumnsDom(),
        colsStyle = cols.style,
        colsTable = this.getColumnsTableDom(),
        cells = this.getCellsDom(),
        cellsStyle = cells.style,
        cellsTable = this.getCellsTableDom(),
        width, height
    ;
    if (!colsTable) {
      return;
    }

    if (pagesTable) {
      width = Math.min(containerParentWidth, pagesTable.offsetWidth + 2);
      pages.style.width = width + "px";
      pages.style.height = pagesTable.offsetHeight + ((pagesTable.offsetWidth > (containerParentWidth + 5)) ? 16 : 0) + "px";
    }

    colsStyle.top = pagesTableHeight + "px";

    if (rowsTable) {
      if (this.showVerticalHierarchyHeaders()) {  //render row headers
        var rowsTableRows = rowsTable.rows;
        var rowsTableCells = rowsTableRows[rowsTableRows.length -1].cells;
        var rowsTableCell;
        var rowHeadersTable = rowsHeaders.firstChild;
        var rowHeadersTableRows = rowHeadersTable.rows;
        var r0 = rowHeadersTableRows[0];
        var c0 = r0.cells;
        var n = c0.length;
        var r1 = rowHeadersTableRows[1];
        var c1 = r1.cells;
        var i, j, k, l = 0, w1, w2, w3, w4;
        for (i = 0; i < n; i++){
          w1 = 0;
          k = c0[i].colSpan;
          c1[i].colSpan = k;
          for (j = 0; j < k; j++) {
            rowsTableCell = rowsTableCells[l++];
            w1 += rowsTableCell.offsetWidth;
          }
          w2 = c0[i].offsetWidth;
          if (w1 > w2) {
            c1[i].firstChild.style.width = w1 + "px";
          }
          else {
            l -= k;
            w4 = 0;
            for (j = 0; j < k; j++) {
              rowsTableCell = rowsTableCells[l++];
              w3 = (rowsTableCell.offsetWidth / w1) * w2;
              rowsTableCell.firstChild.style.width = w3 + "px";
              w4 += w3;
            }
            c1[i].firstChild.style.width = w4 + "px";
          }
        }
        rowsTableWidth = Math.max(rowsTable.clientWidth, rowsHeadersTable.clientWidth);
        rowsHeaders.style.width = rowsTableWidth + "px";
        rowsHeaders.style.height = rowsHeaders.firstChild.offsetHeight + "px";
      }
      else {  //clear row headers
        this.clearAxis(rowsHeaders);
        rowsTableWidth = rowsTable.clientWidth;
      }
      rowsTableHeight = rowsTable.clientHeight;
    }
    else {
      this.clearAxis(rowsHeaders);
      this.clearAxis(rows);
      rowsTableWidth = 0;
      rowsTableHeight = 0;
    }

    cells.style.left = cols.style.left = rows.style.width = rowsTableWidth + "px";
    cells.style.top = rows.style.top = (pagesTableHeight + colsTable.offsetHeight) + "px";
    colsStyle.height = colsTable.offsetHeight + "px";

    if (rowsTable && this.showVerticalHierarchyHeaders()) {
      rowsHeaders.style.top = (parseInt(rows.offsetTop, 10) - rowsHeaders.firstChild.offsetHeight) + "px";
    }

    width = Math.min(
      containerParentWidth - (this.conf.scrollbarWidth + 13),
      rowsTableWidth + colsTable.offsetWidth
    );
    container.style.width = width + "px";
    colsStyle.width = (width - rows.offsetWidth) + "px";

    height = Math.min(
      containerParentHeight - (container.offsetTop + container.clientTop + this.conf.scrollbarHeight + 6),
      cellsTable.offsetHeight + colsTable.offsetHeight + pagesTableHeight
    );
    container.style.height = height + "px";
    rows.style.height = (height - (cols.offsetHeight + pagesTableHeight)) + "px";

    var cellsWidth, cellsHeight;
    if (cellsTable) {
      cellsWidth = cols.clientWidth;
      cellsHeight = rowsTable ? rows.clientHeight: cellsTable.clientHeight;
    }

    var overflow;
    if (rowsTableWidth + colsTable.offsetWidth < containerParentWidth) {
      overflow = "hidden";
    }
    else {
      overflow = "auto";
      cellsHeight += scrollbarHeight;
    }
    cellsStyle.overflowX = overflow;
    cellsStyle.height = cellsHeight + "px";

    if (rowsTableHeight + colsTable.clientHeight + 24 < (containerParentHeight - (container.offsetTop + container.clientTop))) {
      overflow = "hidden";
    }
    else {
      overflow = "auto";
      cellsWidth += scrollbarWidth;
    }
    cellsStyle.overflowY = overflow;
    cellsStyle.width = cellsWidth + "px";

    return;
  },
  getDataset: function(){
    return this.dataset;
  },
  getHierarchyLabels: function(queryDesigner){
    var labels = this.hierarchyLabels = [];
    queryDesigner.eachAxis(function(i, axis) {
      var id = axis.conf.id;
      var hierarchies = labels[id] = [];
      axis.eachHierarchy(function(hierarchy, i){
        hierarchies.push(hierarchy.HIERARCHY_CAPTION);
      }, this);
    }, this);
  },
  renderDataset: function (dataset, queryDesigner) {
    var me = this;
    this.getHierarchyLabels(queryDesigner);
    //clear is being called by the tabpane.
    //this.clear();
    if (this.dataset) {
      this.dataset.close();
    }
    this.dataset = dataset;

    if (dataset.hasColumnAxis()) {
      //console.time("Rendering ColumnAxis");
      var columnAxis = queryDesigner.getColumnAxis();
      this.renderColumnAxis(columnAxis);
      //console.timeEnd("Rendering ColumnAxis");
    }
    if (dataset.hasRowAxis()) {
      //console.time("Rendering RowAxis");
      var rowAxis = queryDesigner.getRowAxis();
      this.renderRowAxis(rowAxis);
      //console.timeEnd("Rendering RowAxis");
    }
    if (dataset.hasPageAxis()) {
      var pageAxis = queryDesigner.getPageAxis();
      this.renderPageAxis(pageAxis);
    }
    //console.time("Rendering Cells");
    me.renderCells();
    //console.timeEnd("Rendering Cells");

    //console.time("Loading Cells");
    me.loadCells();
    //console.timeEnd("Loading Cells");

    me.doLayout();
  },
  _createAxisTable: function(idPostfix){
    var axisName = idPostfix.split("-")[0].toUpperCase();
    var axisId = Xmla.Dataset["AXIS_" + axisName];
    return cEl("TABLE", {
      "class": PivotTable.prefix,
      id: this.getId() + "-" + idPostfix,
      cellpadding: 0,
      cellspacing: 0,
      "data-axis-name": axisName,
      "data-axis-id": axisId
    }, [
      cEl("THEAD")
    ]);
  },
  renderColumnAxis: function(queryDesignerAxis){
    var columnAxis = this.dataset.getColumnAxis();
    this.computeAxisLevels(columnAxis);
    var table = this._createAxisTable("columns-table");
    this.renderAxisHorizontally(columnAxis, table, queryDesignerAxis);
    dCh(this.getColumnsDom());
    this.getColumnsDom().appendChild(table);
    if (this.showHorizontalHierarchyHeaders()) {
      this.addHorizontalHierarchyHeaders();
    }
  },
  renderPageAxis: function(){
    var pageAxis = this.dataset.getPageAxis();
    this.computeAxisLevels(pageAxis);
    var table = this._createAxisTable("page-table");
    this.renderAxisHorizontally(pageAxis, table);
    dCh(this.getPagesDom());
    this.getPagesDom().appendChild(table);
  },
  renderRowAxis: function(queryDesignerAxis){
    var rowAxis = this.dataset.getRowAxis();
    var table = this._createAxisTable("rows-table");
    this.columnOffset = this.computeAxisLevels(rowAxis);
    this.renderAxisVertically(rowAxis, table, queryDesignerAxis);
    dCh(this.getRowsDom());
    this.getRowsDom().appendChild(table);
    if (this.showVerticalHierarchyHeaders()) {
      this.addVerticalHierarchyHeaders();
    }
  },
  renderMemberCell: function(r, member, newHierarchy){
    var memberCell = r.insertCell(r.cells.length);
    var displayInfo = member[Xmla.Dataset.Axis.MEMBER_DISPLAY_INFO];
    var drilledDown = displayInfo & Xmla.Dataset.Axis.MDDISPINFO_DRILLED_DOWN;
    var hasChildren = displayInfo & Xmla.Dataset.Axis.MDDISPINFO_CHILDREN_CARDINALITY;
    var sameParentAsPrev = displayInfo & Xmla.Dataset.Axis.MDDISPINFO_SAME_PARENT_AS_PREV;

    var lNum = member[Xmla.Dataset.Axis.MEMBER_LEVEL_NUMBER];
    sAtt(memberCell, "data-lnum", lNum);
    var uName = member[Xmla.Dataset.Axis.MEMBER_UNIQUE_NAME];
    sAtt(memberCell, "data-uname", uName);

    var className = "th MDSCHEMA_MEMBERS";
    if (newHierarchy) {
      className += " new-hierarchy";
    }
    drilledDown = (drilledDown ? "drilled-down" : "not-drilled-down");
    className += " " + drilledDown;

    hasChildren = (hasChildren ? "has-children" : "no-children");
    className += " " + hasChildren;

    className += " " + drilledDown + "-" + hasChildren;
    className += " " + (sameParentAsPrev ? "same-parent-as-prev" : "not-same-parent-as-prev");

    memberCell.className = className;
    memberCell.title = uName;
    var caption = escXml(member[Xmla.Dataset.Axis.MEMBER_CAPTION]);
    memberCell.innerHTML = "<span class=\"toggle\"></span>" + caption;

    return memberCell;
  },
  renderRowHeadersTable: function(){
    dCh(this.getRowsHeadersDom());
    var dataset = this.dataset;
    if (!dataset.hasRowAxis()) {
      return;
    }
    var rowsHeadersTable = this._createAxisTable("rows-headers-table");
    this.getRowsHeadersDom().appendChild(rowsHeadersTable);
    rowsHeadersTableRow = rowsHeadersTable.insertRow(0);
    rowsHeadersTableRow.className = "hierarchy-header";
    var axis = dataset.getAxis(Xmla.Dataset.AXIS_ROWS);
    var hierarchyCount = axis.hierarchyCount();
    var positionableRow1 = this.addPositionableRow(rowsHeadersTable, hierarchyCount, true);
    var id = this.getId();
    var j = 0;
    axis.eachHierarchy(function(hierarchy){
      var rowsHeadersTableRowCell = rowsHeadersTableRow.insertCell(rowsHeadersTableRow.cells.length);
      rowsHeadersTableRowCell.id = id + "-hierarchy-header-" + hierarchy.name;
      rowsHeadersTableRowCell.colSpan = 1 + (hierarchy.maxLevel - hierarchy.minLevel);
      //rowsHeadersTableRowCell.textContent = hierarchy.Caption || hierarchy.name;
      rowsHeadersTableRowCell.textContent = this.hierarchyLabels[1][j++]
      rowsHeadersTableRowCell.className = "new-hierarchy " + (hierarchy.name === "Measures" ? "measures-header" : "hierarchy-header");
    }, this);
    return rowsHeadersTable;
  },
  renderAxisHorizontally: function(axis, table, queryDesignerAxis) {
    this.renderAxis(axis, table, "horizontal", queryDesignerAxis);
  },
  renderAxisVertically: function(axis, table, queryDesignerAxis) {
    this.renderAxis(axis, table, "vertical", queryDesignerAxis);
  },
  getPropertiesMap: function(queryDesignerAxis){
    var propertiesMap = {};
    queryDesignerAxis.eachHierarchy(function(hierarchy, index){
      var hierarchyName = queryDesignerAxis.getHierarchyName(hierarchy);
      hierarchyName = queryDesignerAxis.stripBracesFromIdentifier(hierarchyName);
      queryDesignerAxis.eachSetDef(function(setDef, index){
        if (setDef.type !== "property") {
          return;
        }
        var hierarchyProperties = propertiesMap[hierarchyName];
        if (!hierarchyProperties) {
          hierarchyProperties = propertiesMap[hierarchyName] = [];
        }
        hierarchyProperties.push(setDef.metadata.PROPERTY_NAME);
      }, this, hierarchy);
    }, this);
    return propertiesMap;
  },
  isMemberParentOf: function(parentMember, childMember) {
    var parentMemberProperty = Xmla.Dataset.Axis.MEMBER_UNIQUE_NAME;
    var childMemberProperty = "PARENT_UNIQUE_NAME";
    //var childMemberProperty = "p1";
    return parentMember[parentMemberProperty] === childMember[childMemberProperty];
  },
  renderAxis: function(axis, table, direction, queryDesignerAxis) {
    var tbody = table.tBodies[0] || cEl("TBODY", null, null, table),
        rows = tbody.rows, row, cells,
        tuples = axis.tuples, tuple, i, n = tuples.length, members,
        prevMembers = [], prevMember,
        tupleName, tupleNameIndex, headerCells = [],
        positionCells, positionCellsLast, span1, span2, horizontal, vertical,
        dimensionNameIncluded
    ;
    var propertiesMap = this.getPropertiesMap(queryDesignerAxis);
    switch (direction) {
      case "horizontal":
        horizontal = true;
        vertical = false;
        span1 = "colSpan";
        span2 = "rowSpan";
        positionCells = n;
        positionCellsLast = false;
        break;
      case "vertical":
        vertical = true;
        horizontal = false;
        span1 = "rowSpan";
        span2 = "colSpan";
        positionCellsLast = true;
        break;
      default:
        throw "Unsupported direction: " + direction;
    }
    table.className += " " + PivotTable.prefix + "-axis-" + direction;
    //for each tuple
    for (i = 0; i < n; i++) { 
      tupleNameIndex = 0;
      tuple = tuples[i];
      members = tuple.members;
      if (vertical) {
        //one row for each tuple
        row = tbody.insertRow(rows.length);
        cells = row.cells;
      }
      //for each hierarchy in the tuple
      axis.eachHierarchy(function(hierarchy){
        var j,
            minLevel = hierarchy.minLevel,
            maxLevel = hierarchy.maxLevel,
            member = members[hierarchy.index],
            uName, lNum, displayInfo, caption, sameParentAsPrev, c,
            isNewHierarchy
        ;
        uName = member[Xmla.Dataset.Axis.MEMBER_UNIQUE_NAME];
        lNum = member[Xmla.Dataset.Axis.MEMBER_LEVEL_NUMBER];
        //for each level present in this hierarchy (across all tuples)
        for (j = minLevel; j <= maxLevel; j++, tupleNameIndex++) {
          isNewHierarchy = j === minLevel;
          if (horizontal) {
            if (i === 0) {
              row = tbody.insertRow(rows.length);
              if (isNewHierarchy) {
                row.className = "new-hierarchy";
              }
            }
            else {
              row = rows[tupleNameIndex];
            }
            cells = row.cells;
          }

          displayInfo = member[Xmla.Dataset.Axis.MEMBER_DISPLAY_INFO];
          sameParentAsPrev = displayInfo & Xmla.Dataset.Axis.MDDISPINFO_SAME_PARENT_AS_PREV;
          if (lNum === j) {
            if (
              (sameParentAsPrev || hierarchy.index === 0  ) &&
              prevMembers[hierarchy.index] &&
              prevMembers[hierarchy.index].UName === uName
            ) {
              c = headerCells[tupleNameIndex];
              c[span1]++;
            }
            else {
              c = this.renderMemberCell(row, member, isNewHierarchy);
              headerCells[tupleNameIndex] = c;
              if (vertical) {
                c[span2] = 1 + (maxLevel - j);
              }
            }
          }
          else
          if (lNum === (j - 1) && horizontal) {
            if (
              (sameParentAsPrev || hierarchy.index === 0  ) &&
              prevMembers[hierarchy.index] &&
              prevMembers[hierarchy.index].UName === uName
            ) {
              c = headerCells[tupleNameIndex];
              c[span1]++;
            }
            else {
              c = row.insertCell(cells.length);
              sAtt(c, "data-LNum", lNum);
              c[span2] = 1 + (maxLevel - j);
              headerCells[tupleNameIndex] = c;
              label = "&#160;";
              className = "thhh";
              c.className = className;
              c.innerHTML = label;
            }
          }
          else
          if (lNum > j) {
            if (sameParentAsPrev) {
              c = headerCells[tupleNameIndex];
              c[span1]++;
            }
            else {
              if (horizontal) {
                c = headerCells[tupleNameIndex];
                c[span1]++;
              }
              else
              if (vertical) {
                c = row.insertCell(cells.length);
                headerCells[tupleNameIndex] = c;
                className = "th";
                if (isNewHierarchy) {
                  className += " new-hierarchy";
                }
                if (lNum === (j+1)) {
                  prevMember = prevMembers[hierarchy.index];
                  if (prevMember && this.isMemberParentOf(prevMember, member)) {
                    className += " child";
                  }
                  else {
                    className += " no-child";
                  }
                }

                label = "&#160;";
                c.className = className;
                c.innerHTML = label;
              }
            }
          }
        } // end of hhierarchy levels loop
        
        //this is where we should render properties.
        var hierarchyProperties = propertiesMap[hierarchy.name];
        if (hierarchyProperties) {
          debugger; 
        }
        
        prevMembers[hierarchy.index] = member;
      }, this);
    }
    if (!positionCells) {
      positionCells = tupleNameIndex;
    }
    this.addPositionableRow(table, positionCells, positionCellsLast);
  },
  renderCells: function(table) {
    if (!table) {
      table = cEl("TABLE", {
        "class": PivotTable.prefix + " " + PivotTable.prefix + "-cells",
        id: this.getId() + "-cells-table",
        cellpadding: 0,
        cellspacing: 0
      }, [
        cEl("TBODY")
      ]);
    }
    var dataset = this.dataset,
        rowAxis = dataset.hasRowAxis() ? dataset.getRowAxis() : null,
        columnAxis = dataset.hasColumnAxis() ? dataset.getColumnAxis() : null,
        tbody = table.tBodies[0] || cEl("TBODY", null, null, table),
        rows = tbody.rows, r,
        i, n = columnAxis ? columnAxis.tupleCount() : 1, colTuples, colTuple,
        j, m, rowTuples, rowTuple
    ;
    if (rowAxis) {
      var rowAxisRows = this.getRowsTableDom().rows;
      m = rowAxis.tupleCount();
      for (j = 0; j < m; j++){
        r = rows[j];
        if (!r) {
          r = tbody.insertRow(j);
        }
        //make sure the cells row is aligned with the header row.
        r.style.height = rowAxisRows[j].offsetHeight + "px";
        //r.style.height = rowAxisRows[j].clientHeight + "px";

        //create cells (to be filled with values later)
        for (i = 0; i < n; i++){
          r.insertCell(r.cells.length).className = "td";
        }
      }
    }
    else {
      r = tbody.insertRow(0);
      for (i = 0; i < n; i++) {
        r.insertCell(r.cells.length).className = "td";
      }
    }
    if (columnAxis) {
      //try to size cell widths as much as possible ahead.
      this.addPositionableRow(table, n, true, this.getColumnsTableDom().rows[0].cells);
    }

    //add cells to the dom
    this.getCellsDom().appendChild(table);
  },
  loadCells: function(columnAxis, rowAxis, pageAxis){
    var args = [],
        table = this.getCellsTableDom(),
        tbody = table.tBodies[0],
        rows = tbody.rows,
        dataset = this.dataset,
        cellset = dataset.getCellset(),
        cell, cells, from, to,
        func = cellset.getByTupleIndexes,
        columnAxis = dataset.hasColumnAxis() ? dataset.getColumnAxis() : null,
        axisCount = dataset.axisCount(),
        i, n = columnAxis ? columnAxis.tupleCount() : 1, colTuples, colTuple,
        j, m, rowTuples, rowTuple,
        k, l,
        r, c, tds, r1, c1,
        columnOffset
    ;
    var cellValueExtractor = cellset.cellFmtValue ? "FmtValue" : "Value";
    table.style.display = "none";
    
    var tableParent = table.parentNode;
    table = tableParent.removeChild(table);
    
    if (dataset.hasPageAxis()) {
      args.push(dataset.getPageAxis().tupleIndex());
    }
    if (dataset.hasRowAxis()) {
      var rowsTableDomRows = this.getRowsTableDom().rows;
      m = dataset.getRowAxis().tupleCount();

      //get a range of cells from the dataset
      args[axisCount - Xmla.Dataset.AXIS_ROWS - 1] = 0;
      args[axisCount - Xmla.Dataset.AXIS_COLUMNS - 1] = 0;
      from = cellset.cellOrdinalForTupleIndexes.apply(cellset, args);

      args[axisCount - Xmla.Dataset.AXIS_ROWS - 1] = m - 1;
      args[axisCount - Xmla.Dataset.AXIS_COLUMNS - 1] = n - 1;
      to = cellset.cellOrdinalForTupleIndexes.apply(cellset, args);

      //console.time("fetchRangeAsArray");
      cells = cellset.fetchRangeAsArray(from, to);
      //console.timeEnd("fetchRangeAsArray");

      //console.time("fillTable");
      //fill the table cells with the values.
      cell = cells.length ? cells[0] : null;
      for (j = l = k = columnOffset = 0; j < m; j++){  //loop over rows
        r = rows[j];
        tds = r.cells;
        for (i = 0; i < n; i++, k++) {      //loop over columns
          c = tds[columnOffset + i];
          if (cell && cell.ordinal === k) {
            c.innerHTML = cell[cellValueExtractor];
            cell = cells[++l];
          }
          else {
            c.innerHTML = "";
          }
        }
      }
      //console.timeEnd("fillTable");
    }
    else
    if (dataset.hasColumnAxis()) {
      r = rows[0];
      from = cellset.cellOrdinalForTupleIndexes(0);
      to = cellset.cellOrdinalForTupleIndexes(n - 1);

      //console.time("fetchRangeAsArray");
      cells = cellset.fetchRangeAsArray(from, to);
      //console.timeEnd("fetchRangeAsArray");

      //console.time("fillTable");
      cell = cells.length ? cells[0] : null;
      for (i = 0, l = 0; i < n; i++) {
        args[0] = i;
        c = r.cells[i];
        if (cell && cell.ordinal === i) {
          c.innerHTML = cell[cellValueExtractor];
          cell = cells[++l];
        }
        else {
          c.innerHTML = "";
        }
      }
      //console.timeEnd("fillTable");
    }

    tableParent.appendChild(table);
    

    //console.time("alignCells");
    //align the columnn header
    if (dataset.hasColumnAxis()){
      table.style.display = "";

      var columnsTable = this.getColumnsTableDom(),
          columnsPositioningCells = columnsTable.rows[0].cells,
          positioningCells = rows[rows.length - 1].cells,
          x = 0, y = 0;
      ;
      for (i = 0; i < n; i++) {
        c = columnsPositioningCells[i];
        c1 = positioningCells[i];
        if (c1.offsetWidth === c.offsetWidth) {
          c.firstChild.style.width = c.offsetWidth + "px";
          continue;
        }
        if (c1.offsetWidth > c.offsetWidth) {
          y++;
          c.firstChild.style.width = c1.offsetWidth + "px";
        }
        else {
          x++;
          c1.firstChild.style.width = c.offsetWidth + "px";
        }
      }
    }
    //console.timeEnd("alignCells");
  },
  getColumnOffset: function() {
    return this.columnOffset;
  },
  clearAxis: function(dom){
    if (!dom) {
      return;
    }
    dCh(dom);
    var style = dom.style;
    style.width = "0px";
    style.height = "0px";
  },
  clear: function(){
    this.clearAxis(this.getRowsHeadersDom());
    this.clearAxis(this.getRowsDom());
    this.clearAxis(this.getCellsDom());
    this.clearAxis(this.getColumnsDom());
    this.doLayout();
  }
};
adopt(PivotTable, Observable);
PivotTable.id = 0;
PivotTable.prefix = "pivot-table";

linkCss(cssDir + "mdpivottable.css");
