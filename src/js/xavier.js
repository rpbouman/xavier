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
function XavierApplication(xavierOptions){

var app = this;
Observable.apply(app, xavierOptions);

if (!xavierOptions) {
  xavierOptions = {};
}

var metadataFilter = xavierOptions.metadataFilter;
if (!metadataFilter) {
  metadataFilter = {};
}
var xmlaMetadataFilter = new XmlaMetadataFilter(metadataFilter);
app.xmlaMetadataFilter = xmlaMetadataFilter;

doc.title = gMsg("XML/A Visualizer");

var xmla;
if (xavierOptions.xmla) {
  xmla = xavierOptions.xmla;
}
else {
  showAlert("Unexpected error", "Xmla object not available.");
  return;
}

var dnd = new DDHandler({
  node: body
});
SplitPane.listenToDnd(dnd);

/**
*   Toolbar
*/
var mainToolbar = null;

if (xavierOptions.createToolbar !== false) {
  mainToolbar = new Toolbar({
    container: body
  });
  /*
  mainToolbar.addButton([
    {"class": "refresh", tooltip: gMsg("Refresh metadata")},
    {"class": "separator"},
  ]);
  */
}
app.toolbar = mainToolbar;


/**
*   Init and manage visualizations
*/
var getVisualizationById = function(id){
  var visualizations = xavierOptions.visualizations;
  var n = visualizations.length, i, visualization;
  for (i = 0; i < n; i++) {
    visualization = visualizations[i];
    if (visualization.id !== id) {
      continue;
    }
    return visualization;
  }
  return null;
}
app.getVisualizationById = getVisualizationById;

function createVisualizationTab(conf){
  var id = conf.id;
  var visualization = getVisualizationById(id);
  if (!visualization) {
    console.log("Error: can't find visualization for button " + className);
    return;
  }
  var componentConstructor = visualization.componentConstructor;
  
  var tabConf = merge({
    tabPane: workArea
  }, conf, visualization.conf || {}, {
    generateTupleForSlicer: xavierOptions.generateTupleForSlicer || false,
    allowMultipleHierarchiesFromSameDimensionOnOneAxis: xavierOptions.allowMultipleHierarchiesFromSameDimensionOnOneAxis || false,
    clearVisualizationBeforeExecutingQuery: xavierOptions.clearVisualizationBeforeExecutingQuery || false
  });
  
  var vizualizationInstance = componentConstructor.newInstance(tabConf);
  var tab = workArea.newTab(vizualizationInstance);
  return tab;
}
app.createVisualizationTab = createVisualizationTab;

var autoRunEnabled = iDef(xavierOptions.autoRunEnabled) ? xavierOptions.autoRunEnabled : true;
/**
*   Create toolbar buttons for visualizations
*/
if (mainToolbar) {
  var buttonConf;
  //add buttons that control the treeview

  if (xavierOptions.showCatalogNodesToolbarButton === true) {
    buttonConf = {
      "class": "show-catalog-nodes",
      tooltip: gMsg("Show catalogs"),
      group: "tree-catalog",
      toggleGroup: "showCatalogs",
      depressed: !xavierOptions.catalogNodesInitiallyFlattened
    };
    mainToolbar.addButton(buttonConf);
    mainToolbar.listen({
      afterToggleGroupStateChanged: function(toolbar, event, data){
        var depressedButton = toolbar.getDepressedButtonInToggleGroup(data.group);
        switch (data.group) {
          case "showCatalogs":
            xmlaTreeView.showCatalogNodes(Boolean(depressedButton));
            break;
        }
      }
    });
  }
  
  if (xavierOptions.showDimensionNodesToolbarButton === true) {
    buttonConf = {
      "class": "show-dimension-nodes",
      tooltip: gMsg("Show dimensions"),
      group: "tree-cube",
      toggleGroup: "showDimensions",
      depressed: xavierOptions.initialDimensionsTreeNodeState !== TreeNode.states.flattened
    };
    mainToolbar.addButton(buttonConf);
    mainToolbar.listen({
      afterToggleGroupStateChanged: function(toolbar, event, data){
        var depressedButton = toolbar.getDepressedButtonInToggleGroup(data.group);
        switch (data.group) {
          case "showDimensions":
            xmlaTreeView.showDimensionNodes(Boolean(depressedButton));
            break;
        }
      }
    });
  }
  
  if (xavierOptions.showHierarchyNodesToolbarButton === true) {
    buttonConf = {
      "class": "show-hierarchy-nodes",
      tooltip: gMsg("Show hierarchies"),
      group: "tree-cube",
      toggleGroup: "showHierarchies",
      depressed: xavierOptions.initialHierarchyTreeNodeState !== TreeNode.states.flattened
    };
    mainToolbar.addButton(buttonConf);
    mainToolbar.listen({
      afterToggleGroupStateChanged: function(toolbar, event, data){
        var depressedButton = toolbar.getDepressedButtonInToggleGroup(data.group);
        switch (data.group) {
          case "showHierarchies":
            xmlaTreeView.showHierarchyNodes(Boolean(depressedButton));
            break;
        }
      }
    });
  }
  if (buttonConf) {
    mainToolbar.addButton({"class": "separator"});
    function displayTreeViewCubeButtonGroup(display){
      displayToolbarGroup("tree-cube", display);
    }
  }

  //add a button for each visualization
  var visualizationButtonClicked = function(){
    var buttonConf = this.conf;
    var className = buttonConf["class"];
    var id = className.substr("new-".length);
    createVisualizationTab({
      id: id
    });
  };
  var visualizations = xavierOptions.visualizations, n = visualizations.length, i, visualization, componentConstructor, buttonConf;
  for (i = 0; i < n; i++){
    visualization = visualizations[i];
    if (visualization.createToolbarButton === false) {
      continue;
    }
    buttonConf = {
      "class": "new-" + visualization.id,
      tooltip: gMsg(visualization.tooltip),
      group: "vis",
      buttonHandler: visualizationButtonClicked
    };
    mainToolbar.addButton(buttonConf);
  }

  /**
  *   Misc generic toolbarbuttons
  */
  mainToolbar.addButton([
    {"class": "separator"},
    {
      "class": "auto-run", 
      group: "visaction", 
      tooltip: gMsg("Toggle Autorun Query"), 
      toggleGroup: "auto-run", 
      depressed: autoRunEnabled
    }
/*    
    ,
    {"class": "run", group: "visaction", tooltip: gMsg("Run Query")},
    {"class": "separator"},
    {"class": "excel", group: "visaction", tooltip: gMsg("Export to Microsoft Excel")},
    {"class": "separator"},
    {"class": "clear", group: "visaction", tooltip: gMsg("Discard this query and start over")}
*/
    
  ]);

  mainToolbar.listen({
    buttonPressed: function(toolbar, event, button){
      var conf = button.conf;
      if (iFun(conf.buttonHandler)) {
        conf.buttonHandler.call(button);
      }
      else {
        var className = conf["class"];
        switch (className) {
          case "run":
            workArea.executeQuery();
            break;
          case "clear":
            workArea.clear();
            break
          case "excel":
            workArea.exportToExcel();
            break
          default:
            throw "Not implemented";
        }
      }
    },
    afterToggleGroupStateChanged: function(toolbar, event, data){
      var depressedButton = toolbar.getDepressedButtonInToggleGroup(data.group);
      switch (data.group) {
        case "auto-run":
          toggleAutoRunEnabled();
          break;
      }
    }
  });
}

function getAutoRunEnabled(){
  return autoRunEnabled;
}

function toggleAutoRunEnabled() {
  var setting = getAutoRunEnabled();
  autoRunEnabled = !setting;
  if (mainToolbar) {
    mainToolbar.displayButton("run", !autoRunEnabled);
  }
  workArea.setAutoRunEnabled(autoRunEnabled);
}

/**
*   TreeView
*/
function getXmlaTreeOption(name){
  var option = xavierOptions[name];
  return iDef(option) ? option : XmlaTreeView.prototype[name];
}

var xmlaTreeView = new XmlaTreeView({
  xmla: xmla,
  xmlaMetadataFilter: xmlaMetadataFilter,
  metadataRestrictions: xavierOptions.metadataRestrictions,
  datasourceNodesInitiallyFlattened: getXmlaTreeOption("datasourceNodesInitiallyFlattened"),
  catalogNodesInitiallyFlattened: getXmlaTreeOption("catalogNodesInitiallyFlattened"),
  showCatalogNodesCheckboxDisplayed: getXmlaTreeOption("showCatalogNodesCheckboxDisplayed"),
  useCatalogPrefixForCubes: getXmlaTreeOption("useCatalogPrefixForCubes"),
  useDimensionPrefixForHierarchies: getXmlaTreeOption("useDimensionPrefixForHierarchies"),
  useHierarchyPrefixForLevels: getXmlaTreeOption("useHierarchyPrefixForLevels"),
  showCurrentCatalog: getXmlaTreeOption("showCurrentCatalog"),
  showCurrentCube: getXmlaTreeOption("showCurrentCube"),
  dimensionNodesInitiallyFlattened: getXmlaTreeOption("dimensionNodesInitiallyFlattened"),
  renderPropertyNodes: getXmlaTreeOption("renderPropertyNodes"),
  showDimensionNodesCheckboxDisplayed: getXmlaTreeOption("showDimensionNodesCheckboxDisplayed"),
  showHierarchyNodesCheckboxDisplayed: getXmlaTreeOption("showHierarchyNodesCheckboxDisplayed"),
  maxLowCardinalityLevelMembers: getXmlaTreeOption("maxLowCardinalityLevelMembers"),
  levelMembersDiscoveryMethod: getXmlaTreeOption("levelMembersDiscoveryMethod"),
  defaultMemberDiscoveryMethod: getXmlaTreeOption("defaultMemberDiscoveryMethod"),
  initialMeasuresTreeNodeState: getXmlaTreeOption("initialMeasuresTreeNodeState"),
  initialDimensionsTreeNodeState: getXmlaTreeOption("initialDimensionsTreeNodeState"),
  initialHierarchyTreeNodeState: (
    iDef(xavierOptions.initialHierarchyTreeNodeState) ? xavierOptions.initialHierarchyTreeNodeState : (
      getXmlaTreeOption("loadLevelsImmediately") ? TreeNode.states.expanded : TreeNode.states.collapsed
    )
  ),
  loadLevelsImmediately: (
    //if loadLevelsImmediately is explicitly specified, go with that setting.
    iDef(xavierOptions.loadLevelsImmediately) ? xavierOptions.loadLevelsImmediately : (
      //if loadLevelsImmediately is not explicitly specified then try to do something sensible based on initialHierarchyTreeNodeState
      (xavierOptions.initialHierarchyTreeNodeState || XmlaTreeView.prototype.initialHierarchyTreeNodeState) === TreeNode.states.collaped ? false : true
    )
  ),
  levelCardinalitiesDiscoveryMethod: getXmlaTreeOption("levelCardinalitiesDiscoveryMethod"),
  urlRegExp: getXmlaTreeOption("urlRegExp"),
  checkIfDescriptionIsAnUrl: getXmlaTreeOption("checkIfDescriptionIsAnUrl"),
  useDescriptionAsCubeCaption: getXmlaTreeOption("useDescriptionAsCubeCaption"),
  useAsDatasourceCaption: getXmlaTreeOption("useAsDatasourceCaption"),
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
      if (error.getStackTrace) {
        console.error(error.getStackTrace());
      }
    },
    loadCube: function(xmlaTreeView, event, cubeTreeNode){
      displayToolbarButtonGroupsForCube(false);
    },
    cubeLoaded: function(xmlaTreeView, event){
      displayToolbarButtonGroupsForCube(true);

      var currentCube = xmlaTreeView.getCurrentCube();
      workArea.setCube(currentCube);

      //see if we have to switch tab (selected tab must belong to current cube, or welcome tab)
      var selectedTab = workArea.getSelectedTab(), needToSwitch = false;
      if (selectedTab) {
        //if the currently selected tab is the sort that is bound to a cube
        if (selectedTab.forCube === true) {
          //and if the currently selected tab is not bound to the current cube
          if (!selectedTab.isForCube(currentCube)) {
            //and if the query in the current tab is already populated
            if (selectedTab.getQueryDesigner().isPopulated()) {
              //then we need to switch tabs.
              needToSwitch = true;
            }
            else {
              //if the query is not yet populated, then simply bind the tab to the current cube.
              selectedTab.initMetadata();
            }
          }
        }
        else {
          needToSwitch = true;
        }
      }
      else {
        needToSwitch = true;
      }

      //if we need to switch tabs, then find the best option.
      if (needToSwitch === true) {
        var newTabToSelect;
        //see if there are already tabs for the current cube
        var tabsForThisCube = workArea.getTabsForCube(currentCube);
        if (tabsForThisCube.length) {  
          //we have at least one tab for this cube, so select it.
          newTabToSelect = tabsForThisCube[0];
        }
        else {  
          //we don't have any tabs for this cube
          if (xavierOptions.autoCreateVisualization) {
            //we should auto create as per configuration
            newTabToSelect = createVisualizationTab(xavierOptions.autoCreateVisualization);
          }
          else
          if (selectedTab.forCube === true) {
            //only if the currently selected tab is the sort that is bound to a cube do we need to switch.
            newTabToSelect = workArea.getWelcomeTab();
          }
        }        
        
        //if we found a new tab to select, select it.
        if (newTabToSelect) {
          workArea.setSelectedTab(newTabToSelect);
        }
      } 
      
    },
    //called when an information icon is clicked.
    requestinfo: function(xmlaTreeView, event, data){
      workArea.newInfoTab(data);
    },
    nodeDoubleClicked: function(xmlaTreeView, event, data){
      var queryDesigner = workArea.getQueryDesigner();
      if (!queryDesigner) {
        return;
      }
      var treeNode = data.treeNode;
      var dragInfo = xmlaTreeView.checkStartDrag(treeNode);
      if (!dragInfo) {
        return;
      }
      var dropTarget = queryDesigner.findDropTarget(dragInfo);
      if (!dropTarget) {
        xmlaTreeView.notifyEndDrag(null, null);
        return;
      }
      dropTarget.axis.itemDropped(
        dropTarget.target,
        dragInfo
      );
      xmlaTreeView.notifyEndDrag(null, null);
    }
  }
});
app.xmlaTreeView = xmlaTreeView;

