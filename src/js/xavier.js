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
(function(){

//we expect this to be initialized outside of this script. See xmlaUrl.js
if (!xmlaUrl) {
  return;
}

var title = gEls(head, "title", 0);
title.innerHTML = gMsg("XML/A Visualizer");

linkCss("../css/xavier.css");

var xmla = new Xmla({
  async: true,
  url: xmlaUrl,
  forceResponseXMLEmulation: true
});

/**
*
*/
var dnd = new DDHandler({
  node: body
});
SplitPane.listenToDnd(dnd);

var mainToolbar = new Toolbar({
  container: body
});
mainToolbar.addButton([
  {"class": "refresh", tooltip: gMsg("Refresh metadata")},
  {"class": "separator"},
  {"class": "new", tooltip: gMsg("New Query")},
  {"class": "open", tooltip: gMsg("Open Query")},
  {"class": "separator"},
  {"class": "save", tooltip: gMsg("Save Query")},
  {"class": "save-as", tooltip: gMsg("Save Query As...")},
  {"class": "separator"},
  {"class": "edit", tooltip: gMsg("Toggle edit mode"), toggleGroup: "edit", depressed: true},
  {"class": "separator"},
  {"class": "run", tooltip: gMsg("Run Query")},
  {"class": "auto-run", tooltip: gMsg("Toggle Autorun Query"), toggleGroup: "auto-run", depressed: true},
  {"class": "separator"},
  {"class": "show-column-hierarchy-headers", tooltip: gMsg("Show column hierarchy headers"), toggleGroup: "show-column-hierarchy-headers", depressed: false},
  {"class": "show-row-hierarchy-headers", tooltip: gMsg("Show row hierarchy headers"), toggleGroup: "show-row-hierarchy-headers", depressed: false},
  {"class": "separator"},
  {"class": "excel", tooltip: gMsg("Export to Microsoft Excel")},
]);
mainToolbar.listen({
  buttonPressed: function(toolbar, event, button){
    var conf = button.conf;
    var className = conf["class"];
    switch (className) {
      case "new":
        newQuery();
        break;
      case "save":
        saveModel();
        break;
      case "save-as":
        saveModelAs();
        break;
      case "run":
        executeQuery(queryDesigner);
        break;
      case "excel":
        exportToExcel();
        break;
      default:
        throw "Not implemented";
    }
  },
  afterToggleGroupStateChanged: function(toolbar, event, data){
    var depressedButton = toolbar.getDepressedButtonInToggleGroup(data.group);
    switch (data.group) {
      case "edit":
        editMode(depressedButton);
        break;
      case "show-empty":
        emptyCells(depressedButton);
        break;
      case "show-column-hierarchy-headers":
        pivotTable.showHorizontalHierarchyHeaders(depressedButton ? true : false);
        break;
      case "show-row-hierarchy-headers":
        pivotTable.showVerticalHierarchyHeaders(depressedButton ? true : false);
        break;
    }
  }
});

var oldSplitterPosition = 300;
function editMode(editMode){
  if (editMode) {
    mainSplitPane.uncollapse();
  }
  else {
    mainSplitPane.collapse(xmlaTreeView.getDom());
  }
  Displayed.setDisplayed(queryDesigner.getDom(), editMode ? true : false);
  pivotTable.doLayout();
}

function autoRunEnabled(){
  return mainToolbar.getDepressedButtonInToggleGroup("auto-run");
}

var xmlaTreeView = new XmlaTreeView({
  xmla: xmla,
  catalogNodesInitiallyFlattened: true,
  dimensionNodesInitiallyFlattened: false
});
xmlaTreeView.listen({
  busy: function(){
    busy(true);
  },
  done: function(){
    busy(false);
  },
  error: function(xmlaTreeView, event, error){
    busy(false);
    showAlert(error.toString());
    console.error(error.getStackTrace());
  },
  cubeSelected: function(xmlaTreeView, event, cubeTreeNode){
    newQuery();
    var catalogTreeNode = cubeTreeNode.getParentTreeNode();
    var datasourceTreeNode = catalogTreeNode.getParentTreeNode();
    queryDesigner.setCube(cubeTreeNode.conf.metadata);
    queryDesigner.setCatalog(catalogTreeNode.conf.metadata);
    queryDesigner.setDataSource(datasourceTreeNode.conf.metadata);
  }
});

function newQuery(){
  if (iUnd(queryDesigner)) {
    createQueryDesigner();
  }
  queryDesigner.reset();
  if (pivotTable) {
    pivotTable.clear();
  }
}

var workArea = new ContentPane({});
var mainSplitPane = new SplitPane({
  container: body,
  classes: ["mainsplitpane"],
  firstComponent: xmlaTreeView,
  secondComponent: workArea,
  orientation: SplitPane.orientations.vertical
});
mainSplitPane.listen("splitterPositionChanged", function(mainSplitPane, event, data){
  if (pivotTable) {
    pivotTable.doLayout();
  }
});

//force rendering
mainSplitPane.getDom();

var queryDesigner;
function createQueryDesigner() {
  queryDesigner = new QueryDesigner({
    container: cEl("div", {
      id: "query-designer",
      "class": "query-designer"
    }, null, workArea.getDom()),
    dnd: dnd
  });
  queryDesigner.listen({
    changed: function(queryDesigner, event, data){
      if (autoRunEnabled()) {
        executeQuery(queryDesigner);
      }
      else {

      }
    }
  });
  queryDesigner.render();
}

var pivotTable;
function createPivotTable(){
  var pivotTable = new PivotTable({
    container: cEl("div", {
      id: "pivot-table",
      "class": "pivot-table"
    }, null, workArea.getDom()),
    showHorizontalHierarchyHeaders: mainToolbar.getDepressedButtonInToggleGroup("show-column-hierarchy-headers") ? true : false,
    showVerticalHierarchyHeaders: mainToolbar.getDepressedButtonInToggleGroup("show-row-hierarchy-headers") ? true : false
  });
  pivotTable.listen({
    "collapse": function(pivotTable, event, data){
      collapseMember(data);
    },
    "expand": function(pivotTable, event, data){
      expandMember(data);
    }
  });
  return pivotTable;
}

function drillMember(drillEventData, drillDirection){
  var axis = queryDesigner.getAxis(drillEventData.axis);
  if (!axis) {
    throw "Invalid axis " + drillEventData.axis;
  }
  //first, fetch the metadata for this member
  var catalogName = queryDesigner.getCatalog().CATALOG_NAME;
  var cubeName = queryDesigner.getCube().CUBE_NAME;
  var properties = {
    DataSourceInfo: queryDesigner.datasouce.DataSourceInfo,
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
    url: queryDesigner.datasouce.URL,
    properties: properties,
    restrictions: restrictions,
    success: drillAction,
    error: function(xmla, options, exception){
      busy(false);
      throw exception;
    }
  });
}

function collapseMember(data){
  drillMember(data, "up");
}

function expandMember(data) {
  drillMember(data, "down");
}

function executeQuery(queryDesigner){
  busy(true);
  try {
    if (!pivotTable) {
      pivotTable = createPivotTable();
    }
    pivotTable.clear();
    var mdx = queryDesigner.getMdx();
    if (!mdx) {
      throw "Not a valid query";
    }
    console.time("executeQuery");
    xmla.execute({
      url: queryDesigner.datasouce.URL,
      properties: {
        DataSourceInfo: queryDesigner.datasouce.DataSourceInfo,
        Catalog: queryDesigner.catalog.CATALOG_NAME
      },
      statement: mdx,
      success: function(xmla, options, dataset){
        console.timeEnd("executeQuery");
        pivotTable.renderDataset(dataset);
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
    showAlert(exception.toString());
  }
}

var xlsxExporter;
function exportToExcel(){
  if (!pivotTable) {
    showAlert("Nothing to export", "There is nothing to export. Please enter a query first");
    return;
  }

  if (!xlsxExporter) {
    xlsxExporter = new XlsxExporter();
  }
  try {
    var name = queryDesigner.getCatalogName() + " " + queryDesigner.getCubeCaption() + " - ";
    var i, hierarchyCount, hierarchies, hierarchy, measures, measure, measureNames = [];
    var measureAxis, axes = {};
    queryDesigner.eachAxis(function(id, axis){
      axes[id] = [];
      hierarchyCount = axis.getHierarchyCount();
      for (i = 0; i < hierarchyCount; i++){
        hierarchy = axis.getHierarchyByIndex(i);
        if (axis.getHierarchyName(hierarchy) === "Measures") {
          measureAxis = id;
          var j, setDef, setDefs = axis.setDefs["Measures"], n = setDefs.length;
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

    //TODO: localize file name for export.
    var last;
    if (measureNames.length) {
      last = measureNames.pop();
      name += measureNames.join(", ");
      if (measureNames.length) {
        name += " and ";
      }
      name += last;
    }
    function axisDescription(hierarchies){
      var last, name = "";
      last = hierarchies.pop();
      name += hierarchies.join(",");
      if (hierarchies.length) {
        name += " and ";
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
        name += " by ";
      }
      name += axisDescription(by);
    }

    vs = axes[vs];
    if (vs.length) {
      if (hasBy) {
        name += " vs ";
      }
      else {
        name += " by ";
      }
      name += axisDescription(vs);
    }

    slicer = axes["SlicerAxis"];
    if (slicer.length) {
      name += " for a selection of " + axisDescription(slicer);
    }

    xlsxExporter.export(name, pivotTable);
  }
  catch (exception){
    showAlert("Export Error", exception);
  }
}

function startDrag(event, dndHandler) {
  var dragInfo;
  if (!
    (
      (dragInfo = xmlaTreeView.checkStartDrag(event, dndHandler))
    ||(dragInfo = (queryDesigner ? queryDesigner.checkStartDrag(event, dndHandler) : null))
    )
  ) {
    return false;
  }
  queryDesigner.highlightDropTargets(event.getTarget(), dragInfo);
  dndHandler.dragInfo = dragInfo;
  var proxy = dndHandler.dragProxy;
  proxy.innerHTML = dragInfo.label;
  var dragging = "dragging", className = dragging, i, classes = dragInfo.classes, n = classes.length;
  for (i = 0; i < n; i++){
    className += " " + classes[i] + "-" + dragging;
  }
  proxy.className = className;

  var proxyStyle = proxy.style;
  var xy = event.getXY();
  proxyStyle.left = (xy.x + 2) + "px";
  proxyStyle.top = (xy.y + 2) + "px";
  return true;
}

function whileDrag(event, dndHandler){
    var proxyStyle = dndHandler.dragProxy.style;
    var xy = event.getXY();
    proxyStyle.left = (xy.x + 2) + "px";
    proxyStyle.top = (xy.y + 2) + "px";

    var target = event.getTarget();
    var queryDesignerAxis = QueryDesignerAxis.lookup(target);

    var proxy = dndHandler.dropProxy;
    if (queryDesignerAxis && target.tagName !== "TABLE") {
      var dragInfo = dndHandler.dragInfo;
      var dom = queryDesignerAxis.getDom();
      var style = dom.style;

      var classToAdd, classToRemove, dropIndexes;
      if (queryDesignerAxis.canDropItem(target, dragInfo)) {
        //highlight the drop location
        var proxyStyle = proxy.style;
        proxyStyle.display = "block";
        var proxyClassName = QueryDesignerAxis.prefix + "-drop-target";
        var queryDesignerAxisDom = queryDesignerAxis.getDom();
        var queryDesignerAxisPos = pos(queryDesignerAxisDom);
        proxyClassName = proxyClassName + " " + proxyClassName + "-";
        var queryDesigner = queryDesignerAxis.getQueryDesigner();
        var layout = queryDesignerAxis.getLayout();
        var hierarchyIndex = queryDesignerAxis.getHierarchyIndex(
          queryDesignerAxis.getHierarchyName(dragInfo.metadata)
        );
        var row, rowPos, cell, cellPos;
        var el;
        if (hierarchyIndex === -1 || dragInfo.className === "hierarchy" || dragInfo.className === "measures") {
          //hierarchy does not exists yet.
          //Highlight the place where the new hierarchy would appear if dropped.
          proxyClassName += layout;
          switch (layout) {
            case QueryDesignerAxis.layouts.horizontal:
              row = target;
              row = gAnc(row, "TR");
              rowPos = pos(row);
              proxyStyle.height = "4px";
              proxyStyle.width = row.clientWidth + "px";
              proxyStyle.left = rowPos.left + "px";
              proxyStyle.top = (rowPos.top + row.clientHeight) + "px";
              break;
            case QueryDesignerAxis.layouts.vertical:
              cell = target;
              cell = gAnc(cell, "TD");
              cellPos = pos(cell);
              proxyStyle.height = queryDesignerAxisDom.clientHeight + "px";
              proxyStyle.top = queryDesignerAxisPos.top + "px";
              proxyStyle.width = "4px";
              proxyStyle.left = (cellPos.left + (cell.parentNode.rowIndex ? cell.clientWidth : 0)) + "px";
              break;
          }
        }
        else {
          //hierarchy exists.
          //Highlight the place where the new member would appear if dropped.
          cell = target;
          cell = gAnc(cell, "TD");
          row = cell.parentNode;
          proxyStyle.width = "4px";
          switch (layout) {
            case QueryDesignerAxis.layouts.horizontal:
              if (!row.rowIndex) {
                row = row.nextSibling;
              }
              row = queryDesignerAxisDom.rows[hierarchyIndex + 1];
              rowPos = pos(row);
              proxyStyle.top = rowPos.top + "px";
              proxyStyle.height = row.clientHeight + "px";
              if (cell.parentNode === row) {
                cellPos = pos(target);
                cellPos.left += target.offsetWidth;
              }
              else {
                if (cell.cellIndex) {
                  cell = (row.cells[1].children[queryDesignerAxis.getSetDefItemCount(hierarchyIndex) - 1]);
                  cellPos = pos(cell);
                  cellPos.left += cell.offsetWidth;
                }
                else {
                  cellPos = pos(cell);
                  cellPos.left += cell.clientWidth;
                }
              }
              proxyStyle.left = (cellPos.left) + "px";
              break;
            case QueryDesignerAxis.layouts.vertical:
              var itemsRow = queryDesignerAxisDom.rows[2];
              rowPos = pos(itemsRow);
              var itemsCell = itemsRow.cells[hierarchyIndex];
              cellPos = pos(itemsCell);
              proxyStyle.top = rowPos.top + "px";
              proxyStyle.height = row.clientHeight + "px";
              if (itemsRow === row && itemsCell === cell) {
                var targetPos = pos(target);
                proxyStyle.left = (targetPos.left + target.offsetWidth) + "px";
              }
              else {
                proxyStyle.left = cellPos.left + "px";
              }
              break;
          }
        }
        proxy.className = proxyClassName;
      }
    }
    else {
      proxy.className = "dnd-drop-proxy";
    }
    dnd.dropTargetAxis = queryDesignerAxis;
}

function endDrag(event, dndHandler) {
  var proxy = dndHandler.dragProxy;
  proxy.className = "dnd-drag-proxy";
  dndHandler.dropProxy.style.display = "none";

  if (dndHandler.dropTargetAxis) {
    dndHandler.dropTargetAxis.removeHighlight();
    dndHandler.dropTargetAxis = null;
  }
  queryDesigner.unHighlightDropTargets();

  var target = event.getTarget();
  var queryDesignerAxis = QueryDesignerAxis.lookup(target);

  var dragInfo = dndHandler.dragInfo;
  if (dragInfo.dragOrigin === xmlaTreeView) {
    xmlaTreeView.notifyEndDrag(event, dndHandler);
    if (queryDesignerAxis && queryDesignerAxis.canDropItem(target, dragInfo)) {
      queryDesignerAxis.itemDropped(target, dragInfo);
    }
  }
  else
  if (dragInfo.dragOrigin === queryDesigner) {
    if (queryDesignerAxis) {
      if (dragInfo.queryDesignerAxis === queryDesignerAxis) {
        dragWithinAxis(dragInfo, queryDesignerAxis, target);
      }
      else {
        dragFromAxisToOtherAxis(dragInfo, queryDesigner, queryDesignerAxis);
      }
    }
    else {
      dropOutsideAxis(dragInfo);
    }
  }
}

function dragWithinAxis(dragInfo, queryDesignerAxis, target){
  //drag and drop within same axis.
  switch (dragInfo.className){
    case "hierarchy":
    case "measures":
      queryDesignerAxis.moveHierarchy(
        dragInfo.metadata,
        queryDesignerAxis.getHierarchyIndexForTd(target)
      );
      break;
    case "member":
    case "member-drilldown":
    case "measure":
    case "level":
      queryDesignerAxis.moveMember(dragInfo.metadata, dragInfo.className, queryDesignerAxis.getMemberIndexForSpan(target));
      break;
  }
}

function dragFromAxisToOtherAxis(dragInfo, queryDesigner, queryDesignerAxis){
  //drag from and drop on another axis.
  switch (dragInfo.className) {
    case "hierarchy":
    case "measures":
      queryDesigner.moveHierarchy(
        dragInfo.metadata,
        dragInfo.queryDesignerAxis,
        queryDesignerAxis,
        queryDesignerAxis.getHierarchyIndexForTd(target) + 1
      );
      break;
    default:
      if (dragInfo.metadata === "query-designer-axis-header") {
        queryDesigner.swapAxes(dragInfo.queryDesignerAxis, queryDesignerAxis);
      }
  }
}

function dropOutsideAxis(dragInfo){
  //drop outside axis: remove the object.
  switch (dragInfo.className) {
    case "hierarchy":
    case "measures":
      dragInfo.queryDesignerAxis.removeHierarchy(dragInfo.metadata);
      break;
    case "member":
    case "member-drilldown":
    case "measure":
    case "level":
      dragInfo.queryDesignerAxis.removeMember(dragInfo.metadata, dragInfo.className);
      break;
    default:
      if (dragInfo.metadata === "query-designer-axis-header"){
        //an entire axis was dragged out.
        dragInfo.queryDesignerAxis.clear();
      }
  }
}

//Drag n drop support from tree to query editor.
dnd.listen({
  startDrag: startDrag,
  whileDrag: whileDrag,
  endDrag: endDrag
});

xmlaTreeView.init();

var resizeEvent = {
  factor: .33
};
function windowResized(){
  if (resizeEvent === null) {
    return;
  }
  xmlaTreeView.getSplitPane().setSplitterPosition((100 * resizeEvent.factor) + "%");
  if (pivotTable) {
    pivotTable.doLayout();
  }
  resizeEvent = null;
}
var resizeTimer = new Timer({
  delay: 100,
  listeners: {
    expired: windowResized
  }
});

listen(window, "resize", function(){
  if (resizeEvent === null) {
    resizeEvent = {
      factor: xmlaTreeView.getSplitPane().getSplitterRatio()
    };
  }
  resizeTimer.start();
});

setTimeout(function(){
  mainSplitPane.setSplitterPosition(oldSplitterPosition + "px");
  windowResized();
  xmlaTreeView.collapseCube();
}, 200);

})();
