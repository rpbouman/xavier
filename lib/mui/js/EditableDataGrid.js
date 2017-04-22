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
var EditableDataGrid;

(function() {

(EditableDataGrid = function(conf){
  arguments.callee._super.apply(this, arguments);
  this.listen({
    scope: this,
    cellClicked: function(grid, event, data){
      this.cellClicked(data);
    }
  });
}).prototype = {
  currentCellEditor: null,
  beforeSetColumns: function(){
    //unlisten the keyboard event from the cellEditors
    var cellEditor, cellEditors = [];
    this.eachColumn(function(i, column){
      cellEditor = column.cellEditor;
      if (!cellEditor) {
        return true;
      }
      if (cellEditors.indexOf(cellEditor) !== -1) {
        return true;
      }
      cellEditors.push(cellEditor);
      cellEditor.unlisten("keydown", this.handleCellEditorKeydown, this);
    }, this);
  },
  columnsSet: function(){
    //listen for keyboard event on the cellEditors
    var cellEditor, cellEditors = [];
    this.eachColumn(function(i, column){
      cellEditor = column.cellEditor;
      if (!cellEditor) {
        return true;
      }
      if (cellEditors.indexOf(cellEditor) !== -1) {
        return true;
      }
      cellEditors.push(cellEditor);
      cellEditor.listen({
        scope: this,
        keydown: this.handleCellEditorKeydown,
        editingStarted: this.editingStarted,
        editingStopped: this.editingStopped
      });
    }, this);

  },
  editingStarted: function(cellEditor, event, data){
    this.currentCellEditor = cellEditor;
  },
  editingStopped: function(cellEditor, event, data){
    this.currentCellEditor = null;
  },
  moveUp: function(rowIndex, columnIndex){
    var cell = this.getCell(--rowIndex, columnIndex);
    if (cell === null) {
      return;
    }
    var column = this.getColumn(columnIndex);
    var cellEditor = column.cellEditor;
    cellEditor.startEditing(cell);
  },
  moveDown: function(rowIndex, columnIndex){
    var cell = this.getCell(++rowIndex, columnIndex);
    if (cell === null) {
      return;
    }
    var column = this.getColumn(columnIndex);
    var cellEditor = column.cellEditor;
    cellEditor.startEditing(cell);
  },
  insertRow: function(rowIndex, rowHeaderValues, cellValues) {
    var currentCellEditor = this.currentCellEditor;
    if (currentCellEditor) {
      var cell = currentCellEditor.getContainer();
      var cellIndex = cell.cellIndex;
    }
    var rowIndex = EditableDataGrid._super.prototype.insertRow.apply(this, arguments);
    if (iDef(rowIndex) && iDef(cellIndex)) {
      cell = this.getCell(rowIndex, cellIndex);
      currentCellEditor.startEditing(cell);
    }
  },
  deleteRow: function(rowIndex) {
    var currentCellEditor = this.currentCellEditor;
    if (currentCellEditor) {
      var cell = currentCellEditor.getContainer();
      var cellIndex = cell.cellIndex;
    }
    var rowIndex = EditableDataGrid._super.prototype.deleteRow.apply(this, arguments);
    if (iDef(rowIndex) && rowIndex !== -1 && iDef(cellIndex)) {
      cell = this.getCell(rowIndex, cellIndex);
      currentCellEditor.startEditing(cell);
    }
  },
  handleCellEditorKeydown: function(cellEditor, event, data){
    var dom = cellEditor.getDom();
    var cell = dom.parentNode;
    var row = cell.parentNode;
    var columnIndex = cell.cellIndex;
    var rowIndex = row.rowIndex -1;
    var keyCode = data.getKeyCode();
    var shiftKey = data.getShiftKey();
    switch (keyCode) {
      case 9: //tab
        data.preventDefault();
        cellEditor.stopEditing();
        var me = this;
        if (shiftKey) {
          me.previousField(rowIndex, columnIndex);
        }
        else {
          me.nextField(rowIndex, columnIndex);
        }
        return false
        break;
      case 38:  //up
        data.preventDefault();
        this.moveUp(rowIndex, columnIndex);
        break;
      case 40:  //down
        data.preventDefault();
        this.moveDown(rowIndex, columnIndex);
        break;
      case 45:  //insert
        if (shiftKey){
          data.preventDefault();
          this.insertRow(rowIndex);
        }
        break;
      case 46:  //delete
        if (shiftKey){
          data.preventDefault();
          this.deleteRow(rowIndex);
        }
        break;
      default:
    }
  },
  previousField: function(rowIndex, columnIndex) {
    var cells = this.cells,
        n = cells.length, i,
        columns = this.columns,
        m = columns.length, j,
        column, cellEditor, cell
    ;
    j = columnIndex;
    for (i = rowIndex; i >= 0; i--) {
      j--;
      for (; j >= 0; j--) {
        column = columns[j];
        cellEditor = column.cellEditor;
        if (column.cellEditor) {
          cell = this.getCell(i, j);
          cellEditor.startEditing(cell);
          return true;
        }
      }
      j = m;
    }
    return false;
  },
  nextField: function(rowIndex, columnIndex) {
    var cells = this.cells,
        n = cells.length, i,
        columns = this.columns,
        m = columns.length, j,
        column, cellEditor, cell
    ;
    j = columnIndex + 1;
    for (i = rowIndex; i < n; i++){
      for (; j < m; j++) {
        column = columns[j];
        cellEditor = column.cellEditor;
        if (column.cellEditor) {
          cell = this.getCell(i, j);
          cellEditor.startEditing(cell);
          return true;
        }
      }
      j = 0;
    }
    return false;
  },
  cellClicked: function(data){
    var column = this.getColumn(data.columnIndex);
    var cellEditor = column.cellEditor;
    if (!cellEditor) {
      return;
    }
    cellEditor.startEditing(data.dom);
  }
};

adopt(EditableDataGrid, DataGrid);
})();