/**
*   Tabs (Workarea)
*/
var workArea = new XavierTabPane({
  tabs: xavierOptions.showWelcomeTab === false ? [] : undefined,
  dnd: dnd,
  xmla: xmla,
  xmlaTreeView: xmlaTreeView,
  xmlaMetadataFilter: xmlaMetadataFilter,
  autorun: getAutoRunEnabled(),
  listeners: {
    tabClosed: function(tabPane, event, data){
      if (tabPane.getSelectedTab() !== null) {
        return;
      }
      displayVisualizationActionsGroup(false);
    },
    tabSelected: function(tabPane, event, data){
      var tab = tabPane.getTab(data.newTab);

      var display = tab ? Boolean(tab.getVisualizer()) : false;
      displayVisualizationActionsGroup(display);

      tab.doLayout();

      //check if we have to select another cube in the treeview.
      if (tab.isForCube()) {
        var currentCube = xmlaTreeView.getCurrentCube();
        if (!tab.isForCube(currentCube)) {
          currentCube = tab.getMetadata();
          xmlaTreeView.loadCube(currentCube);
        }
      }
    }
  }
});
app.workArea = workArea;

/**
*   Main layout
*/
var mainSplitPane = new SplitPane({
  container: body,
  classes: ["mainsplitpane"],
  firstComponent: xmlaTreeView,
  secondComponent: workArea,
  orientation: SplitPane.orientations.vertical,
  style: {
    top: (mainToolbar ? 32 : 0) + "px"
  }
});
app.mainSplitPane = mainSplitPane;

