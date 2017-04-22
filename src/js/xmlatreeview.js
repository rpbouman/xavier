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
var XmlaTreeView;
(function(){

(XmlaTreeView = function(conf){
  this.xmla = conf.xmla;
  this.schemaTreePane = new ContentPane({
    classes: ["tree", "schemas"]
  });
  this.cubeTreePane = new ContentPane({
    classes: ["tree", "cube-contents"]
  });
  var splitterRatio;
  this.splitPane = new SplitPane({
    classes: "xmlatreeview",
    firstComponent: this.schemaTreePane,
    secondComponent: this.cubeTreePane,
    orientation: SplitPane.orientations.horizontal,
    listeners: {
      beforeSplitterPositionChange: function(){
        var measuresAndDimensionsSplitPane = this.getMeasuresAndDimensionsSplitPane();
        if (!measuresAndDimensionsSplitPane) {
          return;
        }
        var splitterRatio = measuresAndDimensionsSplitPane.getSplitterRatio();
      },
      splitterPositionChanged: function(){
        var measuresAndDimensionsSplitPane = this.getMeasuresAndDimensionsSplitPane();
        if (!measuresAndDimensionsSplitPane) {
          return;
        }
        measuresAndDimensionsSplitPane.setSplitterPosition((100 * splitterRatio) + "%");
      },
      scope: this
    }
  });
  if (iDef(conf.datasourceNodesInitiallyFlattened)) {
    this.datasourceNodesInitiallyFlattened = conf.datasourceNodesInitiallyFlattened;
  }
  if (iDef(conf.catalogNodesInitiallyFlattened)) {
    this.catalogNodesInitiallyFlattened = conf.catalogNodesInitiallyFlattened;
  }
  if (iDef(conf.showCatalogNodesCheckboxDisplayed)) {
    this.showCatalogNodesCheckboxDisplayed = conf.showCatalogNodesCheckboxDisplayed;
  }
  
  if (iDef(conf.initialMeasuresTreeNodeState)){
    this.initialMeasuresTreeNodeState = conf.initialMeasuresTreeNodeState;
  }
  if (iDef(conf.initialDimensionsTreeNodeState)){
    this.initialDimensionsTreeNodeState = conf.initialDimensionsTreeNodeState;
  }
  if (iDef(conf.initialHierarchyTreeNodeState)){
    this.initialHierarchyTreeNodeState = conf.initialHierarchyTreeNodeState;
  }
  if (iDef(conf.loadLevelsImmediately)){
    this.loadLevelsImmediately = conf.loadLevelsImmediately;
  }

  if (iDef(conf.useCatalogPrefixForCubes)) {
    this.useCatalogPrefixForCubes = conf.useCatalogPrefixForCubes;
  }
  
  if (iDef(conf.useDimensionPrefixForHierarchies)) {
    this.useDimensionPrefixForHierarchies = conf.useDimensionPrefixForHierarchies;
  }

  if (iDef(conf.useHierarchyPrefixForLevels)) {
    this.useHierarchyPrefixForLevels = conf.useHierarchyPrefixForLevels;
  }  
  
  if (iDef(conf.showCurrentCube)) {
    this.showCurrentCube = conf.showCurrentCube;
  }
  if (iDef(conf.showCurrentCatalog)) {
    this.showCurrentCatalog = conf.showCurrentCatalog;
  }

  if (iDef(conf.dimensionNodesInitiallyFlattened)) {
    this.dimensionNodesInitiallyFlattened = conf.dimensionNodesInitiallyFlattened;
  }
  if (iDef(conf.showDimensionNodesCheckboxDisplayed)) {
    this.showDimensionNodesCheckboxDisplayed = conf.showDimensionNodesCheckboxDisplayed;
  }
  if (iDef(conf.showHierarchyNodesCheckboxDisplayed)) {
    this.showHierarchyNodesCheckboxDisplayed = conf.showHierarchyNodesCheckboxDisplayed;
  }

  if (iDef(conf.xmlaMetadataFilter)) {
    this.xmlaMetadataFilter = conf.xmlaMetadataFilter;
  }
  if (iDef(conf.maxLowCardinalityLevelMembers)) {
    this.maxLowCardinalityLevelMembers = conf.maxLowCardinalityLevelMembers;
  }
  if (iDef(conf.metadataRestrictions)) {
    this.metadataRestrictions = conf.metadataRestrictions;
  }
  if (iDef(conf.defaultMemberDiscoveryMethod)) {
    this.defaultMemberDiscoveryMethod = conf.defaultMemberDiscoveryMethod;
  }
  if (iDef(conf.levelMembersDiscoveryMethod)) {
    this.levelMembersDiscoveryMethod = conf.levelMembersDiscoveryMethod;
  }
  if (iDef(conf.levelCardinalitiesDiscoveryMethod)) {
    this.levelCardinalitiesDiscoveryMethod = conf.levelCardinalitiesDiscoveryMethod;
  }
  if (iDef(conf.useDescriptionAsCubeCaption)) {
    this.useDescriptionAsCubeCaption = conf.useDescriptionAsCubeCaption;
  }
  if (iDef(conf.useAsDatasourceCaption)) {
    this.useAsDatasourceCaption = conf.useAsDatasourceCaption;
  }
  if (iDef(conf.renderPropertyNodes)) {
    this.renderPropertyNodes = conf.renderPropertyNodes;
  }
  if (iRxp(conf.urlRegExp)){
    this.urlRegExp = conf.urlRegExp;
  }
  if (iFun(conf.checkIfDescriptionIsAnUrl)){
    this.checkIfDescriptionIsAnUrl = conf.checkIfDescriptionIsAnUrl;
  }
  if (iDef(conf.splitterBetweenMeasuresAndDimensions)) {
    this.splitterBetweenMeasuresAndDimensions = conf.splitterBetweenMeasuresAndDimensions;
  }
  arguments.callee._super.apply(this, arguments);
}).prototype = {
  //urlRegExp is checked against descriptions of discovered metadata. If there is a match, we consider it a url and the tree will render in info icon that an be used to link to the resource.
  urlRegExp: /^((https?:\/\/)?(((\w+)(\.[\w]+)*|(\d{1,3})(\.\d{1,3}){3})(:\d+)?)\/)?(([\w\.]|%\d\d)+\/)*(([\w\.]|%\d\d)+\.\w+)(\?([\w\.=\&]|%\d\d)*)?(#\w*)?$/,
  //loadLevelsImmediately determines whether levels should be immediately discovered after loading a cube.
  //if false, initial loading stops after the hierarchies are discovered, and levels are lazily loaded by expanding a hierarchy node.
  //if true, then levels are loaded immediately after loading the hierarchy nodes.
  loadLevelsImmediately: false,
  //initialMeasuresTreeNodeState: Initial state of dimensions Treenode: "collapsed", "expanded", "flattened", "unflattened", "leaf"
  initialMeasuresTreeNodeState: TreeNode.states.expanded,
  //initialDimensionsTreeNodeState: Initial state of dimensions Treenode: "collapsed", "expanded", "flattened", "unflattened", "leaf"
  initialDimensionsTreeNodeState: TreeNode.states.expanded,
  //initialHierarchyTreeNodeState: Initial state of hierarchy Treenodes: "collapsed", "expanded", "flattened", "unflattened", "leaf"
  initialHierarchyTreeNodeState: TreeNode.states.collapsed,
  //levelCardinalitiesDiscoveryMethod determines how cardinalities of levels are discovered.
  //levelCardinalitiesDiscoveryMethod: Xmla.METHOD_DISCOVER, //get level cardinality estimates from level discovery requests
  //levelCardinalitiesDiscoveryMethod: Xmla.METHOD_EXECUTE,  //get exact level cardinalities by running mdx query.
  levelCardinalitiesDiscoveryMethod: Xmla.METHOD_DISCOVER,
  //how to retrieve captions for default members of hierarchies.
  //options are
  //- "Discover" (Xmla.METHOD_DISCOVER) - get them one by one, requiring a discover request for each hierarchy. Slow but correct.
  //- "Execute" (Xmla.METHOD_EXECUTE) - get all members in a single MDX request. should be quicker than Discover, but less correct
  //- anything else (false) - don't get default members. This means users can't drag entire hierarchies into their query.
  defaultMemberDiscoveryMethod: Xmla.METHOD_DISCOVER,
  //levelMembersDiscoveryMethod: how to find the members of levels.
  //- "Discover" (Xmla.METHOD_DISCOVER) - use a MDSCHEMA_MEMBERS discover request.
  //- "Execute" (Xmla.METHOD_EXECUTE) - ask for LEVEL.members to find the members. 
  //main reason to make this configurable is that there may be performance differences between providers. 
  //also, the MDX versio gives more flexibility to filter members (should I ever implement a filter)
  //Finally, SAP HANA sometimes needs input parameters, and while these can be passed to MDX statements, 
  //we know not of any way to push input params into discover requests.
  levelMembersDiscoveryMethod: Xmla.METHOD_DISCOVER,
  //maximum number of members to allow auto-loading of a level's members
  maxLowCardinalityLevelMembers: 10,
  //whether datasource nodes should initially be hidden
  datasourceNodesInitiallyFlattened: true,
  //whether catalog nodes should initially be hidden
  catalogNodesInitiallyFlattened: true,
  //whether or not display of flattened catalog nodes can be toggled by the user.
  showCatalogNodesCheckboxDisplayed: false,
  //whether or not display of flattened hierarchy nodes can be toggled by the user.
  showHierarchyNodesCheckboxDisplayed: false,
  //whether or not display of flattened dimension nodes can be toggled by the user.
  showDimensionNodesCheckboxDisplayed: false,
  //whether labels of cube nodes are prefixed by catalog name. Prefix only shown if the catalog node is flattened. This option can be used to suppress the prefix alltogether.
  useCatalogPrefixForCubes: true,
  //whether labels of hierarchy nodes are prefixed by dimension caption. Prefix only shown if the dimension node is flattened. This option can be used to suppress the prefix alltogether.
  useDimensionPrefixForHierarchies: true,
  //whether labels of level nodes are prefixed by hierarchy caption. Prefix only shown if the hierarchy node is flattened.
  useHierarchyPrefixForLevels: true,
  //whether or not to display the current catalog in the cube pane.
  showCurrentCatalog: false,
  //whether or not to display the current cube in the cube pane.
  showCurrentCube: false,
  //whether dimension nodes should initially be hidden
  dimensionNodesInitiallyFlattened: true,
  //whether to use DESCRIPTION rather than CUBE_CAPTION for cube captions. (SAP/HANA does not have CUBE_CAPTION, but DESCRIPTION often contains the friendly name)
  useDescriptionAsCubeCaption: false,
  //which field to use as caption for datasource nodes.
  useAsDatasourceCaption: ["DataSourceName", "DataSourceDescription"],
  //whether to render property nodes.
  renderPropertyNodes: true,
  //splitterBetweenMeasuresAndDimensions: divide the cube pane with a horizontal splitter into a measures and a dimensions section.
  splitterBetweenMeasuresAndDimensions: true,
  checkIsExcluded: function(request, row){
    var xmlaMetadataFilter = this.xmlaMetadataFilter;
    if (!xmlaMetadataFilter) {
      return true;
    }
    var datasource = request.properties.DataSourceInfo;
    var type = request.requestType;
    var excluded = xmlaMetadataFilter.isExcluded(datasource, type, row);
    return excluded;
  },
  clearTreePane: function(treePane){
    var treePaneDom = treePane.getDom();
    var childNodes = treePaneDom.childNodes, n = childNodes.length, i, childNode, treeNode;
    for (i = 0; i < n; i++){
      childNode = childNodes[i];
      if (!hCls(childNode, TreeNode.prefix)){
        continue;
      }
      treeNode = TreeNode.getInstance(childNode.id);
      treeNode.removeFromParent();
    }
    treePane.clearAll();
  },
  clearSchemaTreePane: function(){
    this.clearTreePane(this.getSchemaTreePane());
  },
  clearCubeTreePane: function(){
    var cubeTreePane = this.getCubeTreePane();
    if (this.measuresAndDimensionsSplitPane) {
      var measuresNode = this.getMeasuresTreeNode();
      measuresNode.removeFromParent(false);
      var dimensionsNode = this.getDimensionsTreeNode();
      dimensionsNode.removeFromParent(false);
      this.measuresAndDimensionsSplitPane = null;
    }
    else {
      this.clearTreePane(cubeTreePane);
    }
    cubeTreePane.clearAll();
  },
  checkIfDescriptionIsAnUrl: function(description){
    var urlRegExp = this.urlRegExp;
    urlRegExp.lastIndex = 0;
    var match = urlRegExp.test(description);
    return match;
  },
  getDescriptionContentType: function(description){
    description = description.trim();
    var type;
    var len = description.length;
    if (this.checkIfDescriptionIsAnUrl(description)) {
      type = "url";
    }
    else
    if (description.indexOf("<") === 0 && description.indexOf(len-1) === ">") {
      type = "xml";
    }
    else
    if (description === "") {
      type = "empty";
    }
    else {
      type = "text";
    }
    return type;
  },
  createNodeTooltipAndInfoLabel: function(description){
    var tooltip = "", infoLabel = "";
    if (description) {
      var type = this.getDescriptionContentType(description);
      switch (type) {
        case "url":
          tooltip = gMsg("Click on the information icon for a description.");
          infoLabel = "<span class=\"info-icon\" data-url=\"" + description + "\"/>"
          break;
        case "xml":
        case "text":
          tooltip = description;
          infoLabel = "";
          break;
        case "empty":
        default:
          break;
      }
    }
    return {
      tooltip: tooltip,
      infoLabel: infoLabel
    };
  },
  hideProgressIndicator: function(){
    aCls(this.progressIndicator, "treepane-hidden");
  },
  showProgressIndicator: function(){
    rCls(this.progressIndicator, "treepane-hidden", "");
  },
  createProgressIndicator: function(){
    var schemaTreePane = this.schemaTreePane;
    var schemaTreePaneDom = schemaTreePane.getDom();
    var progressIndicator = cEl("DIV", {
      "class": "progress-indicator"
    });
    var dom = schemaTreePaneDom.parentNode;
    dom.insertBefore(progressIndicator, schemaTreePaneDom);
    this.progressIndicator = progressIndicator;
  },
  indicateProgress: function(text){
    this.progressIndicator.innerHTML = text;
  },
  hideTreePane: function(treePane) {
    var dom = treePane.getDom();
    rCls(dom, "treepane-fade-in", "");
    aCls(dom, "treepane-hidden");
  },
  fadeInTreePane: function(treePane) {
    rCls(treePane.getDom(), "treepane-hidden", "treepane-fade-in");
  },
  hideSchemaTreePane: function(){
    this.hideTreePane(this.schemaTreePane);
  },
  fadeInSchemaTreePane: function(){
    this.fadeInTreePane(this.schemaTreePane);
  },
  hideCubeTreePane: function(){
    this.hideTreePane(this.cubeTreePane);
  },
  fadeInCubeTreePane: function(){
    this.fadeInTreePane(this.cubeTreePane);
  },
  processProviderNodeQueue: function(providerNodeQueue){
    if (!(++providerNodeQueue.index < providerNodeQueue.length)) {
      return false;
    }
    var providerNode = providerNodeQueue[providerNodeQueue.index];
    var conf = providerNode.conf;
    var metadata = conf.metadata;
    var me = this;
    this.indicateProgress(gMsg("Loading catalogs for datasource ${1}", conf.title));
    var xmla = this.xmla;

    var catalogRestrictions = metadata.catalogRestrictions;
    if (!catalogRestrictions) {
      catalogRestrictions = [{}];
    }
    catalogRestrictions.index = -1;

    var options = {
      url: metadata.URL,
      properties: {
        DataSourceInfo: metadata.DataSourceInfo
      },
      error: function(xmla, options, error){
        me.fireEvent("error", error);
      },
      success: function(xmla, options, rowset){
        rowset.eachRow(function(row){
          if (me.checkIsExcluded(options, row)) {
            return;
          }
          var tooltipAndInfoLabel = me.createNodeTooltipAndInfoLabel(row.DESCRIPTION);
          var state = TreeNode.states.expanded;
          var objectName = row.CATALOG_NAME;
          var treeNode = new TreeNode({
            classes: "catalog",
            state: state,
            id: conf.id + ":catalog:" + row.CATALOG_NAME,
            parentTreeNode: providerNode,
            objectName: objectName,
            title: objectName + tooltipAndInfoLabel.infoLabel,
//            tooltip: tooltipAndInfoLabel.tooltip || objectName,
            metadata: row,
            cubeRestrictions: options.cubeRestrictions
          });
          providerNodeQueue.catalogNodeQueue.push(treeNode);
        });
        if (me.processProviderNodeQueue(providerNodeQueue) === false) {
          doCatalogs(catalogRestrictions)
        }
      }
    };

    var doCatalogs = function(catalogRestrictions){
      if (!(++catalogRestrictions.index < catalogRestrictions.length)) {
        if (!me.processProviderNodeQueue(providerNodeQueue)){
          me.processCatalogNodeQueue(providerNodeQueue.catalogNodeQueue);
          return false;
        }
      }
      var catalogRestriction = catalogRestrictions[catalogRestrictions.index] || {};
      options.restrictions = catalogRestriction.restriction;
      options.cubeRestrictions = catalogRestriction.cubes;
      xmla.discoverDBCatalogs(options);
    };

    doCatalogs(catalogRestrictions);
  },
  initDone: function(){
    this.fireEvent("done");
    this.hideProgressIndicator();
    if (this.autoSelectCube) {
      this.loadCube(this.autoSelectCube);
    }
    else {
      this.fadeInSchemaTreePane();
    }
  },
  getCubeCaption: function(cube) {
    var objectName;
    if (this.useDescriptionAsCubeCaption){
      objectName = cube.DESCRIPTION || cube.CUBE_NAME;
    }
    else {
      objectName = cube.CUBE_CAPTION || cube.CUBE_NAME;
    }
    return objectName;
  },
  processCatalogNodeQueue: function(catalogNodeQueue){
    var me = this;
    if (!(++catalogNodeQueue.index < catalogNodeQueue.length)) {
      this.initDone();
      return false;
    }
    var catalogNode = catalogNodeQueue[catalogNodeQueue.index];
    var providerNode = catalogNode.getParentTreeNode();
    var conf = catalogNode.conf;
    this.indicateProgress(gMsg("Loading cubes for catalog ${1}", conf.title));
    var catalog = conf.metadata.CATALOG_NAME;
    var metadata = providerNode.conf.metadata;

    var cubeRestrictions = conf.cubeRestrictions;
    if (!cubeRestrictions) {
      cubeRestrictions = [];
    }
    if (cubeRestrictions.length === 0) {
      cubeRestrictions.push({});
    }
    cubeRestrictions.index = -1;

    var options = {
      url: metadata.URL,
      properties: {
        DataSourceInfo: metadata.DataSourceInfo,
        Catalog: catalog
      },
      error: function(xmla, options, error){
        me.fireEvent("error", error);
      },
      success: function(xmla, options, rowset){
        var count = 0;
        rowset.eachRow(function(row){
          if (me.checkIsExcluded(options, row)) {
            return;
          }
          var objectName = me.getCubeCaption(row);
          var title = objectName;
          var catalogPrefix;
          if (me.useCatalogPrefixForCubes) {
            catalogPrefix = "<span class=\"label label-prefix\">" + catalog + "</span>";
          }
          else {
            catalogPrefix = "";
          }
          var tooltipAndInfoLabel = me.createNodeTooltipAndInfoLabel(row.DESCRIPTION);
          title = catalogPrefix + title + tooltipAndInfoLabel.infoLabel;
          var tooltip = tooltipAndInfoLabel.tooltip || row.CUBE_NAME;
          var treeNode = new TreeNode({
            classes: "cube",
            state: TreeNode.states.leaf,
            id: conf.id + ":cube:" + row.CUBE_NAME,
            objectName: objectName,
            parentTreeNode: catalogNode,
            title: title,
//            tooltip: tooltip,
            metadata: row,
            cubeMetaData: options.cubeMetaData
          });
          if (options.autoSelectCube === true && !me.autoSelectCube) {
            me.autoSelectCube = treeNode;
          }
          count++;
        });
        if (!me.getShowCatalogNodesCheckbox().checked) {
          catalogNode.setState(TreeNode.states.flattened);
        }
        if (count > 1) {
          catalogNode.getDom().className += " multiple";
        }
        doCubes(cubeRestrictions);
      }
    };

    var xmla = this.xmla;
    var doCubes = function(cubeRestrictions){
      if (!(++cubeRestrictions.index < cubeRestrictions.length)) {
        if (!me.processCatalogNodeQueue(catalogNodeQueue)){
          return false;
        }
      }
      var cubeRestriction = cubeRestrictions[cubeRestrictions.index] || {};
      options.restrictions = cubeRestriction.restriction;
      options.autoSelectCube = cubeRestriction.autoSelect;
      options.cubeMetaData = cubeRestriction.metadata;
      xmla.discoverMDCubes(options);
    };

    doCubes(cubeRestrictions);
  },
  initCatalogNodesCheckbox: function(){
    var showCatalogNodesCheckbox = cEl("INPUT", {
      type: "checkbox"
    });
    showCatalogNodesCheckbox.checked = !this.catalogNodesInitiallyFlattened;
    listen(showCatalogNodesCheckbox, "click", this.showCatalogNodes, this);
    this.showCatalogNodesCheckbox = showCatalogNodesCheckbox;

    var schemaTreePaneDom = this.schemaTreePane.getDom();
    cEl("DIV", {
      "class": "show-catalog-nodes" + (this.showCatalogNodesCheckboxDisplayed === false ? " hidden" : "")
    }, [
      showCatalogNodesCheckbox,
      cEl("SPAN", {
      }, gMsg("Show catalog nodes")) /*,
      cEl("DIV", {
        "class": "tooltip"
      }, gMsg("Check the box to display catalog nodes in the treeview. Uncheck to hide.")) */
    ], schemaTreePaneDom);
  },
  getShowCatalogNodesCheckbox: function(){
    return this.showCatalogNodesCheckbox;
  },
  initSchemaTreeListeners: function() {
    var schemaTreePaneDom = this.schemaTreePane.getDom();

    this.schemaTreeListener = new TreeListener({container: schemaTreePaneDom});
    this.cubeSelection = new TreeSelection({treeListener: this.schemaTreeListener});

    this.cubeSelection.listen({
      scope: this,
      beforeChangeSelection: function(cubeSelection, event, data){
        var d = data.data;
        var event = d.event;
        var target = event.getTarget();
        var ret;
        if (hCls(target, "info-icon")){
          var url = gAtt(target, "data-url");
          this.fireEvent("requestinfo", {
            title: d.treeNode.conf.objectName,
            url: url,
          });
          ret = false;
        }
        else {
          var selection = data.newSelection[0];
          switch (selection.conf.classes) {
            case "cube":
              if (this.fireEvent("beforeLoadCube", selection) === false) {
                ret = false;
              }
              else {
                ret = true;
              }
              break;
            default:
              ret = true;
          }
        }
        return ret;
      },
      selectionChanged: function(cubeSelection, event, data){
        if (!data.newSelection || !data.newSelection.length) {
          return;
        }
        var selection = data.newSelection[0];
        switch (selection.conf.classes) {
          case "cube":
            this.loadCube(selection);
            break;
          default:
        }
      }
    });
  },
  initCubeTreeListeners: function() {
    var doInfoRequest = function(target, data) {
      var url = gAtt(target, "data-url");
      this.fireEvent("requestinfo", {
        title: data.treeNode.conf.objectName,
        url: url,
      });
    };

    var cubeTreePaneDom = this.cubeTreePane.getDom();
    this.cubeTreeListener = new TreeListener({
      container: cubeTreePaneDom,
      listeners: {
        nodeClicked: function(treeListener, event, d){
          var target = d.event.getTarget();
          if (hCls(target, "info-icon")) {
            doInfoRequest.call(this, target, d);
          }
        },
        nodeDoubleClicked: function(treeListener, event, d){
          var target = d.event.getTarget();
          if (hCls(target, "info-icon")) {
            doInfoRequest.call(this, target, d);
          }
          else
          if (hCls(target, "label")) {
            this.fireEvent("nodeDoubleClicked", {
              treeNode: d.treeNode
            });
          }
        },
        scope: this
      }
    });
  },
  initListeners: function(){
    this.initSchemaTreeListeners();
    this.initCubeTreeListeners();
  },
  init: function(){
    this.fireEvent("busy");
    var me = this;
    var xmla = this.xmla;
    this.hideSchemaTreePane();
    this.clearSchemaTreePane();
    var schemaTreePane = this.schemaTreePane;
    var schemaTreePaneDom = schemaTreePane.getDom();
    if (!this.progressIndicator) {
      this.createProgressIndicator();
    }
    this.initCatalogNodesCheckbox();
    this.initListeners();
    this.indicateProgress(
      "<IMG src=\"" + muiImgDir + "ajax-loader-small.gif" + "\"/>" +
      gMsg("Loading datasources...")
    );
    this.getDataSources();
  },
  getDataSources: function(){
    var me = this;
    var xmla = me.xmla;
    var datasources = [];

    var metadataRestrictions = this.metadataRestrictions;
    if (!metadataRestrictions) {
      metadataRestrictions = {};
    }

    var datasourcesQueue = metadataRestrictions.datasources;
    if (!datasourcesQueue) {
      datasourcesQueue = [];
    }
    if (!datasourcesQueue.length){
      datasourcesQueue.push({});
    }
    datasourcesQueue.index = -1;

    var doDataSourcesQueue = function(datasourcesQueue){
      if (!(++datasourcesQueue.index < datasourcesQueue.length)) {
        me.handleDataSources(datasources);
        return false;
      }
      var datasource = datasourcesQueue[datasourcesQueue.index];
      var restriction = datasource.restriction || {};
      options.restrictions = restriction;
      options.catalogRestrictions = datasource.catalogs;
      xmla.discoverDataSources(options);
    }

    var options = {
      error: function(xmla, options, error){
        me.fireEvent("error", error);
      },
      success: function(xmla, options, rowset){
        rowset.eachRow(function(datasource){
          //first, check the provider type.
          //we only handle MDP providers (OLAP)
          var isMDP = false;
          var providerType = datasource.ProviderType;
          if (iArr(providerType)) {
            var n = providerType.length;
            for (var i = 0; i < n; i++){
              if (providerType[i] !== "MDP") {
                continue;
              }
              isMDP = true;
              break;
            }
          }
          else
          if (providerType === "MDP") {
            isMDP = true;
          }
          if (!isMDP) {
            return;
          }

          //now, check if we are dealing with a relative URL.
          //if so, then prepend with the url of the preceding XMLA request
          //(if we don't, it will be resolved against the location of the current document, which is clearly wrong)
          var url = parseUri(datasource.URL);
          if (url.isRelative) {
            url = datasource.URL;
            datasource.URL = options.url;
            //If the original url does not end with a slash, add it.
            if (options.url.charAt(options.url.length - 1) !== "/") {
              datasource.URL += "/";
            }
            datasource.URL += url;
          }

          //For now, overwrite the value of the URL field.
          //Too many servers misbehave when they return an actual value
          //see http://issues.iccube.com/issue/ic3pub-62
          datasource.URL = options.url;

          //store the datasource so we can render them in the ui later.
          datasource.catalogRestrictions = options.catalogRestrictions;
          datasources.push(datasource);
        });
        doDataSourcesQueue(datasourcesQueue);
      }
    };

    doDataSourcesQueue(datasourcesQueue);
  },
  renderDataSourceNode: function(datasource){
    //Render MDP providers as treenodes.
    var schemaTreePaneDom = this.schemaTreePane.getDom();
    var dataSourceName = datasource.DataSourceName;
    var dataSourceDescription = datasource.DataSourceDescription || datasource.Description;

    var useAsDatasourceCaption = this.useAsDatasourceCaption;
    var title, i, n = useAsDatasourceCaption.length;
    for (i = 0; i < n; i++) {
      title = useAsDatasourceCaption[i];
      title = datasource[title];
      if (title) {
        break;
      }
    }
    if (!title) {
      title = "Data Soure";
    }
      
    var state = this.datasourceNodesInitiallyFlattened ? TreeNode.states.flattened : TreeNode.states.expanded;
    var treeNode = new TreeNode({
      classes: "datasource",
      state: state,
      id: "datasource:" + dataSourceName,
      parentElement: schemaTreePaneDom,
      title: title,
//      tooltip: dataSourceDescription || dataSourceName,
      metadata: datasource
    });
    return treeNode;
  },
  handleDataSources: function(datasources){
    if (datasources.length === 0) {
      this.indicateProgress(gMsg("No datasources found."));
      this.fireEvent("done");
      return;
    }
    var providerNodeQueue = [];
    providerNodeQueue.index = -1;
    providerNodeQueue.catalogNodeQueue = [];
    providerNodeQueue.catalogNodeQueue.index = -1;

    var i, n = datasources.length, datasource, treeNode;
    for (i = 0; i < n; i++) {
      datasource = datasources[i];
      treeNode = this.renderDataSourceNode(datasource);
      //push to the queue so we can find the catalogs in a next round.
      providerNodeQueue.push(treeNode);
    }
    this.processProviderNodeQueue(providerNodeQueue);
  },
  eachDatasourceNode: function(callback, scope){
    var schemaTreePane = this.schemaTreePane;
    var schemaTreePaneDom = schemaTreePane.getDom();
    var childNodes = schemaTreePaneDom.childNodes, n = childNodes.length, childNode, i;
    for (i = 0; i < n; i++) {
      childNode = childNodes[i];
      if (!hCls(childNode, "datasource")) {
        continue;
      }
      if (callback.call(scope, TreeNode.getInstance(childNode.id), i) === false) {
        return false;
      }
    }
    return true;
  },
  eachCatalogNode: function(callback, scope) {
    if(this.eachDatasourceNode(function(datasourceNode, i){
      if (datasourceNode.eachChild(callback, scope) === false) {
        return false;
      }
    }, scope) === false){
      return false;
    }
    return true;
  },
  eachCubeNode: function(callback, scope) {
    if(this.eachCatalogNode(function(catalogNode, i){
      if (catalogNode.eachChild(callback, scope) === false) {
        return false;
      }
    }, scope) === false){
      return false;
    }
    return true;
  },
  findCubeNode: function(metadata){ //TODO: we might optimize this by searching top-down, but for now it'll do.
    var node;
    if (this.eachCubeNode(function(cubeNode, i){
      //check if the cube metadata matches
      if (eq(metadata.cube, cubeNode.conf.metadata)) {
        //check if the catalog metadata matches
        var catalogNode = cubeNode.getParentTreeNode();
        if (eq(metadata.catalog, catalogNode.conf.metadata)) {
          //check if the datasource metadata matches
          var datasourceNode = catalogNode.getParentTreeNode();
          if (eq(metadata.datasource, datasourceNode.conf.metadata)) {
            //ok, everything matches. Store the node and bail out.
            node = cubeNode;
            return false;
          }
        }
      }
    }, this) === false) {
      return node;
    }
    return null;
  },
  _getBooleanEvent: function(event){
    var checked;
    if (typeof(event) === "boolean") {
      checked = event;
    }
    else
    if (event.getTarget) {
      var target = event.getTarget();
      checked = target.checked;
    }
    else {
      checked = false;
    }
    return checked;
  },
  showCatalogNodes: function(event){
    var checked = this._getBooleanEvent(event), state;
    if (checked) {
      this.catalogNodesInitiallyFlattened = false;
      state = TreeNode.states.unflattened;
    }
    else {
      this.catalogNodesInitiallyFlattened = true;
      state = TreeNode.states.flattened;
    }
    this.eachCatalogNode(function(catalogNode, index){
      catalogNode.setState(state);
    }, this)
  },
  eachDimensionNode: function(callback, scope) {
    var dimensionsTreeNode = this.getDimensionsTreeNode();
    dimensionsTreeNode.eachChild(function(dimensionNode, i){
      if (callback.call(scope, dimensionNode, i) === false) {
        return false;
      }
    });
    return true;
  },
  eachHierarchyNode: function(callback, scope) {
    var ret = true;
    this.eachDimensionNode(function(dimensionNode, i){
      dimensionNode.eachChild(function(hierarchyNode, i){
        if (callback.call(scope, hierarchyNode, i) === false){
          ret = false;
          return false;
        }
      }, this);
    }, this);
    return ret;
  },
  showDimensionNodes: function(event){
    var checked = this._getBooleanEvent(event), state;
    if (checked) {
      this.dimensionNodesInitiallyFlattened = false;
      state = TreeNode.states.unflattened;
    }
    else {
      this.dimensionNodesInitiallyFlattened = true;
      state = TreeNode.states.flattened;
    }
    this.eachDimensionNode(function(dimensionNode, index){
      if (dimensionNode.getChildNodeCount() <= 1) {
        //This dimension has only 1 hierarchy;
        //keep it flattened.
        return;
      }
      dimensionNode.setState(state);
    }, this)
  },
  showHierarchyNodes: function(event){
    var checked = this._getBooleanEvent(event), state;
    if (checked) {
      state = TreeNode.states.unflattened;
    }
    else {
      state = TreeNode.states.flattened;
    }
    this.eachHierarchyNode(function(hierarchyNode, index){
      hierarchyNode.setState(state);
    }, this)
  },
  checkStartDrag: function(event, ddHandler){
    this.getCubeTreePane().getDom().style.overflow = "hidden";
    var treeNode;
    if (event instanceof TreeNode) {
      treeNode = event;
    }
    else {
      var target = event.getTarget();
      if (!hCls(target, "label")) {
        return false;
      }
      treeNode = TreeNode.lookup(target);
      if (!treeNode) {
        return false;
      }
    }
    var classes = confCls(treeNode.conf.classes);
    className = classes[0];
    var defaultMember;
    switch (className) {
      case "measures":
      case "hierarchy":
      case "measure":
      case "derived-measure":
      case "level":
      case "member":
      case "property":
        break;
      default:
        return false;
    }
    var treeNodeConf = treeNode.conf;
    var info = {
      dragOrigin: this,
      label: treeNode.getTitle(),
      metadata: treeNodeConf.metadata,
      classes: classes,
      className: className
    };
    if (treeNodeConf.defaultMember) {
      info.defaultMember = treeNodeConf.defaultMember;
    }
    return info;
  },
  notifyEndDrag: function(event, dndHandler){
    this.getCubeTreePane().getDom().style.overflow = "";
  },
  renderAllLevel: function(conf, level) {
    var me = this;
    var levelTreeNode = this.getLevelTreeNode(level.LEVEL_UNIQUE_NAME);
    conf.levelTreeNode = levelTreeNode;
    var hierarchyTreeNode = conf.hierarchyTreeNode;
    var hierarchyMetadata = hierarchyTreeNode.conf.metadata;
    var url = conf.url;
    var properties = {
      DataSourceInfo: conf.dataSourceInfo,
      Catalog: hierarchyMetaData.CATALOG_NAME
    };
    var restrictions = {
      CATALOG_NAME: hierarchyMetaData.CATALOG_NAME,
      CUBE_NAME: hierarchyMetaData.CUBE_NAME,
      HIERARCHY_UNIQUE_NAME: hierarchyMetaData.HIERARCHY_UNIQUE_NAME,
      MEMBER_UNIQUE_NAME: hierarchyMetaData.ALL_MEMBER
    };
    this.xmla.discoverMDMembers({
      url: url,
      properties: properties,
      restrictions: restrictions,
      success: function(xmla, options, rowset){
        //actually render the member tree nodes residing beneath the level tree nodes
        rowset.eachRow(function(row){
          row.DIMENSION_TYPE = hierarchyMetaData.DIMENSION_TYPE;
          me.renderLevelMemberNode(conf, row, "estimate");
        });
        //done rendering member treenodes
        conf.callback();
        me.fireEvent("done");
      },
      error: function(xmla, options, error){
        conf.callback();
        me.fireEvent("error", error);
      }
    });
  },
  getMemberNodeTitle: function(metadata, cardinalityEstimateOrExact){
    var title = metadata.MEMBER_CAPTION || metadata.MEMBER_NAME;
    var cardinality = metadata.CHILDREN_CARDINALITY;
    if (iDef(cardinality)) {
      if (cardinalityEstimateOrExact !== "exact" || cardinality > 0) {
        var childMsg = cardinality === 1 ? "${1} child" : "${1} children";
        childMsg = gMsg(childMsg, cardinality);
        title += " (<span class=\"cardinality label\">" + childMsg + "</span>)";
      }
    }
    return title;
  },
  getMemberNodeState: function(metadata, cardinalityEstimateOrExact){
    var state = TreeNode.states.collapsed;
    if (iDef(metadata.CHILDREN_CARDINALITY)) {
      if (cardinalityEstimateOrExact === "exact" && metadata.CHILDREN_CARDINALITY === 0) {
        state = TreeNode.states.leaf;
      }
    }
    return state;
  },
  renderLevelMemberNode: function(conf, row, cardinalityEstimateOrExact){
    var me = this;
    var membersTreeNode = conf.membersTreeNode || conf.levelTreeNode;
    var url = conf.url;
    var properties = {
      DataSourceInfo: conf.dataSourceInfo,
      Catalog: row.CATALOG_NAME,
      Format: "Multidimensional",
      AxisFormat: "TupleFormat",
    };
    var restrictions = {
      CATALOG_NAME: row.CATALOG_NAME,
      CUBE_NAME: row.CUBE_NAME,
      HIERARCHY_UNIQUE_NAME: row.HIERARCHY_UNIQUE_NAME,
      LEVEL_UNIQUE_NAME: row.LEVEL_UNIQUE_NAME
    };
    var memberNodeId = membersTreeNode.conf.id  + ":" + row.MEMBER_UNIQUE_NAME;
    var classes = ["member", "cardinality-" + cardinalityEstimateOrExact];
    var state = this.getMemberNodeState(row, cardinalityEstimateOrExact);
    var title = this.getMemberNodeTitle(row, cardinalityEstimateOrExact);
    return new TreeNode({
      parentTreeNode: membersTreeNode,
      classes: classes,
      id: memberNodeId,
//      tooltip: row.MEMBER_UNIQUE_NAME,
      title: title,
      metadata: row,
      state: state,
      loadChildren: function(callback){
        conf.parentNode = this;
        conf.callback = callback;
        me.renderChildMemberNodes(conf, callback);
      }
    });
  },
  renderLevelMemberNodes: function(conf, callback, scope){
    var levelMembersDiscoveryMethod = this.levelMembersDiscoveryMethod;
    switch (levelMembersDiscoveryMethod) {
      case Xmla.METHOD_EXECUTE:
        this.renderLevelMemberNodesWithExecute(conf, callback, scope);
        break;
      case Xmla.METHOD_DISCOVER:
      default:
        this.renderLevelMemberNodesWithDiscover(conf, callback, scope);
        break;
    }
  },
  renderChildMemberNodes: function(conf, callback, scope){
    var me = this,
        url = conf.url,
        parentNode = conf.parentNode,
        parentNodeConf = parentNode.conf,
        metadata = parentNodeConf.metadata
    ;
    var memberExpression = [
      metadata.MEMBER_UNIQUE_NAME,
      "Children"
    ].join(".");
    
    this.renderMemberNodesWithExecute(conf, metadata, parentNode, memberExpression, callback, scope);
  },
  renderLevelMemberNodesWithExecute: function(conf, callback, scope) {
    var me = this;
    var membersTreeNode = conf.membersTreeNode;

    var levelTreeNode = membersTreeNode.getParentTreeNode()
    var levelMetaData = levelTreeNode.conf.metadata;

    var memberExpression = [
      levelMetaData.LEVEL_UNIQUE_NAME,
      "Members"
    ].join(".");
    
    this.renderMemberNodesWithExecute(conf, levelMetaData, membersTreeNode, memberExpression, callback, scope);
  },
  renderMemberNodesWithExecute: function(conf, metadata, parentNode, memberExpression, callback, scope){
    var me = this, url = conf.url, properties = {};
    
    var hierarchyUniqueName = metadata.HIERARCHY_UNIQUE_NAME;
    var cubeName = metadata.CUBE_NAME;

    properties[Xmla.PROP_DATASOURCEINFO] = conf.dataSourceInfo;
    properties[Xmla.PROP_CATALOG] = metadata.CATALOG_NAME;
    properties[Xmla.PROP_FORMAT] = Xmla.PROP_FORMAT_MULTIDIMENSIONAL;
    properties[Xmla.PROP_AXISFORMAT] = Xmla.PROP_AXISFORMAT_TUPLE;

    var numChildrenMeasure = [
      QueryDesigner.prototype.measuresHierarchyName,
      QueryDesignerAxis.prototype.braceIdentifier("NumChildren")
    ].join(".");

    var mdx = [
      "/* renderMemberNodesWithExecute */",
      "WITH",
      "MEMBER " + numChildrenMeasure,
      "AS " + metadata.HIERARCHY_UNIQUE_NAME  + ".CurrentMember.Children.Count ",
      "SELECT {" + numChildrenMeasure + "} ON COLUMNS ",
      "," + memberExpression + " ON ROWS",
      "FROM " + QueryDesignerAxis.prototype.braceIdentifier(cubeName)
    ].join("\n");

    var cardinalityEstimateOrExact = "exact";
    me.xmla.execute({
      url: url,
      properties: properties,
      statement: mdx,
      cube: metadata.CUBE_NAME,
      hierarchy: metadata.HIERARCHY_UNIQUE_NAME,
      metadata: metadata,
      success: function(xmla, req, resp){
        var cellset = resp.getCellset();
        var tupleCount = 0;
        resp.getRowAxis().eachTuple(function(tuple){
          var childCount = cellset.cellValue(),
              metadata = req.metadata,
              member = tuple.members[0],
              memberUniqueName = member.UName,
              memberCaption = member.Caption,
              title = memberCaption,
              nodeId,
              state
          ;
          //Only make this a leaf node if we're really sure there are no children.
          if (cardinalityEstimateOrExact === "exact" && childCount === 0) {
            state = TreeNode.states.leaf;
          }
          else {
          //If this node might have children, allow it to be expanded.
            state = TreeNode.states.collapsed;
          }
          var childMetaData = merge({
            MEMBER_UNIQUE_NAME: memberUniqueName,
            MEMBER_CAPTION: memberCaption,
            LEVEL_UNIQUE_NAME: member.LName,
            LEVEL_NUMBER: member.LNum,
            CHILDREN_CARDINALITY: childCount,
          }, metadata);
          var classes = ["member", "cardinality-" + cardinalityEstimateOrExact];
          var title = me.getMemberNodeTitle(childMetaData, cardinalityEstimateOrExact);
          var state = me.getMemberNodeState(childMetaData, cardinalityEstimateOrExact);
          new TreeNode({
            id: parentNode.conf.id + ":" + memberUniqueName,
            parentTreeNode: parentNode,
            classes: classes,
            title: title,
//            tooltip: memberUniqueName,
            state: state,
            metadata: childMetaData,
            loadChildren: function(callback){
              conf.parentNode = this;
              me.renderChildMemberNodes(conf, callback);
            }
          });
          cellset.nextCell();
          tupleCount++;
        });
        resp.close();
        
        var parentNodeDom = parentNode.getDom();
        //parent node could either be a members folder, ...
        if (hCls(parentNodeDom, "members")) {
          me.afterRenderingLevelMembers(parentNode);
        }
        else {  //...or itself a member node.
          if (hCls(parentNodeDom, "cardinality-estimate")) {
            rCls(parentNodeDom, "cardinality-estimate", "cardinality-exact");
            metadata.CHILDREN_CARDINALITY = tupleCount;
          }
          parentNode.setTitle(me.getMemberNodeTitle(metadata, "exact"));
          if (tupleCount === 0) {
            parentNode.setState(TreeNode.states.leaf);
          }
        }
        callback.call(scope || null);
      },
      error: function(xhr, options, exception){
        callback.call(scope || null);
        me.fireEvent("error", exception);
      }
    });
  },
  afterRenderingLevelMembers: function(membersTreeNode){
    //now that we actually retrieved the members, see if we can adjust the tree according to actual cardinality.
    var childNodeCount = membersTreeNode.getChildNodeCount();
    var levelNode = membersTreeNode.getParentTreeNode();
    var levelNodeConf = levelNode.conf;
    var levelMetadata = levelNodeConf.metadata;
    var maxLowCardinalityLevelMembers = this.maxLowCardinalityLevelMembers;
    if (levelMetadata.LEVEL_CARDINALITY !== childNodeCount) {
      levelMetadata.LEVEL_CARDINALITY = childNodeCount;
      var membersNodeState, membersNodeTitle;
      if (childNodeCount <= maxLowCardinalityLevelMembers) {
        //actual number of members is small. Flatten the members folder node.
        membersNodeState = TreeNode.states.flattened;
      }
      else
      if (childNodeCount >= maxLowCardinalityLevelMembers){
        //the estimate was lower than actual number. Expand this node. (unflatten if it was flattened)
        membersNodeState = TreeNode.states.expanded;
      }
      membersTreeNode.setState(membersNodeState);
      
      membersNodeTitle = this.getLevelMembersNodeTitle(childNodeCount);
      membersTreeNode.setTitle(membersNodeTitle);
    }
    rCls(membersTreeNode.getDom(), "cardinality-estimate", "cardinality-exact");
  },
  renderLevelMemberNodesWithDiscover: function(conf, callback, scope){
    var me = this;
    var membersTreeNode = conf.membersTreeNode;

    var levelTreeNode = membersTreeNode.getParentTreeNode()
    var levelMetaData = levelTreeNode.conf.metadata;

    var hierarchyTreeNode = levelTreeNode.getParentTreeNode()
    var hierarchyMetaData = hierarchyTreeNode.conf.metadata;

    var url = conf.url;
    var properties = {
      DataSourceInfo: conf.dataSourceInfo,
      Catalog: levelMetaData.CATALOG_NAME
    };
    var restrictions = {
      CATALOG_NAME: levelMetaData.CATALOG_NAME,
      CUBE_NAME: levelMetaData.CUBE_NAME,
      HIERARCHY_UNIQUE_NAME: levelMetaData.HIERARCHY_UNIQUE_NAME,
      LEVEL_UNIQUE_NAME: levelMetaData.LEVEL_UNIQUE_NAME
    };
    this.xmla.discoverMDMembers({
      url: url,
      properties: properties,
      restrictions: restrictions,
      success: function(xmla, options, rowset){
        //actually render the member tree nodes residing beneath the level tree nodes
        var i = 0;
        rowset.eachRow(function(row){
          row.DIMENSION_TYPE = hierarchyMetaData.DIMENSION_TYPE;
          me.renderLevelMemberNode(conf, row, "estimate");
          i++;
        });
        //done rendering member treenodes
        me.afterRenderingLevelMembers(membersTreeNode);

        if (callback) {
          callback.call(scope);
        }
        me.fireEvent("done");
      },
      error: function(xmla, options, error){
        if (callback) {
          callback.call(scope);
        }
        me.fireEvent("error", error);
      }
    });
  },
  getLevelMembersNodeTitle: function(cardinality){
    return gMsg("${1} Members", "<span class=\"cardinality\">" + cardinality + "</span>");
  },
  renderLevelMembersNode: function(conf, row, cardinalityEstimateOrExact){
    var me = this;
    var hierarchyTreeNode = conf.hierarchyTreeNode;
    var levelTreeNode = this.getLevelTreeNode(row.LEVEL_UNIQUE_NAME);
    var id = this.getLevelTreeNodeId(row.LEVEL_UNIQUE_NAME) + ":members";
    var title = this.getLevelMembersNodeTitle(row.LEVEL_CARDINALITY);
    var classes = ["members", "cardinality-" + cardinalityEstimateOrExact];
    
    var treeNode = new TreeNode({
      parentTreeNode: levelTreeNode,
      classes: classes,
      id: id,
      title: title,
      metadata: row,
      state: TreeNode.states.collapsed,
      loadChildren: function(callback){
        conf.membersTreeNode = this;
        conf.callback = callback;
        me.renderLevelMemberNodes(conf, callback, this);
      }
    });
    
    return treeNode;
  },
  renderLevelPropertyNode: function(conf, row) {
    var hierarchyTreeNode = conf.hierarchyTreeNode;
    var levelTreeNode = this.getLevelTreeNode(row.LEVEL_UNIQUE_NAME);
    if (!levelTreeNode) {
      //the level tree node might not have been created if it was marked as not visible
      return;
    }
    var id = this.getLevelTreeNodeId(row.LEVEL_UNIQUE_NAME);
    var tooltipAndInfoLabel = this.createNodeTooltipAndInfoLabel(row.DESCRIPTION);
    var objectName = row.PROPERTY_CAPTION || row.PROPERTY_NAME;
    var title = objectName;
    var tooltip = tooltipAndInfoLabel.tooltip || title;
    title = title + tooltipAndInfoLabel.infoLabel;

    var state = TreeNode.states.leaf;

    var classes = ["property", "property-datatype" + row.DATA_TYPE];

    if (row.PROPERTY_TYPE & Xmla.Rowset.MDPROP_MEMBER) {
      classes.push("property-type-member");
    }

    if (row.PROPERTY_TYPE & Xmla.Rowset.MDPROP_CELL) {
      classes.push("property-type-cell");
    }

    if (row.PROPERTY_TYPE & Xmla.Rowset.MDPROP_SYSTEM) {
      classes.push("property-type-system");
      //for now, simply hide any system properties.
      state = TreeNode.states.flattened;
    }

    if (row.PROPERTY_TYPE & Xmla.Rowset.MDPROP_BLOB) {
      classes.push("property-type-blob");
    }

    return new TreeNode({
      parentTreeNode: levelTreeNode,
      classes: classes,
      id: id + ":property:" + row.PROPERTY_NAME,
      objectName: objectName,
      title: title,
//      tooltip: tooltip,
      state: state,
      metadata: row
    })
  },
  renderLevelPropertyNodes: function(conf, callback) {
    var me = this;
    var hierarchyTreeNode = conf.hierarchyTreeNode;
    var hierarchyMetaData = hierarchyTreeNode.conf.metadata;
    var url = conf.url;
    var properties = {
      DataSourceInfo: conf.dataSourceInfo,
      Catalog: hierarchyMetaData.CATALOG_NAME
    };
    var restrictions = {
      CATALOG_NAME: hierarchyMetaData.CATALOG_NAME,
      CUBE_NAME: hierarchyMetaData.CUBE_NAME,
      HIERARCHY_UNIQUE_NAME: hierarchyMetaData.HIERARCHY_UNIQUE_NAME
    };
    me.xmla.discoverMDProperties({
      url: url,
      properties: properties,
      restrictions: restrictions,
      success: function(xmla, options, rowset){
        rowset.eachRow(function(row){
          if (me.checkIsExcluded(options, row)) {
            return;
          }
          //don't render properties that aren't marked visible
          if (iDef(row.PROPERTY_IS_VISIBLE) && row.PROPERTY_IS_VISIBLE === false) {
            return;
          }
          //only render properties that are marked as member properties
          if (iDef(row.PROPERTY_TYPE) && (row.PROPERTY_TYPE & Xmla.Rowset.MDPROP_MEMBER) !== Xmla.Rowset.MDPROP_MEMBER) {
            return;
          }
          me.renderLevelPropertyNode(conf, row);
        });

        callback();
      },
      error: function(xmla, options, error){
        conf.callback();
        me.fireEvent("error", error);
        callback();
      }
    });
  },
  renderMemberNodes: function(conf, levels, cardinalityEstimateOrExact, callback){
    var me = this;
    var levelMembersNodes = [];
    var i, level, n = levels.length, estimateOrExact;
    for (i = 0; i < n; i++){
      level = levels[i];
      var cardinality;
      //SAP thinks "All" levels could have a cardinality > 1, like, what the hell - 10.000
      if (level.LEVEL_TYPE === 1) { //1: MDLEVEL_TYPE_ALL
        cardinality = 1;
        estimateOrExact = "exact";
      }
      else {
        estimateOrExact = cardinalityEstimateOrExact;
        cardinality = level.LEVEL_CARDINALITY;
      }
      var membersNode = this.renderLevelMembersNode(conf, level, estimateOrExact);
      if (cardinality <= this.maxLowCardinalityLevelMembers) {
        levelMembersNodes.push(membersNode);
      }
    }

    if (conf.callback) {
      callback = conf.callback;
      delete conf.callback;
    }

    this.flattenLevelMembersNodes(levelMembersNodes, 0, function(){
      if (callback) {
        callback();
      }
      me.fireEvent("done");
    });
  },
  flattenLevelMembersNodes: function(levelMembersNodes, index, callback){
    var me = this;
    if (index < levelMembersNodes.length) {
      var levelMembersNode = levelMembersNodes[index++];
      var datasourceTreeNode = me.getCurrentDatasourceTreeNode();
      var datasourceTreeNodeConf = datasourceTreeNode.conf;
      var datasourceMetadata = datasourceTreeNodeConf.metadata;
      var conf = {
        url: datasourceMetadata.URL,
        dataSourceInfo: datasourceMetadata.DataSourceInfo,
        membersTreeNode: levelMembersNode,
      };
      this.renderLevelMemberNodes(conf, function(){
        levelMembersNode.setState(TreeNode.states.flattened);
        this.flattenLevelMembersNodes(levelMembersNodes, index, callback);
      }, this);
    }
    else {
      callback();
    }
  },
  loadLevelTreeNodeChildren: function(conf, levels, callback){
    var me = this;
    if (!iArr(levels)) {
      levels = [levels];
    }
    if (this.renderPropertyNodes === false) {
      this._renderLevelMemberNodes(conf, levels, callback);
    }
    else {
      this.renderLevelPropertyNodes(conf, function(){
        me._renderLevelMemberNodes(conf, levels, callback);
      });        
    }
  },
  renderLevelTreeNode: function(conf, row){
    var me = this;
    var hierarchyTreeNode = conf.hierarchyTreeNode;
    if (!hierarchyTreeNode) {
      hierarchyTreeNode = this.getHierarchyTreeNode(row.HIERARCHY_UNIQUE_NAME);
    }
    var id = this.getLevelTreeNodeId(row.LEVEL_UNIQUE_NAME);
    var levelCaption = row.LEVEL_CAPTION;
    
    var levelTitle = levelCaption;
    if (this.useHierarchyPrefixForLevels) {
      var hierarchyTitle = hierarchyTreeNode.conf.objectName;
      if (levelTitle.indexOf(hierarchyTitle) !== 0) {
        levelTitle = "<span class=\"label label-prefix\">" + hierarchyTitle + "</span>" + levelTitle;
      }
    }
    
    var url = conf.url;
    var properties = {
      DataSourceInfo: conf.dataSourceInfo,
      Catalog: row.CATALOG_NAME
    };
    var restrictions = {
      CATALOG_NAME: row.CATALOG_NAME,
      CUBE_NAME: row.CUBE_NAME,
      HIERARCHY_UNIQUE_NAME: row.HIERARCHY_UNIQUE_NAME,
      LEVEL_UNIQUE_NAME: row.LEVEL_UNIQUE_NAME
    };
    var tooltipAndInfoLabel = this.createNodeTooltipAndInfoLabel(row.DESCRIPTION);
    var objectName = row.LEVEL_CAPTION || row.LEVEL_NAME;
    var title = objectName;
    var tooltip = tooltipAndInfoLabel.tooltip || title;
    title = title + tooltipAndInfoLabel.infoLabel;
    //if this is the all level, then flatten it to make the tree tidier.
    //typically we are not very interested in the "all" level (although the "all" member can be useful sometimes)
    var state = this.loadLevelsImmediately ? TreeNode.states.collapsed : (row.LEVEL_TYPE === 1 ? TreeNode.states.flattened : TreeNode.states.expanded);
    var levelTreeNodeConf = {
      parentTreeNode: hierarchyTreeNode,
      classes: ["level", "leveltype" + row.LEVEL_TYPE, "levelunicity" + row.LEVEL_UNIQUE_SETTINGS],
      id: id,
      objectName: objectName,
      title: levelTitle,
//      tooltip: tooltip,
      metadata: row,
      state: state,
      loadChildren: function(callback){
        conf.hierarchyTreeNode = this.getParentTreeNode();
        me.loadLevelTreeNodeChildren(conf, row, callback);
      }
    };
    var treeNode = new TreeNode(levelTreeNodeConf);
    return treeNode;
  },
  renderHierarchyLevelTreeNodes: function(conf){
    var me = this;
    me.fireEvent("busy");
    var catalog = conf.catalog;
    var properties = {
      DataSourceInfo: conf.dataSourceInfo,
      Catalog: catalog
    };
    var cube = conf.cube;
    var hierarchyTreeNode = conf.hierarchyTreeNode;
    var hierarchyMetadata = hierarchyTreeNode.conf.metadata;
    var restrictions = {
      CATALOG_NAME: catalog,
      CUBE_NAME: cube,
      HIERARCHY_UNIQUE_NAME: hierarchyMetadata.HIERARCHY_UNIQUE_NAME
    };
    var url = conf.url;
    me.xmla.discoverMDLevels({
      url: url,
      properties: properties,
      restrictions: restrictions,
      success: function(xmla, options, rowset){
        var levels = [], i = 0;
        //create a treenode for each level
        rowset.eachRow(function(row){
          if (me.checkIsExcluded(options, row)) {
            return;
          }
          row.DIMENSION_TYPE = hierarchyMetadata.DIMENSION_TYPE;
          row.HIERARCHY_CAPTION = hierarchyMetadata.HIERARCHY_CAPTION;
          levels.push(row);
          //https://technet.microsoft.com/en-us/library/ms126038(v=sql.110).aspx reads:
          //A Boolean that indicates whether the level is visible. Always returns True. If the level is not visible, it will not be included in the schema rowset.
          //So, we might as well not check it at all. Besides, SAP/HANA doesn't support it.
          //if (!row.LEVEL_IS_VISIBLE) {
          //  return;
          //}
          me.renderLevelTreeNode(conf, row);
        });

        me.loadLevelTreeNodeChildren(conf, levels);
      },
      error: function(xmla, options, error){
        conf.callback();
        me.fireEvent("error", error);
      },
    });
  },
  _renderLevelMemberNodes: function(conf, levels, callback){
    var me = this;
    switch (me.levelCardinalitiesDiscoveryMethod) {
      case Xmla.METHOD_EXECUTE:
        me.queryLevelCardinalities(levels, conf.url, conf.dataSourceInfo, function(){
          me.renderMemberNodes(conf, levels, "exact", callback);
        }, me);
        break;
      case Xmla.METHOD_DISCOVER:
      default:
        me.renderMemberNodes(conf, levels, "estimate", callback);
    }
  },
  //this gets called to load levels immediately, this happens when the hierarchy nodes are initially expanded or flattened
  renderLevelTreeNodes: function(conf, success, error, scope){
    var me = this;
    me.fireEvent("busy");
    var catalog = conf.catalog;
    var properties = {
      DataSourceInfo: conf.dataSourceInfo,
      Catalog: catalog
    };
    var cube = conf.cube;
    var restrictions = {
      CATALOG_NAME: catalog,
      CUBE_NAME: cube
    };
    var url = conf.url;
    me.xmla.discoverMDLevels({
      url: url,
      properties: properties,
      restrictions: restrictions,
      success: function(xmla, options, rowset){
        var levels = [], i = 0, hierarchyMetadata;
        //create a treenode for each level
        rowset.eachRow(function(row){
          if (row.DIMENSION_UNIQUE_NAME === QueryDesigner.prototype.measuresHierarchyName) {
            return;
          }   
          if (me.checkIsExcluded(options, row)) {
            return;
          }
          if (!hierarchyMetadata || hierarchyMetadata.HIERARCHY_UNIQUE_NAME !== row.HIERARCHY_UNIQUE_NAME) {
            hierarchyMetadata = me.getHierarchyMetadata(row.HIERARCHY_UNIQUE_NAME);
          }
          
          var dimensionType = hierarchyMetadata.DIMENSION_TYPE;
          row.DIMENSION_TYPE = dimensionType;
          row.HIERARCHY_CAPTION = hierarchyMetadata.HIERARCHY_CAPTION;
          levels.push(row);
          //https://technet.microsoft.com/en-us/library/ms126038(v=sql.110).aspx reads:
          //A Boolean that indicates whether the level is visible. Always returns True. If the level is not visible, it will not be included in the schema rowset.
          //So, we might as well not check it at all. Besides, SAP/HANA doesn't support it.
          //if (!row.LEVEL_IS_VISIBLE) {
          //  return;
          //}
          me.renderLevelTreeNode(conf, row);
        });
        if (success) {
          success.call(scope || null);
        }
      },
      error: function(xmla, options, error){
        conf.callback();
        if (error) {
          error.call(scope || null);
        }
        me.fireEvent("error", error);
      },
    });
  },
  queryLevelCardinalities: function(levels, url, datasourceInfo, callback, scope) {
    var measuresHierarchyName = QueryDesigner.prototype.measuresHierarchyName;
    var measureName, measureExpression, levelUniqueName, levelName;
        withList = "",
        selectList = ""
    ;
    var i, n = levels.length, level;
    for (i = 0; i < n; i++) {
      level = levels[i];

      measureName = QueryDesignerAxis.prototype.braceIdentifier(String(i));
      measureName = measuresHierarchyName + "." + measureName;

      levelName = level.LEVEL_NAME;
      levelName = QueryDesignerAxis.prototype.stripBracesFromIdentifier(levelName);
      levelName = QueryDesignerAxis.prototype.braceIdentifier(levelName);
      levelUniqueName = level.HIERARCHY_UNIQUE_NAME + "." + levelName;

      measureExpression = levelUniqueName + ".Members.Count";
      withList += "\nMEMBER " + measureName + " AS " + measureExpression;
      if (selectList.length) {
        selectList += "\n, "
      }
      selectList += measureName;
    }
    var levelCardinalityMdx = [
      "/* queryLevelCardinalities */",
      "WITH " + withList,
      "SELECT {" + selectList + "} ON COLUMNS",
      "FROM " + QueryDesignerAxis.prototype.braceIdentifier(level.CUBE_NAME)
    ].join("\n");
    
    var me = this;
    this.xmla.execute({
      url: url,
      properties: {
        DataSourceInfo: datasourceInfo,
        Catalog: level.CATALOG_NAME
      },
      statement: levelCardinalityMdx,
      success: function(xhr, options, dataset) {
        var cellset = dataset.getCellset(), cell;
        var i, n = levels.length, level, value;
        for (i = 0; i < n; i++) {
          level = levels[i];
          cell = cellset.readCell();
          value = cell.Value;
          if (value !== level.LEVEL_CARDINALITY) {
            if (console && console.log) {
              console.log(
                "Adjusting cardinality for level " +
                level.LEVEL_UNIQUE_NAME + ". " +
                " Estimate: " + level.LEVEL_CARDINALITY +
                "; Actual: " + value
              );
            }
            level.LEVEL_CARDINALITY = value;
          }
          cellset.nextCell();
        }
        callback.call(scope);
      },
      error: function(xhr, options, exception){
        me.fireEvent("error", exception);
        callback.call(scope);
      }
    });
  },
  renderDimensionTreeNode: function(conf, row, mandatory){
    var classes = ["dimension", "dimensiontype" + row.DIMENSION_TYPE, TreeNode.states.flattened];
    if (mandatory) {
      classes.push("mandatory");
      classes.push("mandatory-" + mandatory);
    }
    var tooltipAndInfoLabel = this.createNodeTooltipAndInfoLabel(row.DESCRIPTION);
    var objectName = row.DIMENSION_CAPTION || row.DIMENSION_NAME;
    var title = objectName;
    var tooltip = tooltipAndInfoLabel.tooltip || title;
    title = title + tooltipAndInfoLabel.infoLabel;
    
    var dimensionTreeNodeConf = {
      state: TreeNode.states.expanded,
      classes: classes,
      id: "dimension:" + row.DIMENSION_UNIQUE_NAME,
      objectName: objectName,
      title: title,
//      tooltip: tooltip,
      metadata: row
    };
    if (conf.dimensionsTreeNode) {
      dimensionTreeNodeConf.parentTreeNode = conf.dimensionsTreeNode;
    }
    else {
      dimensionTreeNodeConf.parentElement = this.cubeTreePane.getDom();
    }
    
    var dimensionTreeNode = new TreeNode(dimensionTreeNodeConf);
    
    if (this.dimensionNodesInitiallyFlattened ) {
      dimensionTreeNode.setState(TreeNode.states.flattened);
    }
    return dimensionTreeNode;
  },
  renderDimensionTreeNodes: function(conf){
    var me = this;
    var url = conf.url;
    var properties = {
      DataSourceInfo: conf.dataSourceInfo,
      Catalog: conf.catalog
    };
    var restrictions = {
      CATALOG_NAME: conf.catalog,
      CUBE_NAME: conf.cube
    };
    this.xmla.discoverMDDimensions({
      url: conf.url,
      properties: properties,
      restrictions: restrictions,
      error: function(xmla, options, error){
        me.fireEvent("error", error);
      },
      success: function(xmla, options, rowset) {
        //for each dimension, add a treenode.
        rowset.eachRow(function(row){
          if (me.checkIsExcluded(options, row)) {
            return;
          }
          //https://technet.microsoft.com/en-us/library/ms126180(v=sql.110).aspx reads:
          //DIMENSION_IS_VISIBLE DBTYPE_BOOL Always TRUE. A dimension is not visible unless one or more hierarchies in the dimension are visible.
          //So we might as well not check for it at all. Plus, SAP doesn't support this.
          //don't render invisible dimensions
          //if (row.DIMENSION_IS_VISIBLE === false) {
          //  return;
          //}
          //if this dimension happens to be a measure dimension, don't render it.
          //We already have measures
          if (row.DIMENSION_TYPE === Xmla.Rowset.MD_DIMTYPE_MEASURE) {
            //conf.measuresTreeNode.conf.metadata = row;
            return;
          }
          //actually add a treenode for the hierarchy.
          var datasource = options.properties.DataSourceInfo;
          var method = options.requestType;
          var xmlaMetadataFilter = me.xmlaMetadataFilter;
          var mandatory;
          if (xmlaMetadataFilter) {
            mandatory = xmlaMetadataFilter.getMandatory(datasource, method, row);
          }
          var dimensionNode = me.renderDimensionTreeNode(conf, row, mandatory);
        });
        //add hierarchies
        me.renderHierarchyTreeNodes(conf);
      }
    });
  },
  getDimensionsTreeNodeId: function(){
    return "dimensions";
  },
  renderDimensionsTreeNode: function(conf) {
    var dimensionsTreeNode = new TreeNode({
      state: this.initialDimensionsTreeNodeState,
      parentElement: this.cubeTreePane.getDom(),
      classes: ["dimensions", "dimensiontype" + Xmla.Rowset.MD_DIMTYPE_OTHER],
      id: this.getDimensionsTreeNodeId(),
      title: gMsg("Dimensions"),
//      tooltip: gMsg("Dimensions")
    });
    return dimensionsTreeNode;
  },
  getHierarchyTreeNodeId: function(hierarchyUniqueName){
    if (hierarchyUniqueName === QueryDesigner.prototype.measuresHierarchyName) {
      return this.getMeasuresTreeNodeId();
    }
    if (iObj(hierarchyUniqueName)){
      hierarchyUniqueName = hierarchyUniqueName.HIERARCHY_UNIQUE_NAME;
    }
    return "hierarchy:" + hierarchyUniqueName;
  },
  getHierarchyTreeNode: function(hierarchyUniqueName){
    var id = this.getHierarchyTreeNodeId(hierarchyUniqueName);
    return TreeNode.getInstance("node:" + id);
  },
  getHierarchyMetadata: function(hierarchyUniqueName){
    var hierarchyTreeNode = this.getHierarchyTreeNode(hierarchyUniqueName);
    return hierarchyTreeNode.conf.metadata;
  },
  getLevelTreeNodeId: function(levelUniqueName){
    if (iObj(levelUniqueName)){
      levelUniqueName = levelUniqueName.LEVEL_UNIQUE_NAME;
    }
    return "level:" + levelUniqueName;
  },
  getLevelTreeNode: function(levelUniqueName){
    var id = this.getLevelTreeNodeId(levelUniqueName);
    return TreeNode.getInstance("node:" + id);
  },
  getLevelMetadata: function(levelUniqueName){
    var levelTreeNode = this.getLevelTreeNode(levelUniqueName);
    if (!levelTreeNode) {
      return null;
    }
    return levelTreeNode.conf.metadata;
  },
  renderHierarchyTreeNode: function(conf, row){
    var me = this;

    var dimensionNode = TreeNode.getInstance("node:dimension:" + row.DIMENSION_UNIQUE_NAME);
    if (!this.dimensionNodesInitiallyFlattened && dimensionNode.isFlattened() && dimensionNode.getChildNodeCount() >= 1) {
      dimensionNode.setState(TreeNode.states.expanded);
    }
    var objectName = row.HIERARCHY_CAPTION || row.HIERARCHY_NAME;
    var hierarchyTitle = objectName;

    if (this.useDimensionPrefixForHierarchies) {
      var dimensionTitle = dimensionNode.conf.objectName;
      if (dimensionTitle !== hierarchyTitle) {
        hierarchyTitle = "<span class=\"label label-prefix\">" + dimensionTitle + "</span>" + hierarchyTitle;
      }
    }

    var tooltipAndInfoLabel = this.createNodeTooltipAndInfoLabel(row.DESCRIPTION || row.HIERARCHY_CAPTION);
    var tooltip = tooltipAndInfoLabel.tooltip || hierarchyTitle;
    var title = hierarchyTitle+ tooltipAndInfoLabel.infoLabel;

    var state = (me.initialHierarchyTreeNodeState === TreeNode.states.flattened) ? TreeNode.states.expanded : me.initialHierarchyTreeNodeState; 
    var hierarchyTreeNodeConf = {
      state: state,
      parentTreeNode: dimensionNode,
      classes: ["hierarchy", "dimensiontype" + row.DIMENSION_TYPE],
      id: this.getHierarchyTreeNodeId(row),
      objectName: objectName,
      title: title,
//      tooltip: tooltip,
      metadata: row,
    };
    var hierarchyTreeNode = new TreeNode(hierarchyTreeNodeConf);
    if (me.initialHierarchyTreeNodeState === TreeNode.states.flattened) {
      hierarchyTreeNode.setState(TreeNode.states.flattened);
    }
    hierarchyTreeNodeConf.loadChildren = function(callback) {
      //get the level of the hierarchy.
      conf.hierarchyTreeNode = this;
      conf.callback = callback;
      me.renderHierarchyLevelTreeNodes(conf);
    }
    return hierarchyTreeNode;
  },
  renderHierarchyTreeNodes: function(conf){
    var me = this;
    var url = conf.url;
    var properties = {
      DataSourceInfo: conf.dataSourceInfo,
      Catalog: conf.catalog
    };
    var restrictions = {
      CATALOG_NAME: conf.catalog,
      CUBE_NAME: conf.cube
    };
    this.xmla.discoverMDHierarchies({
      url: conf.url,
      properties: properties,
      restrictions: restrictions,
      error: function(xmla, options, error){
        me.fireEvent("error", error);
      },
      success: function(xmla, options, rowset) {
        //for each hierarchy, add a treenode.
        var defaultMemberQueue = [];
        var hasMultipleHierarchies = false;
        rowset.eachRow(function(row){
          if (me.checkIsExcluded(options, row)) {
            return;
          }
          //if this hierarchy happens to be a measure hierarchy, don't render it.
          //We already have measures
          if (row.DIMENSION_TYPE === Xmla.Rowset.MD_DIMTYPE_MEASURE) {
            if (row.DEFAULT_MEMBER) {
              //me.getMeasureTreeNode(row.DEFAULT_MEMBER);
              //defaultMemberQueue.push(conf.measuresTreeNode);
              me.setDefaultMeasure(row.DEFAULT_MEMBER)
            }
            conf.measuresTreeNode.conf.metadata = row;

            //Changing the id is dangerous
            //In SAP the unique hierarchy name happens to be [Measures].[Measures]
            //conf.measuresTreeNode.setId(
            //  me.getHierarchyTreeNodeId(row.HIERARCHY_UNIQUE_NAME)
            //);
            return;
          }
          else
          if (iDef(row.HIERARCHY_IS_VISIBLE) && row.HIERARCHY_IS_VISIBLE === false) {
            //if the hierarchy is not visible, don't render it.
            return;
          }
          //actually add a treenode for the hierarchy.
          var hierarchyTreeNode = me.renderHierarchyTreeNode(conf, row);
          var dimensionTreeNode = hierarchyTreeNode.getParentTreeNode();
          if (hasMultipleHierarchies === false && dimensionTreeNode.getChildNodeCount() > 1) {
            dimensionTreeNode.getDom().className += " multiple";
            hasMultipleHierarchies = true;
          }
          if (row.DEFAULT_MEMBER) {
            defaultMemberQueue.push(hierarchyTreeNode);
          }
        });
        
        if (me.initialHierarchyTreeNodeState === "flattened") {
          me.createShowHierarchyNodesCheckbox();
        }
        if (hasMultipleHierarchies) {
          me.createShowDimensionNodesCheckbox();
        }
        
        //done rendering hierarchy treenodes
        
        //optionally, load the levels.
        if (me.loadLevelsImmediately) {
          me.renderLevelTreeNodes(
            conf, 
            function(){
              //get info about default members. We do this in case the user drags a hierarchy unto a query.
              me.getDefaultMembers(conf, defaultMemberQueue);
            }, 
            function(){
              debugger;
            }, 
            me
          );
        }
        else {
          //get info about default members. We do this in case the user drags a hierarchy unto a query.
          me.getDefaultMembers(conf, defaultMemberQueue);          
        }
      }
    });
  },
  getDefaultMembers: function(conf, hierarchyTreeNodes) {
    switch (this.defaultMemberDiscoveryMethod) {
      //get the default members one by one with one discover request for each hierarchy.
      case Xmla.METHOD_DISCOVER:
        this.getDefaultMembersWithDiscover(conf, hierarchyTreeNodes);
        break;
      //take a shortcut to get the default members in a single execute request
      case Xmla.METHOD_EXECUTE:
        this.getDefaultMembersWithMDX(conf, hierarchyTreeNodes);
        break;
      //if no particular method is specified we don't get default members at all.
      default:
        this.getDefaultMembersWithDuctTapeAndSuperGlue(conf, hierarchyTreeNodes);
    }
  },
  //this processes the queue of hierarchies to get their member definitions with a discover request.
  //it is the "right" way but way too expensive since it evokes a request storm
  //(one request for each hierarchy)
  //check out getDefaultMembers() instead - that takes a bit of a shortcut and requires only one request.
  getDefaultMembersWithDiscover: function(conf, defaultMemberQueue, defaultMemberQueueIndex){
    if (iUnd(defaultMemberQueueIndex)) {
      defaultMemberQueueIndex = 0;
    }
    if (defaultMemberQueueIndex >= defaultMemberQueue.length) {
      this.doneLoadingCube();
      return;
    }
    var me = this;
    var url = conf.url;
    var properties = {
      DataSourceInfo: conf.dataSourceInfo,
      Catalog: conf.catalog
    };
    var hierarchyTreeNode = defaultMemberQueue[defaultMemberQueueIndex];
    var hierarchyTreeNodeConf = hierarchyTreeNode.conf;
    var hierarchyMetadata = hierarchyTreeNodeConf.metadata;
    var restrictions = {
      CATALOG_NAME: hierarchyMetadata.CATALOG_NAME,
      CUBE_NAME: hierarchyMetadata.CUBE_NAME,
      HIERARCHY_UNIQUE_NAME: hierarchyMetadata.HIERARCHY_UNIQUE_NAME,
      MEMBER_UNIQUE_NAME: hierarchyMetadata.DEFAULT_MEMBER
    };
    this.xmla.discoverMDMembers({
      hierarchyTreeNodeConf: hierarchyTreeNodeConf,
      url: url,
      properties: properties,
      restrictions: restrictions,
      success: function(xmla, options, rowset){
        //actually render the member tree nodes residing beneath the level tree nodes
        rowset.eachRow(function(row){
          hierarchyTreeNodeConf.defaultMember = row;
        });
        me.getDefaultMembersWithDiscover(conf, defaultMemberQueue, ++defaultMemberQueueIndex);
      },
      error: function(xmla, options, error){
      }
    });
  },
  emulateDefaultMemberMockup: function(hierarchyTreeNode){
    var hierarchyTreeNodeConf = hierarchyTreeNode.conf;
    var hierarchyTreeNodeConfMetadata = hierarchyTreeNodeConf.metadata;
    var field, defaultMember = {}, fields = {
      "CATALOG_NAME": "CATALOG_NAME",
      "SCHEMA_NAME": "SCHEMA_NAME",
      "CUBE_NAME": "CUBE_NAME",
      "DIMENSION_UNIQUE_NAME": "DIMENSION_UNIQUE_NAME",
      "HIERARCHY_UNIQUE_NAME": "HIERARCHY_UNIQUE_NAME",
      "LEVEL_UNIQUE_NAME": "LEVEL_UNIQUE_NAME",
      "LEVEL_NUMBER": "LEVEL_NUMBER",
      "MEMBER_UNIQUE_NAME": "DEFAULT_MEMBER"
    };
    for (field in fields) {
      defaultMember[field] = hierarchyTreeNodeConfMetadata[fields[field]];
    }
    hierarchyTreeNodeConf.defaultMember = defaultMember;
    return defaultMember;
  },
  //this is here to get the captions of all default members of all hierarchies.
  //MDSCHEMA_MEMBERS does not really support that - not in 1 query.
  //But we can do it with MDX by setting up a query that asks for all members we're interested in.
  getDefaultMembersWithMDX: function(conf, hierarchyTreeNodes){
    var i, n = hierarchyTreeNodes.length, hierarchyTreeNode,
        hierarchyMetaData, memberName, members = [],
        measuresHierarchyName = QueryDesigner.prototype.measuresHierarchyName
    ;
    for (i = 0; i < n; i++) {
      hierarchyTreeNode = hierarchyTreeNodes[i];
      hierarchyMetaData = hierarchyTreeNode.conf.metadata;
      hierarchyName = hierarchyMetaData.HIERARCHY_UNIQUE_NAME;
      if (measuresHierarchyName === hierarchyName) {
        continue;
      }
      memberName = hierarchyMetaData.DEFAULT_MEMBER;
      members.push(memberName);
    }

    //no members, nothing to do.
    if (!members.length){
      return;
    }

    //We have members. Get their captions by issuing a bogus MDX query.
    //We use a calculated measure that we hope is cheaper than any real measure.
    //We dump all members in the sliceraxis. 
    //So far we found we can do this safely even if there are multiple hierarchies of same dimension.
    //This does not always work when we don't use the slicer but a "regular" axis.
    var measure = measuresHierarchyName + ".[One]";
    var mdx = [
      "/* getDefaultMembersWithMDX */",
      "WITH MEMBER " + measure + " AS 1",
      "SELECT {" + measure + "} ON COLUMNS",
      "FROM " + QueryDesignerAxis.prototype.braceIdentifier(hierarchyMetaData.CUBE_NAME),
      "WHERE " + "(" + members.join("\n, ") + ")"
    ].join("\n");

    var properties = {};
    properties[Xmla.PROP_DATASOURCEINFO] = conf.dataSourceInfo;
    properties[Xmla.PROP_CATALOG] = hierarchyMetaData.CATALOG_NAME;
    properties[Xmla.PROP_FORMAT] = Xmla.PROP_FORMAT_MULTIDIMENSIONAL;
    properties[Xmla.PROP_AXISFORMAT] = Xmla.PROP_AXISFORMAT_TUPLE;

    var me = this;
    this.xmla.execute({
      url: conf.url,
      properties: properties,
      statement: mdx,
      success: function(xmla, req, resp){
        resp.getSlicerAxis().eachTuple(function(tuple){
          var members = tuple.members, i, n = members.length,
              member, hierarchyTreeNode, defaultMember
          ;
          for (i = 0; i < n; i++) {
            hierarchyTreeNode = hierarchyTreeNodes[i];
            defaultMember = me.emulateDefaultMemberMockup(hierarchyTreeNode);
            member = members[i];
            defaultMember.MEMBER_CAPTION = member[Xmla.Dataset.Axis.MEMBER_CAPTION];
          }
        });
        resp.close();
        me.doneLoadingCube();
      },
      error: function(xmla, options, error){
        me.fireEvent("error", error);
      },
    });
  },
  //
  getDefaultMembersWithDuctTapeAndSuperGlue: function(conf, hierarchyTreeNodes){
    var i, n = hierarchyTreeNodes.length,
        hierarchyTreeNode, defaultMember
    ; 
    for (i = 0; i < n; i++) {
      hierarchyTreeNode = hierarchyTreeNodes[i];
      defaultMember = this.emulateDefaultMemberMockup(hierarchyTreeNode);
      defaultMember.MEMBER_CAPTION = gMsg(
        "Default Member Of ${1}",
        hierarchyTreeNode.conf.metadata.HIERARCHY_CAPTION
      );
    }
    this.doneLoadingCube();
  },
  setDefaultMeasure: function(measureUniqueName){
    var measuresTreeNode = this.getMeasuresTreeNode();
    var measureTreeNode = this.getMeasureTreeNode(measureUniqueName);
    //mondrian allows you to create a cube without expicitly defining any measures.
    //in this case monrian will report the existence of a "fact count" as default member for the measures hierarchy
    //even though the actual measure is not reported in the meausures or members rowset.
    //so in this case we end up not finding the treenode for that measure.
    //as workaround we will create that measure ourselves.
    var factCountName = "[Measures].[Fact Count]";
    if (!measureTreeNode && measureUniqueName === factCountName) {
      var measuresConf = measuresTreeNode.conf;
      var measuresMetadata = measuresConf.metadata;
      metadata = {
        CATALOG_NAME: measuresMetadata.CATALOG_NAME,
        SCHEMA_NAME: measuresMetadata.SCHEMA_NAME,
        CUBE_NAME: measuresMetadata.CUBE_NAME,
        MEASURE_NAME: "Fact Count",
        MEASURE_UNIQUE_NAME: factCountName,
        MEASURE_CAPTION: "Fact Count",
        MEASURE_GUID: null,
        MEASURE_AGGREGATOR: 2,
        DATA_TYPE: 3,
        MEASURE_IS_VISIBLE: true,
        LEVELS_LIST: null,
        DESCRIPTION: "Tell your admin to fix the schema bruh. A schema should define at least one explicit measure.",
        DEFAULT_FORMAT_STRING: null
      };
      measureTreeNode = this.renderMeasureNode({
        measuresTreeNode: measuresTreeNode
      }, metadata);
    }
    measuresTreeNode.conf.defaultMember = measureTreeNode.conf.metadata;
  },
  getMeasureTreeNodeId: function(measureUniqueName){
    return "measure:" + measureUniqueName;
  },
  getMeasureTreeNode: function(measureUniqueName){
    var id = this.getMeasureTreeNodeId(measureUniqueName);
    return TreeNode.getInstance("node:" + id);
  },
  getMeasuresTreeNode: function(){
    var id = this.getMeasuresTreeNodeId();
    return TreeNode.getInstance("node:" + id);
  },
  getDimensionsTreeNode: function(){
    var id = this.getDimensionsTreeNodeId();
    return TreeNode.getInstance("node:" + id);
  },
  getDerivedMeasureTreeNodeId: function(derivedMeasure) {
    var measure = derivedMeasure.derivedFrom;
    var measureUniqueName = measure.MEASURE_UNIQUE_NAME;
    var measuresTreeNodeId = this.getMeasureTreeNodeId(measureUniqueName);
    var derivedMeasureName = derivedMeasure.name;
    var derivedMeasureTreeNodeId = measuresTreeNodeId + ":" + derivedMeasureName;
    return derivedMeasureTreeNodeId;
  },
  derivedMeasureTreeNodeComparator: function(a, b){
    if (arguments.length === 1) {
      b = a;
      a = this;
    }
    var aFolder = a.conf.classes.join("").indexOf("derived-measures-folder") !== -1;
    var bFolder = b.conf.classes.join("").indexOf("derived-measures-folder") !== -1;
    if (aFolder && !bFolder) {
      return -1;
    }
    else
    if (!aFolder && bFolder) {
      return 1;
    }

    var aTitle = a.getTitle();
    var bTitle = b.getTitle();
    if (aTitle > bTitle) {
      return 1;
    }
    else
    if (aTitle < bTitle) {
      return -1;
    }
    return 0;
  },
  createDerivedMeasureTreeNode: function(derivedMeasureConf, measureMetadata, measureCaption) {
    var derivedMeasure = XavierDerivedMeasureFactory.prototype.createDerivedMeasure(
      derivedMeasureConf, measureMetadata, measureCaption
    );
    var derivedMeasureTreeNode = new TreeNode({
      state: TreeNode.states.leaf,
      classes: derivedMeasure.classes,
      id: this.getDerivedMeasureTreeNodeId(derivedMeasure),
      title: derivedMeasure.MEASURE_CAPTION,
//      tooltip: gMsg(derivedMeasure.tooltipMessageKey, measureCaption),
      metadata: derivedMeasure,
      compare: XmlaTreeView.prototype.derivedMeasureTreeNodeComparator
    });
    return derivedMeasureTreeNode;
  },
  getDerivedMeasureFolderNode: function(measure, folders, folder){
    var measureTreeNodeId = this.getMeasureTreeNodeId(measure.MEASURE_UNIQUE_NAME);
    var folderList, folderNode, parentFolderNode, folderNodeId = measureTreeNodeId;
    if (iStr(folder)) {
      folderList = [folder];
    }
    else
    if (iArr(folder)) {
      folderList = folder;
    }
    else {
      throw "Invalid object for folder";
    }

    var i, n = folderList.length, folderNodeConf;
    for (i = 0; i < n; i++) {
      folder = folderList[i];
      folderNodeId += ":folder-" + folder;
      if (i) {
        folderNode = null;
        parentFolderNode.eachChild(function(childNode, childNodeIndex){
          folderNode = childNode;
        }, this, {
          id: folderNodeId
        });
      }
      else {
        folderNode = folders[folderNodeId];
      }

      if (!folderNode) {
        folderNode = new TreeNode({
          classes: ["derived-measures-folder"],
          title: folder,
          id: folderNodeId,
          children: [],
          compare: XmlaTreeView.prototype.derivedMeasureTreeNodeComparator,
          sorted: true
        });
        if (i) {
          parentFolderNode.conf.children.push(folderNode);
        }
        else {
          folders[folderNodeId] = folderNode;
        }
      }
      parentFolderNode = folderNode;
    }
    return parentFolderNode;
  },
  createDerivedMeasureTreeNodes: function(measure, measureCaption){
    var folder, folderNode, folders = {};
    var xmlaMetadataFilter = this.xmlaMetadataFilter;
    if (!xmlaMetadataFilter) {
      return null;
    }
    var datasource = this.getCurrentDatasourceMetadata();
    datasource = datasource.DataSourceInfo;
    var derivedMeasureProperties = xmlaMetadataFilter.getProperties(datasource, Xmla.MDSCHEMA_MEASURES, measure);
    if (!derivedMeasureProperties) {
      return null;
    }
    var derivedMeasures = derivedMeasureProperties.derivedMeasures;
    var i, n = derivedMeasures.length, derivedMeasure, child, children = [];
    for (i = 0; i < n; i++) {
      derivedMeasure = derivedMeasures[i];
      child = this.createDerivedMeasureTreeNode(derivedMeasure, measure, measureCaption);

      folderNode = null;
      folder = derivedMeasure.folder;
      switch (typeof(folder)) {
        case "undefined":     //nothing to do, this derived measure is not in a folder.
          break;
        case "string":        //this derived measure is in a single top level folder
        case "object":
          if (iArr(folder) || iStr(folder)) { //this derived measure is in a subfolder.
            folderNode = this.getDerivedMeasureFolderNode(measure, folders, folder);
            break;
          }
        default:              //we don't know how to deal with this folder.
          throw "Invalid object for folder, expected array or string";
      }
      if (folderNode) {
        folderNode.conf.children.push(child);
      }
      else {
        children.push(child);
      }
    }
    for (folder in folders) {
      folderNode = folders[folder];
      children.push(folderNode);
    }
    return children;
  },
  renderMeasureNode: function(conf, row){
    var tooltipAndInfoLabel = this.createNodeTooltipAndInfoLabel(row.DESCRIPTION);
    var objectName = row.MEASURE_CAPTION || row.MEASURE_NAME;
    var title = objectName;
    var tooltip = tooltipAndInfoLabel.tooltip || title;
    title = title + tooltipAndInfoLabel.infoLabel;

    var measureTreeNodeId = this.getMeasureTreeNodeId(row.MEASURE_UNIQUE_NAME);
    var nodeConf = {
      parentTreeNode: conf.measuresTreeNode,
      classes: ["measure", "aggregator" + row.MEASURE_AGGREGATOR],
      sorted: true,
      id: measureTreeNodeId,
      objectName: objectName,
      title: title,
//      tooltip: tooltip,
      sorted: true,
      metadata: row
    };

    var state;
    var children = this.createDerivedMeasureTreeNodes(row, objectName);
    if (children && children.length) {
      nodeConf.children = children;
      state = TreeNode.states.collapsed;
    }
    else {
      state = TreeNode.states.leaf;
    }
    nodeConf.state = state;

    var measureNode = new TreeNode(nodeConf);
    return measureNode;
  },
  renderMeasureNodes: function(conf){
    var me = this;
    var measuresTreeNode = conf.measuresTreeNode;
    var measuresTreeNodeConf = measuresTreeNode.conf;
    var url = conf.url;
    var properties = {
      DataSourceInfo: conf.dataSourceInfo,
      Catalog: conf.catalog
    };
    var restrictions = {
      CATALOG_NAME: conf.catalog,
      CUBE_NAME: conf.cube
    };
    this.xmla.discoverMDMeasures({
      url: url,
      properties: properties,
      restrictions: restrictions,
      error: function(xmla, options, error){
        me.fireEvent("error", error);
      },
      success: function(xmla, options, rowset){
        //collect the measures so we can sort them
        var measures = [];
        rowset.eachRow(function(row){
          if (me.checkIsExcluded(options, row)) {
            return;
          }
          //https://technet.microsoft.com/en-us/library/ms126250(v=sql.110).aspx reads:
          //"MEASURE_IS_VISIBLE DBTYPE_BOOL A Boolean that always returns True. If the measure is not visible, it will not be included in the schema rowset."
          //so we might just as well not check for MEASURE_IS_VISIBLE it all.
          //Besides, SAP doesn't support it
          //if (!row.MEASURE_IS_VISIBLE) {
          //  return;
          //}
          measures.push(row);
        });

        //sort the measures
        measures.sort(function(a, b) {
          var labelA = a.MEASURE_CAPTION || a.MEASURE_NAME;
          var labelB = b.MEASURE_CAPTION || b.MEASURE_NAME;
          var ret;
          if (labelA > labelB) {
            ret = 1;
          }
          else
          if (labelA < labelB) {
            ret = -1;
          }
          else {
            ret = 0;
          }
          return ret;
        });
        //Add a treenode for each measure.
        for (var i = 0, n = measures.length; i < n; i++){
          me.renderMeasureNode(conf, measures[i]);
        }

        //All measures are now in the treeview. Let's add dimensions (beneath the measures level).
        //me.renderDimensionTreeNodes(conf);
      }
    });
  },
  getMeasuresTreeNodeId: function(){
    return "[Measures]";
  },
  renderMeasuresTreeNode: function(conf){
    var measuresTreeNode = new TreeNode({
      state: this.initialMeasuresTreeNodeState,
      parentElement: this.cubeTreePane.getDom(),
      classes: ["measures", "hierarchy", "dimensiontype" + Xmla.Rowset.MD_DIMTYPE_MEASURE],
      id: this.getMeasuresTreeNodeId(),
      title: gMsg("Measures"),
//      tooltip: gMsg("Measures")
    });
    return measuresTreeNode;
  },
  getCurrentCubeTreeNode: function(){
    var cubeTreeNode = this.currentCubeTreeNode;
    if (!cubeTreeNode) {
      cubeTreeNode = null;
    }
    return cubeTreeNode;
  },
  getCurrentCubeMetadata: function(){
    var currentCubeTreeNode = this.getCurrentCubeTreeNode();
    if (!currentCubeTreeNode) {
      return null;
    }
    return currentCubeTreeNode.conf.metadata;
  },
  getCurrentCatalogTreeNode: function(){
    var cubeTreeNode = this.getCurrentCubeTreeNode();
    if (!cubeTreeNode) {
      return null;
    }
    return cubeTreeNode.getParentTreeNode();
  },
  getCurrentCatalogMetadata: function(){
    var currentCatalogTreeNode = this.getCurrentCatalogTreeNode();
    if (!currentCatalogTreeNode) {
      return null;
    }
    return currentCatalogTreeNode.conf.metadata;
  },
  getCurrentDatasourceTreeNode: function(){
    var currentCatalogTreeNode = this.getCurrentCatalogTreeNode();
    if (!currentCatalogTreeNode) {
      return null;
    }
    return currentCatalogTreeNode.getParentTreeNode();
  },
  getCurrentDatasourceMetadata: function(){
    var currentDatasourceTreeNode = this.getCurrentDatasourceTreeNode();
    if (!currentDatasourceTreeNode) {
      return null;
    }
    return currentDatasourceTreeNode.conf.metadata;
  },
  getCurrentCube: function(){
    var currentCube = {
      cube: this.getCurrentCubeMetadata(),
      catalog: this.getCurrentCatalogMetadata(),
      datasource: this.getCurrentDatasourceMetadata()
    };
    return currentCube;
  },
  createShowDimensionNodesCheckbox: function(){
    var cubeTreePane = this.cubeTreePane;
    var cubeTreePaneDom = cubeTreePane.getDom();
    //checkbox to show / hide dimension level
    var showDimensionNodesCheckbox = this.showDimensionNodesCheckbox = cEl("INPUT", {
      type: "checkbox"
    });
    showDimensionNodesCheckbox.checked = !this.dimensionNodesInitiallyFlattened;
    listen(showDimensionNodesCheckbox, "click", this.showDimensionNodes, this);

    var div = cEl("DIV", {
      "class": "show-dimension-nodes" + (this.showDimensionNodesCheckboxDisplayed === false ? " hidden" : ""),
      id: "show-dimension-nodes"
    }, [ /*
      cEl("DIV", {
        "class": "tooltip"
      }, gMsg("Check to show multi-hierarchy dimension nodes. Uncheck to hide all dimension nodes.")), */
      showDimensionNodesCheckbox,
      cEl("SPAN", {
      }, gMsg("Show dimension nodes"))
    ]);
    cubeTreePaneDom.insertBefore(div, cubeTreePaneDom.firstChild);

    //initialize state of dimension tree nodes.
    this.showDimensionNodes(showDimensionNodesCheckbox.checked);
  },
  createShowHierarchyNodesCheckbox: function(){
    var cubeTreePane = this.cubeTreePane;
    var cubeTreePaneDom = cubeTreePane.getDom();
    //checkbox to show / hide dimension level
    var showHierarchyNodesCheckbox = this.showHierarchyNodesCheckbox = cEl("INPUT", {
      type: "checkbox"
    });
    showHierarchyNodesCheckbox.checked = this.initialHierarchyTreeNodeState !== TreeNode.states.flattened;
    listen(showHierarchyNodesCheckbox, "click", this.showHierarchyNodes, this);

    var div = cEl("DIV", {
      "class": "show-hierarchy-nodes" + (this.showHierarchyNodesCheckboxDisplayed === false ? " hidden" : ""),
      id: "show-hierarchy-nodes"
    }, [ /*
      cEl("DIV", {
        "class": "tooltip"
      }, gMsg("Check to show hierarchy nodes. Uncheck to hide all hierarchy nodes.")), */
      showHierarchyNodesCheckbox,
      cEl("SPAN", {
      }, gMsg("Show hierarchy nodes"))
    ]);
    cubeTreePaneDom.insertBefore(div, cubeTreePaneDom.firstChild);

    //initialize state of dimension tree nodes.
    //this.showHierarchyNodes(showHierarchyNodesCheckbox.checked);
  },
  doneLoadingCube: function(){
    this.collapseSchema();
    this.fadeInCubeTreePane();
    this.fireEvent("done");
    this.fireEvent("cubeLoaded");
    if (this.autoSelectCube) {
      this.autoSelectCube = null;
      this.fadeInSchemaTreePane();
    }

    this.renderSplitterBetweenMeasuresAndDimensions();
    
    var cubeTreePane = this.getCubeTreePane();
    var cubeTreePaneDom = cubeTreePane.getDom();
    
    var measuresTreeNode = this.getMeasuresTreeNode();
    measuresTreeNodeBodyDom = measuresTreeNode.getDomBody();
    var splitterPosition = Math.min(
      Math.floor(cubeTreePaneDom.clientHeight * .33), //max available height * 33%
      5 + measuresTreeNodeBodyDom.clientHeight  //max required height
    );
    this.measuresAndDimensionsSplitPane.setSplitterPosition(splitterPosition);
  },
  loadCube: function(cubeTreeNode){
    if (!(cubeTreeNode instanceof TreeNode)) {
      if (!iObj(cubeTreeNode)) {
        throw "Illegal object specified as cube";
      }
      if (iUnd(cubeTreeNode.datasource) || iUnd(cubeTreeNode.catalog) || iUnd(cubeTreeNode.cube)) {
        throw "Illegal object specified as cube";
      }
      cubeTreeNode = this.findCubeNode(cubeTreeNode);
      if (!cubeTreeNode) {
        throw "No treenode found for specified cube";
      }
    }
    this.cubeSelection._setSelection({
      oldSelection: this.cubeSelection.getSelection(),
      newSelection: [cubeTreeNode]
    });
    this.currentCubeTreeNode = cubeTreeNode;
    var me = this;
    this.fireEvent("busy");
    var xmla = this.xmla;

    this.clearCubeTreePane();

    var cubeTreePane = this.cubeTreePane;
    var cubeTreePaneDom = cubeTreePane.getDom();

    var cube = cubeTreeNode.conf.metadata;
    var cubeName = cube.CUBE_NAME;

    this.collapseSchema();
    this.hideCubeTreePane();    
    
    me.fireEvent("loadCube", cubeTreeNode);

    var catalogNode = cubeTreeNode.getParentTreeNode();
    var catalog = catalogNode.conf.metadata;
    var catalogName = catalog.CATALOG_NAME;

    var providerNode = catalogNode.getParentTreeNode();
    var metadata = providerNode.conf.metadata;
    var url = metadata.URL;
    var dataSourceInfo = metadata.DataSourceInfo;

    //static indicator of the current catalog and cube
    var currentCatalog = cEl("SPAN", {
      "class": "current-catalog" + (this.showCurrentCatalog === false ? " hidden" : ""),
      "data-objectName": catalogName
    });
    var cubeCaption = this.getCubeCaption(cube);
    var currentCube = cEl("SPAN", {
      "class": "current-cube" + (this.showCurrentCube === false ? " hidden" : ""),
      "data-objectName": cubeCaption
    });
    var currentCatalogAndCube = this.currentCatalogAndCube = cEl("DIV", {
      "class": "current-catalog-and-cube" + ((
        this.showCurrentCatalog === false &&
        this.showCurrentCube === false
      ) ? " hidden" : "")
    }, [currentCatalog, currentCube], cubeTreePaneDom);

    listen(currentCatalogAndCube, "click", function(e){
      var target = e.getTarget();
      if (hCls(target, "info-icon")) {
        this.fireEvent("requestinfo", {
          title: gAtt(target.parentNode, "data-objectName"),
          url: gAtt(target, "data-url"),
        });
      }
    }, this);

    var tooltipAndInfoLabel;

    tooltipAndInfoLabel = this.createNodeTooltipAndInfoLabel(catalog.DESCRIPTION);
    currentCatalog.innerHTML = catalogName + tooltipAndInfoLabel.infoLabel;
    /*
    cEl(
      "DIV", {
        "class": "tooltip"
      }, 
      tooltipAndInfoLabel.tooltip, 
      currentCatalog
    );
    */
    
    tooltipAndInfoLabel = this.createNodeTooltipAndInfoLabel(cube.DESCRIPTION);
    currentCube.innerHTML = cubeName + tooltipAndInfoLabel.infoLabel;
    /*
    cEl(
      "DIV", {
        "class": "tooltip"
      }, 
      tooltipAndInfoLabel.tooltip, 
      currentCube
    );
    */  
    var conf = {
      url: url,
      dataSourceInfo: dataSourceInfo,
      catalog: catalogName,
      cube: cubeName
    };

    var measuresTreeNode = this.renderMeasuresTreeNode();
    conf.measuresTreeNode = measuresTreeNode;
    this.renderMeasureNodes(conf);

    var dimensionsTreeNode = this.renderDimensionsTreeNode();
    conf.dimensionsTreeNode = dimensionsTreeNode;
    this.renderDimensionTreeNodes(conf);
    
  },
  renderSplitterBetweenMeasuresAndDimensions: function(){
    if (!this.splitterBetweenMeasuresAndDimensions) {
      return;
    }
    
    var cubeTreePane = this.cubeTreePane;
    var currentCatalogAndCube = this.currentCatalogAndCube;
    
    var measuresTreeNode = this.getMeasuresTreeNode();
    var dimensionsTreeNode = this.getDimensionsTreeNode();
    var measuresAndDimensionsSplitPane = this.measuresAndDimensionsSplitPane = new SplitPane({
      container: cubeTreePane,
      firstComponent: measuresTreeNode,
      secondComponent: dimensionsTreeNode,
      orientation: SplitPane.orientations.horizontal,
      style: {
        top: (currentCatalogAndCube.offsetTop + currentCatalogAndCube.offsetHeight) + "px"
      }
    });
    measuresAndDimensionsSplitPane.getDom();
  },
  getDom: function(){
    return this.splitPane.getDom();
  },
  getSchemaTreePane: function(){
    return this.schemaTreePane;
  },
  getCubeTreePane: function(){
    return this.cubeTreePane;
  },
  getSplitPane: function(){
    return this.splitPane;
  },
  getMeasuresAndDimensionsSplitPane: function(){
    return this.measuresAndDimensionsSplitPane;
  },
  collapseCube: function(){
    this.getSplitPane().collapse(this.getCubeTreePane().getDom());
  },
  collapseSchema: function(){
    this.getSplitPane().collapse(this.getSchemaTreePane().getDom());
  },
};

adopt(XmlaTreeView, Observable);

linkCss(cssDir + "xmlatreeview.css");
})();
