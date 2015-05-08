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

doc.title = gMsg("XML/A Visualizer");

linkCss("../css/xavier.css");

var xmla = new Xmla({
  async: true,
  url: xmlaUrl,
  forceResponseXMLEmulation: true
});

var dnd = new DDHandler({
  node: body
});
SplitPane.listenToDnd(dnd);

/**
*   Toolbar
*/
var mainToolbar = new Toolbar({
  container: body
});
mainToolbar.addButton([
  {"class": "refresh", tooltip: gMsg("Refresh metadata")},
  {"class": "separator"},
  {"class": "new-table", group: "vis", tooltip: gMsg("New Table")},
  {"class": "new-pivot-table", group: "vis", tooltip: gMsg("New Pivot Table")}
]);

mainToolbar.addButton([
  {"class": "new-pie-chart", group: "vis", tooltip: gMsg("New Pie Chart")},
  {"class": "new-bar-chart", group: "vis", tooltip: gMsg("New Bar Chart")}
]);

mainToolbar.addButton([
  {"class": "separator"},
  {"class": "run", group: "visaction", tooltip: gMsg("Run Query")},
  {"class": "auto-run", group: "visaction", tooltip: gMsg("Toggle Autorun Query"), toggleGroup: "auto-run", depressed: true},
  {"class": "separator"},
  {"class": "excel", group: "visaction", tooltip: gMsg("Export to Microsoft Excel")},
  {"class": "separator"},
  {"class": "clear", group: "visaction", tooltip: gMsg("Discard this query and start over")}
]);

mainToolbar.displayGroup(mainToolbar.groups.vis.name, false);
mainToolbar.displayGroup(mainToolbar.groups.visaction.name, false);
mainToolbar.listen({
  buttonPressed: function(toolbar, event, button){
    var conf = button.conf;
    var className = conf["class"];
    switch (className) {
      case "new-table":
        workArea.newTableTab();
        break;
      case "new-pivot-table":
        workArea.newPivotTableTab();
        break;
      case "new-pie-chart":
        workArea.newPieChartTab();
        break;
      case "new-bar-chart":
        workArea.newBarChartTab();
        break;
      case "run":
        workArea.executeQuery();
        break;
      case "clear":
        workArea.clear();
        break
      case "excel":
        exportToExcel();
        break
      default:
        throw "Not implemented";
    }
  },
  afterToggleGroupStateChanged: function(toolbar, event, data){
    var depressedButton = toolbar.getDepressedButtonInToggleGroup(data.group);
    switch (data.group) {
      case "auto-run":
        workArea.setAutoRunEnabled(getAutoRunEnabled());
        break;
    }
  }
});

function getAutoRunEnabled(){
  return mainToolbar.getDepressedButtonInToggleGroup("auto-run");
}

/**
*   TreeView
*/
var xmlaTreeView = new XmlaTreeView({
  xmla: xmla,
  catalogNodesInitiallyFlattened: true,
  dimensionNodesInitiallyFlattened: false,
  listeners: {
    busy: function(){
      busy(true);
    },
    done: function(){
      busy(false);
    },
    error: function(xmlaTreeView, event, error){
      busy(false);
      showAlert("Unexpected Error", error.toString() || error.message);
      console.error(error.getStackTrace());
    },
    beforeLoadCube: function(xmlaTreeView, event, selection){
      var ret;
      if (workArea.hasTabsForCube()) {
        showConfirm(
          "This action will close all tab pages associated with the current cube. Do you want to continue?",
          "Close tabs for current cube?",
          function(){
            workArea.closeTabsForCube();
            xmlaTreeView.loadCube(selection);
          },
          function(){
            return;
          },
          null,
          "Yes",
          "No"
        );
        ret = false;
      }
      else {
        ret = true;
      }
      return ret;
    },
    loadCube: function(xmlaTreeView, event, cubeTreeNode){
      mainToolbar.displayGroup(mainToolbar.groups.vis.name, false);
    },
    cubeLoaded: function(xmlaTreeView, event){
      mainToolbar.displayGroup(mainToolbar.groups.vis.name, true);

      var cubeTreeNode = xmlaTreeView.getCurrentCubeTreeNode();
      var catalogTreeNode = xmlaTreeView.getCurrentCatalogTreeNode();
      var datasourceTreeNode = xmlaTreeView.getCurrentDatasourceTreeNode();

      var currentCube = {
        cube: cubeTreeNode.conf.metadata,
        catalog: catalogTreeNode.conf.metadata,
        datasource: datasourceTreeNode.conf.metadata
      };

      workArea.setCube(currentCube);
    },
    //called when an information icon is clicked.
    requestinfo: function(xmlaTreeView, event, data){
      workArea.newInfoTab(data);
    }
  }
});