mainSplitPane.listen("splitterPositionChanged", function(mainSplitPane, event, data){
  //tell the workArea to redo layout since its size has just changed.
  workArea.doLayout();
});

//force rendering
mainSplitPane.getDom();

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
      else
      if (queryDesignerAxis.canDropItem(target, dragInfo)) {
        dragFromAxisToOtherAxis(dragInfo, queryDesigner, queryDesignerAxis, target);
      }
    }
    else {
      dropOutsideAxis(dragInfo);
    }
  }
}

function dragWithinAxis(dragInfo, queryDesignerAxis, target){
  //drag and drop within same axis.
  if (dragInfo.isSortOption) {
    return;
  }
  switch (dragInfo.className){
    case "hierarchy":
    case "measures":
      var hierarchyIndex = queryDesignerAxis.getHierarchyIndexForTd(target);
      queryDesignerAxis.moveHierarchy(
        dragInfo.metadata,
        hierarchyIndex
      );
      break;
    case "member":
    case "member-drilldown":
    case "measure":
    case "level":
    case "property":
      queryDesignerAxis.moveMember(dragInfo.metadata, dragInfo.className, queryDesignerAxis.getMemberIndexForSpan(target));
      break;
  }
}

function dragFromAxisToOtherAxis(dragInfo, queryDesigner, queryDesignerAxis, target){
  //drag from and drop on another axis.
  switch (dragInfo.className) {
    case "hierarchy":
    case "measures":
      var hierarchyIndex = queryDesignerAxis.getHierarchyIndexForTd(target);
      queryDesigner.moveHierarchy(
        dragInfo.metadata,
        dragInfo.queryDesignerAxis,
        queryDesignerAxis,
        hierarchyIndex + 1
      );
      break;
    default:
      if (dragInfo.metadata === "query-designer-axis-header") {
        queryDesigner.swapContentOfAxes(dragInfo.queryDesignerAxis, queryDesignerAxis);
      }
  }
}

