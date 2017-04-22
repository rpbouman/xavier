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

var DataGrid;

(function() {

(DataGrid = function(conf) {
  conf = this.conf = conf || {};
  this.id = conf.id ? conf.id : ++DataGrid.id;
  DataGrid.instances[this.getId()] = this;
  this.rowIndexHeader = conf.rowIndexHeader || true;
  arguments.callee._super.apply(this, arguments);
}).prototype = {
  destroy: function(){
    this.unlisten();
    var id = this.getId();
    delete DataGrid.instances[id];
    dEl(id);
  },
  getId: function(){
    return DataGrid.prefix + this.id;
  },
  createDom: function(){
    var id = this.getId();
    var conf = this.conf;
    var el = cEl("div", {
      "class": "datagrid",
      id: id
    });
    listen(el, "click", this.clickHandler, this);

    var spacer = cEl("div", {
      "class": "datagrid-spacer",
      id: id + "-spacer"
    }, null, el);

    var cols = cEl("div", {
      "class": "datagrid-col-headers",
      id: id + "-cols"
    }, null, el);
    //this.createColsTable();

    var rows = cEl("div", {
      "class": "datagrid-row-headers",
      id: id + "-rows"
    }, null, el);
    //this.createRowsTable();

    var cells = cEl("div", {
      "class": "datagrid-cells",
      id: id + "-cells"
    }, null, el);
    //this.createCellsTable();

    listen(cells, "scroll", this.scrollHandler, this);
    return el;
  },
  addPositionableRow: function(table, n, last) {
    var c, i, r = table.insertRow(last ? table.rows.length : 0);
    r.className = "positioning-row";
    for (i = 0; i < n; i++){
        c = r.insertCell(i);
        c.innerHTML = "<div>&#160;</div>";
        c.style.width = "0px";
    }
    return r;
  },
  getColumnCount: function(){
    return this.columns ? this.columns.length : undefined;
  },
  getColumnIndex: function(name){
    var index = -1;
    this.eachColumn(function(i, column){
      if (column.name === name) {
        index = i;
        return false;
      }
    }, this);
    return index;
  },
  getCellValue: function(rowIndex, columnIndex){
    return this.cells[rowIndex][columnIndex];
  },
  setCellValue: function(rowIndex, columnIndex, value){
    this.cells[rowIndex][columnIndex] = value;
    var cell = this.getCell(rowIndex, columnIndex);
    this.setCellText(cell, value);
  },
  getColumn: function(index) {
    if (iStr(index)) {
      index = this.getColumnIndex(index);
    }
    return this.columns[index];
  },
  eachColumn: function(callback, scope) {
    if (!scope) {
      scope = this;
    }
    var i, column, columns = this.columns, n = columns.length;
    for (i = 0; i < n; i++) {
      column = columns[i];
      if (callback.call(scope, i, column) === false) {
        return false;
      }
    }
    return true;
  },
  eachRow: function(callback, scope){
    if (!scope) {
      scope = this;
    }
    var rows = this.rows, cells = this.cells, i, n = cells.length, row;
    if (!cells || !cells.length) {
      return true;
    }
    for (i = 0; i < n; i++) {
      if (callback.call(scope, i, rows && rows.length < n ? rows[i] : null, cells[i]) === false) {
        return false;
      }
    }
    return true;
  },
  eachRowHeader: function(callback, scope){
    if (!scope) {
      scope = this;
    }
    var rowHeaders = this.rowHeaders || [];
    var n = rowHeaders.length, i, rowHeader;
    for (i = 0; i < n; i++){
      rowHeader = rowHeaders[i];
      callback.call(scope, i, rowHeader);
    }
  },
  eachCellRow: function(callback, scope){
    if (!scope) scope = this;
    var rows = this.cells, i, n = rows.length, row;
    for (i = 0; i < n; i++) {
      row = rows[i];
      callback.call(scope, i, row);
    }
  },
  deleteTableRows: function(table){
    dCh(table);
  },
  setColumns: function(columns) {
    var columnsDom = this.getColumnsTableDom();
    var colCount = columns.length;
    this.deleteTableRows(columnsDom);
    //add a row for positioning/sizing purposes.
    this.addPositionableRow(columnsDom, colCount);
    //add row for column headers
    var row = columnsDom.insertRow(1);
    this.columns = columns;
    this.eachColumn(function(i, column){
      column.index = i;
      if (!column.className) {
        column.className = "th " + confCls(column).join(" ");
      }
      var cell = row.insertCell(i);
      cell.className = column.className;
      cell.innerHTML = escXml(column.label || column.name);
    }, this);
    this.columnsSet();
  },
  setRowHeaders: function(rowHeaders) {
    this.rowHeaders = rowHeaders;
    //TODO: add cells to row header table.
    this.rowHeadersSet();
  },
  rowHeadersSet: function(){
    //noop
  },
  columnsSet: function(){
    //noop
  },
  getColumn: function(index){
    return this.columns[index];
  },
  getCellsRow: function(rowIndex){
    var cellsDom = this.getCellsTableDom();
    var rows = cellsDom.rows;
    if (++rowIndex >= rows.length) {
      return null;
    }
    if (rowIndex < 1) {
      return null;
    }
    var row = rows[rowIndex];
    return row;
  },
  getCell: function(rowIndex, columnIndex){
    var row = this.getCellsRow(rowIndex);
    if (row === null) {
      return null;
    }
    var cells = row.cells;
    if (columnIndex >= cells.length) {
      return null;
    }
    var cell = cells[columnIndex];
    return cell;
  },
  clear: function(){
    this.setData({
      columns: [],
      rows: [],
      cells: []
    });
  },
  setData: function(data) {
    this.setColumns(data.columns);
    this.setRowSet(data);
  },
  getPositionableRowHTML: function(n){
    var i, html = "<tr class=\"positioning-row\">";
    for (i = 0; i < n; i++) {
      html += "<td><div>&#160;</div></td>";
    }
    return html + "</tr>";
  },
  createRowHeaders: function(rowIndex, rowHeaderValues){
    var className, rowHeaders = this.rowHeaders || [], n = rowHeaders.length;
    if (!n) {
      return;
    }
    var rowHeader, rowsDom = this.getRowsTableDom();
    rowIndex += 1;
    var tr = rowsDom.insertRow(rowIndex), j, td, val;
    for (j = 0; j < n; j++){
      rowHeader = rowHeaders[j];
      td = tr.insertCell(j);
      className = "th";
      if (rowHeader.isAutoRowNum === true) {
        val = rowIndex;
        className += " autorownum";
      }
      else {
        val = rowHeaderValues[j];
        if (iStr(val)){
          val = escXml(val);
        }
      }
      td.className = className;
      cEl("DIV", {}, val, td);
    }
  },
  setCellText: function(td, text){
    td.innerHTML = (iStr(text) ? (text.length === 0 ? "<br/>" : escXml(text)) : text === null || iUnd(text) ? "<br/>" : String(text));
  },
  createCells: function(rowIndex, values){
    var cellsDom = this.getCellsTableDom();
    var tr = cellsDom.insertRow(rowIndex + 1);
    var j, columns = this.columns, n = columns.length, column, td, val, m = values.length;
    for (j = 0; j < n; j++){
      column = columns[j];
      td = tr.insertCell(j);
      td.className = "th " + column.className;
      if (j >= m) {
        continue;
      }
      val = values[j];
      if (val === null || iUnd(val)) {
        //TODO: handle non existing value.
        continue;
      }
      this.setCellText(td, val);
    }
  },
  setRowSet: function(data){
    var rows = this.rows = data.rows || [],
        cells = this.cells = data.cells || [];
    var val, i, n = Math.max(rows.length, cells.length);
    var rowHeader, rowHeaders = this.rowHeaders,
        j, m = rowHeaders.length || 0,
        column, columns = this.columns,
        k, l = columns.length || 0
    ;
    var rowsHTML = "", cellsHTML = "";
    var item;

    rowsHTML = this.getPositionableRowHTML(m);
    cellsHTML = this.getPositionableRowHTML(l);
    for (i = 0; i < n; i++){
      //do the row
      item = rows[i];
      rowsHTML += "<tr>";
      for (j = 0; j < m; j++){
        rowsHTML += "<td class=\"th";
        rowHeader = rowHeaders[j];
        if (rowHeader.isAutoRowNum === true) {
          rowsHTML += " autorownum\"><div>" + (i+1);
        }
        else {
          rowsHTML += "\"><div>";
          val = item[j];
          if (val !== null && iDef(val)) {
            if (iStr(val)) {
              val = escXml(val);
            }
            rowsHTML += val;
          }
        }
        rowsHTML += "</div></td>";
      }
      rowsHTML += "</tr>";

      //do the cells
      item = cells[i];
      cellsHTML += "<tr>";
      for (k = 0; k < l; k++){
        column = columns[k];
        cellsHTML += "<td class=\"th " + column.className + "\">";
        if (k < item.length) {
          val = item[k];
          if (val !== null && iDef(val)) {
            if (iStr(val)) {
              val = escXml(val);
            }
            cellsHTML += val;
          }
        }
        cellsHTML += "</td>";
      }
      cellsHTML += "</tr>";
    }
    var rowsTable = this.getRowsTableDom();
    rowsTable.innerHTML = rowsHTML;
    var cellsTable = this.getCellsTableDom();
    cellsTable.innerHTML = cellsHTML;
    this.doLayout();
  },
  resetColumnWidths: function(){
    var colsTable = this.getColumnsTableDom();
    var colsRow = colsTable.rows[0];
    var colsRowCells = colsRow.cells;
    var i, n = colsRowCells.length, colsRowCell, colsDiv;
    for (i = 0; i < n; i ++) {
      colsRowCell = colsRowCells[i];
      colsDiv = colsRowCell.firstChild;
      colsDiv.style.width = "0px";
    }
  },
  doLayout: function() {
    var dom = this.getDom(),
      spacer = this.getSpacerDom(),
      rows = this.getRowsDom(),
      rowsTable = this.getRowsTableDom(),
      cols = this.getColumnsDom(),
      colsTable = this.getColumnsTableDom(),
      cells = this.getCellsDom(),
      cellsTable = this.getCellsTableDom(),
      width, height
    ;
    var rowsTableWidth = (rowsTable ? rowsTable.offsetWidth : 0),
        rowsTableHeight = (rowsTable ? rowsTable.offsetHeight : 0)
    ;
    //put the column headers at the very top
    cols.style.top = 0 + "px";
    cols.style.height = colsTable.offsetHeight + "px";

    //put the row headers at the very left
    rows.style.left = 0 + "px";

    //put cells and column headers to the left of the row headers
    cells.style.left = cols.style.left = rows.style.width = (rowsTableWidth + "px");

    //put the cells table and the row headers right below the column headers
    cells.style.top = colsTable.offsetHeight + "px";
    rows.style.top =  (colsTable.offsetHeight - 1) + "px";

    //cols.style.width = (width - rows.offsetWidth) + "px";

    height = dom.clientHeight;
    if ((height - colsTable.offsetHeight - scrollbarHeight) < cellsTable.offsetHeight){
      height = (height - colsTable.offsetHeight);
    }
    else {
      height = cellsTable.clientHeight + scrollbarHeight;
    }
    rows.style.height = cells.style.height = height + "px";
    //rows.style.height = cells.style.height = ((dom.offsetHeight - colsTable.offsetHeight) - scrollbarHeight) + "px";

    width = dom.clientWidth;
    if ((width - rowsTable.offsetWidth - scrollbarWidth) < cellsTable.offsetWidth) {
      //if the cells take more width then available.
      width = (width - rowsTable.offsetWidth);
    }
    else {
      width = cellsTable.clientWidth + scrollbarWidth;
    }
    //cells.style.width = (dom.offsetWidth - rowsTable.offsetWidth) + "px";
    cols.style.width = cells.style.width =  width + "px";

    spacer.style.width = rowsTable.offsetWidth + "px";
    spacer.style.height = colsTable.offsetHeight + "px";

    this.synCellAndColumnWidths();
  },
  synCellAndColumnWidths: function(){
    var colsTable = this.getColumnsTableDom();
    var colsRow = colsTable.rows[0];
    if (!colsRow) {
      return;
    }
    var colsCells = colsRow.cells;
    var cellsTable = this.getCellsTableDom();
    var cellsRow = cellsTable.rows[0];
    var cellsCells = cellsRow.cells;
    var i, n = cellsCells.length, colsCell, cellsCell, colsDiv, cellsDiv;
    for (i = 0; i < n; i ++) {
      colsCell = colsCells[i];
      colsDiv = colsCell.firstChild;

      cellsCell = cellsCells[i];
      cellsDiv = cellsCell.firstChild;

      if (colsCell.offsetWidth > cellsCell.offsetWidth) {
        cellsDiv.style.width = colsCell.offsetWidth + "px";
      }
      else
      if (colsCell.offsetWidth < cellsCell.offsetWidth) {
        colsDiv.style.width = cellsCell.offsetWidth + "px";
      }

    }
  },
  getSpacerDom: function() {
    return gEl(this.getId() + "-spacer");
  },
  getCellsDom: function() {
    return gEl(this.getId() + "-cells");
  },
  createCellsTable: function(){
    var cellsDom = this.getCellsDom();
    var cellsTable = cEl("table", {
      cellpadding: 0,
      cellspacing: 0,
      "class": "datagrid-cells",
      id: cellsDom.id + "-table"
    }, null, cellsDom);
    return cellsTable;
  },
  getCellsTableDom: function() {
    var el = gEl(this.getId() + "-cells-table");
    if (!el) {
      el = this.createCellsTable();
    }
    return el;
  },
  getRowsDom: function() {
    return gEl(this.getId() + "-rows");
  },
  createRowsTable: function(){
    var rowsDom = this.getRowsDom();
    var rowsTable = cEl("table", {
      cellpadding: 0,
      cellspacing: 0,
      "class": "datagrid-row-headers",
      id: rowsDom.id + "-table"
    }, null, rowsDom);
    return rowsTable;
  },
  getRowsTableDom: function() {
    var el = gEl(this.getId() + "-rows-table");
    if (!el) {
      el = this.createRowsTable();
    }
    return el;
  },
  getColumnsDom: function() {
    return gEl(this.getId() + "-cols");
  },
  createColsTable: function(){
    var columnsDom = this.getColumnsDom();
    var colsTable = cEl("table", {
      "class": "datagrid-col-headers",
      cellpadding: 0,
      cellspacing: 0,
      id: columnsDom.id + "-table"
    }, null, columnsDom);
    return colsTable;
  },
  getColumnsTableDom: function() {
    var el = gEl(this.getId() + "-cols-table");
    if (!el) {
      el = this.createColsTable();
    }
    return el;
  },
  scrollHandler: function(event) {
    var cells = this.getCellsDom(),
        rowsDom = this.getRowsDom(),
        colsDom = this.getColumnsDom()
    ;
    if (rowsDom) {
      rowsDom.style.top = ((-cells.scrollTop) + colsDom.offsetHeight) + "px";
    }
    colsDom.style.left = ((-cells.scrollLeft) + rowsDom.offsetWidth) + "px";
  },
  getDom: function() {
    var el = gEl(this.getId());
    if (!el) {
      el = this.createDom();
    }
    return el;
  },
  clickHandler: function(event){
    var target = event.getTarget();
    if (target.tagName === "TD") {
      var row = target.parentNode;
      var table = row.parentNode.parentNode;
      switch (table.className) {
        case "datagrid-col-headers":
          this.fireEvent("columnHeaderClicked", {
            columnIndex: target.cellIndex,
            dom: target
          });
          break;
        case "datagrid-row-headers":
          this.fireEvent("rowHeaderClicked", {
            rowIndex: target.parentNode.rowIndex - 1,
            dom: target
          });
          break;
        case "datagrid-cells":
          this.fireEvent("cellClicked", {
            columnIndex: target.cellIndex,
            rowIndex: target.parentNode.rowIndex - 1,
            dom: target
          });
          break;
      }
    }
  },
  updateAutoRowNumHeaders: function(rowIndex){
    var autoRowNumHeaders = [];
    this.eachRowHeader(function(i, rowHeader){
      if (rowHeader.isAutoRowNum === true) {
        autoRowNumHeaders.push(i);
      }
    }, this);
    var m = autoRowNumHeaders.length;
    if (m) {
      var rowsDom = this.getRowsTableDom();
      var rowsDomRows = rowsDom.rows, i, n = rowsDomRows.length, j, row, cells;
      for (i = rowIndex; i < n; i++){
        row = rowsDomRows[i];
        cells = row.cells;
        for (j = 0; j < m; j++){
          cells[autoRowNumHeaders[j]].innerHTML = i;
        }
      }
    }
  },
  deleteRow: function(rowIndex){
    if (this.rows) {
      this.rows.splice(rowIndex, 1);
    }
    var rowsTable = this.getRowsTableDom();
    rowsTable.deleteRow(rowIndex+1);

    this.cells.splice(rowIndex, 1);
    var cellsTable = this.getCellsTableDom();
    cellsTable.deleteRow(rowIndex+1);

    this.updateAutoRowNumHeaders(rowIndex);
    this.doLayout();
    this.fireEvent("rowDeleted", {
      rowIndex: rowIndex
    });
    return rowIndex;
  },
  insertRow: function(rowIndex, rowHeaderValues, cellValues) {
    //rowheaders
    if (!rowHeaderValues) {
      rowHeaderValues = [];
    }
    this.eachRowHeader(function(i, rowHeader){
      if (rowHeaderValues.length <= i) {
        rowHeaderValues.push(rowHeader.defaultValue || "");
      }
    }, this);

    if (this.rows) {
      this.rows.splice(rowIndex, 0, rowHeaderValues);
    }
    this.createRowHeaders(rowIndex, rowHeaderValues);

    //cells
    if (!cellValues) {
      cellValues = [];
      this.eachColumn(function(i, column){
        cellValues.push(column.defaultValue || "");
      }, this);
    }
    this.cells.splice(rowIndex, 0, cellValues);
    this.createCells(rowIndex, cellValues);

    //now that the row is added, update any autoRowNum row headers.
    this.updateAutoRowNumHeaders(rowIndex+2);
    this.doLayout();
    this.fireEvent("rowInserted", {
      rowIndex: rowIndex
    });
    return rowIndex;
  }
};
adopt(DataGrid, Observable);

DataGrid.id = 0;
DataGrid.prefix = "datagrid";
DataGrid.instances = {};
DataGrid.getInstance = function(id){
    if (iInt(id)) id = DataGrid.prefix + id;
    return DataGrid.instances[id];
};
DataGrid.lookup = function(el){
  var re = new RegExp("^" + DataGrid.prefix + "\\d+$", "g");
  while (el && !re.test(el.id)) {
      if ((el = el.parentNode) === doc) return null;
  }
  return DataGrid.getInstance(el.id);
};

linkCss(muiCssDir + "datagrid.css");

})();