/**
*   Tabs (Workarea)
*/
var workArea = new XavierTabPane({
  dnd: dnd,
  xmla: xmla,
  xmlaTreeView: xmlaTreeView,
  autorun: getAutoRunEnabled(),
  listeners: {
    tabClosed: function(tabPane, event, data){
      if (tabPane.getSelectedTab() !== null) {
        return;
      }
      mainToolbar.displayGroup(mainToolbar.groups.visaction.name, false);
    },
    tabSelected: function(tabPane, event, data){
      var tab = tabPane.getTab(data.newTab);
      var display = tab ? Boolean(tab.getVisualizer()) : false;
      mainToolbar.displayGroup(mainToolbar.groups.visaction.name, display);
      tab.doLayout();
    }
  }
});

/**
*   Main layout
*/
var mainSplitPane = new SplitPane({
  container: body,
  classes: ["mainsplitpane"],
  firstComponent: xmlaTreeView,
  secondComponent: workArea,
  orientation: SplitPane.orientations.vertical
});

mainSplitPane.listen("splitterPositionChanged", function(mainSplitPane, event, data){
  //tell the workArea to redo layout since its size has just changed.
  workArea.doLayout();
});

//force rendering
mainSplitPane.getDom();
xmlaTreeView.init();

var oldSplitterPosition = 300;
setTimeout(function(){
  mainSplitPane.setSplitterPosition(oldSplitterPosition + "px");
  windowResized();
  xmlaTreeView.collapseCube();
}, 200);

/**
*   Drag and drop stuff
*/
function startDrag(event, dndHandler) {
  var dragInfo;
  var queryDesigner = workArea.getQueryDesigner();
  if (!queryDesigner) {
    return false;
  }
  if (!
    (
      (dragInfo = xmlaTreeView.checkStartDrag(event, dndHandler))
    ||(dragInfo = (queryDesigner ? queryDesigner.checkStartDrag(event, dndHandler) : null))
    )
  ) {
    return false;
  }
  //todo: apply to the current querydesigner
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
  //todo: apply to the current query designer
  var queryDesigner = workArea.getQueryDesigner();
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

/**
* Excel Export
*/
var xlsxExporter;
function exportToExcel(){
  try {
    var selectedTab = workArea.getSelectedTab();
    if (!selectedTab) {
      throw "No selected tab to export.";
    }
    var visualizer = selectedTab ? selectedTab.getVisualizer() : null;
    var dataset = selectedTab ? selectedTab.getDataset() : null;
    var queryDesigner = selectedTab ? selectedTab.getQueryDesigner() : null;
    if (!selectedTab || !visualizer || !queryDesigner || !dataset) {
      throw "There is nothing to export. Please enter a query first";
    }

    if (!xlsxExporter) {
      xlsxExporter = new XlsxExporter();
    }

    var catalog = workArea.getCatalog();
    var cube = workArea.getCube();
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

    if (vs) {
      vs = axes[vs];
      if (vs && vs.length) {
        if (hasBy) {
          name += " vs ";
        }
        else {
          name += " by ";
        }
        name += axisDescription(vs);
      }
    }

    slicer = axes["SlicerAxis"];
    if (slicer && slicer.length) {
      name += " for a selection of " + axisDescription(slicer);
    }

    xlsxExporter.doExport(name, visualizer, queryDesigner);
  }
  catch (exception){
    showAlert("Export Error", exception);
  }
}

/**
*   Resize window stuff
*/
var resizeEvent = {
  factor: .33
};
function windowResized(){
  if (resizeEvent === null) {
    return;
  }
  xmlaTreeView.getSplitPane().setSplitterPosition((100 * resizeEvent.factor) + "%");
  workArea.doLayout();
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

})();