function dropOutsideAxis(dragInfo){
  //drop outside axis: remove the object.
  var queryDesignerAxis = dragInfo.queryDesignerAxis;
  switch (dragInfo.className) {
    case "hierarchy":
    case "measures":
      queryDesignerAxis.removeHierarchy(dragInfo.metadata);
      break;
    case "member":
    case "member-drilldown":
    case "measure":
    case "derived-measure":
    case "level":
    case "property":
      if (dragInfo.isSortOption) {
        queryDesignerAxis.setSortOption(null);
      }
      else {
        queryDesignerAxis.removeMember(dragInfo.metadata, dragInfo.className);
      }
      break;
    default:
      if (dragInfo.metadata === "query-designer-axis-header"){
        //an entire axis was dragged out.
        queryDesignerAxis.clear();
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
*   Resize window stuff
*/
var resizeEvent = {
  factor: .33
};
function windowResized(){
  if (resizeEvent === null) {
    return;
  }
  xmlaTreeView.getSplitPane().setSplitterPosition((100 * resizeEvent.treeSplitPaneFactor) + "%");
  mainSplitPane.setSplitterPosition((100 * resizeEvent.mainSplitPaneFactor) + "%");
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
      treeSplitPaneFactor: xmlaTreeView.getSplitPane().getSplitterRatio(),
      mainSplitPaneFactor: mainSplitPane.getSplitterRatio()
    };
  }
  resizeTimer.start();
});


function displayToolbarGroup(group, display){
  if (!mainToolbar) {
    return;
  }
  var groups = mainToolbar.groups, group = groups[group];
  if (!group) {
    return;
  }
  mainToolbar.displayGroup(group.name, display);  
}

function displayVisualizationsGroup(display){
  displayToolbarGroup("vis", display);
}

function displayVisualizationActionsGroup(display){
  displayToolbarGroup("visaction", display);
}

function displayToolbarButtonGroupsForCube(display){
  if(mainToolbar) {
    displayVisualizationsGroup(display);
    if (displayTreeViewCubeButtonGroup){
      displayTreeViewCubeButtonGroup(display);
    }
  }
}
/**
 * Init:
 */
xmlaTreeView.init();

displayToolbarButtonGroupsForCube(false);
displayVisualizationActionsGroup(false);

//toggleAutoRunEnabled();

linkCss(cssDir + "xavier.css");
var stylesheets = xavierOptions.stylesheets;
if (stylesheets){
  if (iStr(stylesheets)){
    stylesheets = [stylesheets];
  }
  var i = 0, n = stylesheets.length, stylesheet;
  for (i = 0; i < n; i++) {
    stylesheet = stylesheets[i];
    try {
      linkCss(stylesheet);
    }
    catch (e) {
      console.error("Error loading stylesheet " + stylesheet + ". " + e);
    }
  }
}

return this;
}
adopt(XavierApplication, Observable);

