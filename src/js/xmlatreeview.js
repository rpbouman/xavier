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
  this.splitPane = new SplitPane({
    classes: "xmlatreeview",
    firstComponent: this.schemaTreePane,
    secondComponent: this.cubeTreePane,
    orientation: SplitPane.orientations.horizontal
  });
  if (iDef(conf.catalogNodesInitiallyFlattened)) {
    this.catalogNodesInitiallyFlattened = conf.catalogNodesInitiallyFlattened;
  }
  if (iDef(conf.dimensionNodesInitiallyFlattened)) {
    this.dimensionNodesInitiallyFlattened = conf.dimensionNodesInitiallyFlattened;
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
  arguments.callee._super.apply(this, arguments);
}).prototype = {
  //maximum number of members to allow auto-loading of a level's members
  maxLowCardinalityLevelMembers: 10,
  //whether catalog nodes should initially be hidden
  catalogNodesInitiallyFlattened: true,
  //whether dimension nodes should initially be hidden
  dimensionNodesInitiallyFlattened: true,
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
  getDescriptionContentType: function(description){
    description = description.trim();
    var type;
    var len = description.length;
    //      protocol       domain name      ip address                port      path                resource         query name/value       anchor
    if (/^((https?:\/\/)?(((\w+)(\.[\w]+)*|(\d{1,3})(\.\d{1,3}){3})(:\d+)?)\/)?(([\w\.]|%\d\d)+\/)+(([\w\.]|%\d\d)+)(\?([\w\.=\&]|%\d\d)*)?(#\w*)?$/.test(description)) {
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
            tooltip: tooltipAndInfoLabel.tooltip || objectName,
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
        rowset.eachRow(function(row){
          if (me.checkIsExcluded(options, row)) {
            return;
          }
          var objectName = row.CUBE_CAPTION || row.CUBE_NAME;
          var title = objectName;
          var catalogPrefix = "<span class=\"label label-prefix\">" + catalog + "</span>";
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
            tooltip: tooltip,
            metadata: row,
            cubeMetaData: options.cubeMetaData
          });
          if (options.autoSelectCube === true && !me.autoSelectCube) {
            me.autoSelectCube = treeNode;
          }
        });
        if (!me.getShowCatalogNodesCheckbox().checked) {
          catalogNode.setState(TreeNode.states.flattened);
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
      "class": "show-catalog-nodes"
    }, [
      showCatalogNodesCheckbox,
      cEl("SPAN", {
      }, gMsg("Show catalog nodes")),
      cEl("DIV", {
        "class": "tooltip"
      }, gMsg("Check the box to display catalog nodes in the treeview. Uncheck to hide."))
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
    var cubeTreePaneDom = this.cubeTreePane.getDom();
    this.cubeTreeListener = new TreeListener({
      container: cubeTreePaneDom,
      listeners: {
        nodeClicked: function(treeListener, event, d){
          var target = d.event.getTarget();
          if (hCls(target, "info-icon")) {
            var url = gAtt(target, "data-url");
            this.fireEvent("requestinfo", {
              title: d.treeNode.conf.objectName,
              url: url,
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
    var schemaTreePane = this.schemaTreePane;
    this.clearTreePane(schemaTreePane);
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
  handleDataSources: function(datasources){
    if (datasources.length === 0) {
      this.indicateProgress(gMsg("No datasources found."));
      this.fireEvent("done");
      return;
    }
    var schemaTreePaneDom = this.schemaTreePane.getDom();
    var providerNodeQueue = [];
    providerNodeQueue.index = -1;
    providerNodeQueue.catalogNodeQueue = [];
    providerNodeQueue.catalogNodeQueue.index = -1;

    var i, n = datasources.length, datasource;
    for (i = 0; i < n; i++) {
      datasource = datasources[i];

      //Render MDP providers as treenodes.
      var dataSourceName = datasource.DataSourceName;
      var treeNode = new TreeNode({
        classes: "datasource",
        state: TreeNode.states.expanded,
        id: "datasource:" + dataSourceName,
        parentElement: schemaTreePaneDom,
        title: dataSourceName,
        tooltip: datasource.Description || dataSourceName,
        metadata: datasource
      });

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
  showCatalogNodes: function(event){
    var target = event.getTarget(), state;
    if (target.checked) {
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
    var cubeTreePane = this.cubeTreePane;
    var cubeTreePaneDom = cubeTreePane.getDom();
    var childNodes = cubeTreePaneDom.childNodes, n = childNodes.length, childNode, i;
    for (i = 0; i < n; i++) {
      childNode = childNodes[i];
      if (!hCls(childNode, "dimension")) {
        continue;
      }
      if (callback.call(scope, TreeNode.getInstance(childNode.id), i) === false) {
        return false;
      }
    }
    return true;
  },
  showDimensionNodes: function(event){
    var checked;
    if (typeof(event) === "boolean") {
      checked = event;
    }
    else {
      var target = event.getTarget();
      checked = target.checked;
    }
    var state;
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
  checkStartDrag: function(event, ddHandler){
    var target = event.getTarget();
    if (!hCls(target, "label")) {
      return false;
    }
    var treeNode = TreeNode.lookup(target);
    if (!treeNode) {
      return false;
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
        this.getCubeTreePane().getDom().style.overflow = "hidden";
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
          me.renderLevelMemberNode(conf, row);
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
  renderChildMemberNodes: function(conf){
    var me = this,
        url = conf.url,
        parentNode = conf.parentNode,
        parentNodeConf = parentNode.conf,
        metadata = parentNodeConf.metadata
    ;
    var properties = {
      DataSourceInfo: conf.dataSourceInfo,
      Catalog: metadata.CATALOG_NAME,
      Format: "Multidimensional",
      AxisFormat: "TupleFormat",
    };
    var mdx = "WITH MEMBER [Measures].numChildren " +
              "AS " + metadata.HIERARCHY_UNIQUE_NAME  + ".CurrentMember.Children.Count " +
              "SELECT CrossJoin(" + metadata.MEMBER_UNIQUE_NAME + ".Children," +
                      "[Measures].numChildren) ON COLUMNS " +
              "FROM [" + metadata.CUBE_NAME + "]"
    ;
    me.xmla.execute({
      url: url,
      properties: properties,
      statement: mdx,
      cube: metadata.CUBE_NAME,
      hierarchy: metadata.HIERARCHY_UNIQUE_NAME,
      metadata: metadata,
      //requestType: options.requestType,
      success: function(xmla, req, resp){
        var cellset = resp.getCellset();
        resp.getColumnAxis().eachTuple(function(tuple){
          cellset.nextCell();
          var childCount = cellset.cellValue(),
              metadata = req.metadata,
              member = tuple.members[0],
              memberUniqueName = member.UName,
              memberCaption = member.Caption,
              nodeId
          ;
          new TreeNode({
            id: parentNode.conf.id + ":" + memberUniqueName,
            parentTreeNode: parentNode,
            classes: "member",
            title: memberCaption,
            tooltip: memberUniqueName,
            state: childCount ? TreeNode.states.collapsed : TreeNode.states.leaf,
            metadata: merge({
              MEMBER_UNIQUE_NAME: memberUniqueName,
              MEMBER_CAPTION: memberCaption,
              LEVEL_UNIQUE_NAME: member.LName,
              LEVEL_NUMBER: member.LNum,
              CHILDREN_CARDINALITY: childCount
            }, metadata),
            loadChildren: function(callback){
              conf.parentNode = this;
              conf.callback = callback;
              me.renderChildMemberNodes(conf);
            }
          });
        });
        resp.close();
        conf.callback();
      },
      error: function(){
        conf.callback();
        debugger;
      }
    });
  },
  renderLevelMemberNode: function(conf, row){
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
    return new TreeNode({
      parentTreeNode: membersTreeNode,
      classes: "member",
      id: memberNodeId,
      tooltip: row.MEMBER_UNIQUE_NAME,
      title: row.MEMBER_CAPTION || row.MEMBER_NAME,
      metadata: row,
      loadChildren: function(callback){
        conf.parentNode = this;
        conf.callback = callback;
        me.renderChildMemberNodes(conf);
      }
    });
  },
  renderLevelMemberNodes: function(conf, callback, scope){
    var me = this;
    var membersTreeNode = conf.membersTreeNode;
    var row = membersTreeNode.conf.metadata;
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
    this.xmla.discoverMDMembers({
      url: url,
      properties: properties,
      restrictions: restrictions,
      success: function(xmla, options, rowset){
        //actually render the member tree nodes residing beneath the level tree nodes
        rowset.eachRow(function(row){
          me.renderLevelMemberNode(conf, row);
        });
        //done rendering member treenodes
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
  renderLevelMembersNode: function(conf, row){
    var me = this;
    var hierarchyTreeNode = conf.hierarchyTreeNode;
    var levelTreeNode = this.getLevelTreeNode(row.LEVEL_UNIQUE_NAME);
    var id = this.getLevelTreeNodeId(row.LEVEL_UNIQUE_NAME) + ":members";
    var title = row.LEVEL_CARDINALITY + " " + gMsg("Members");
    return new TreeNode({
      parentTreeNode: levelTreeNode,
      classes: "members",
      id: id,
      title: title,
      tooltip: title,
      metadata: row,
      state: TreeNode.states.collapsed,
      loadChildren: function(callback){
        conf.membersTreeNode = this;
        conf.callback = callback;
        me.renderLevelMemberNodes(conf, callback, this);
      }
    })
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
      tooltip: tooltip,
      state: state,
      metadata: row
    })
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
  renderLevelPropertyNodes: function(conf) {
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
        var levelMembersNodes = [];
        conf.levelsRowset.eachRow(function(row){
          //if (!row.LEVEL_IS_VISIBLE) {
          //return;
          //}
          var membersNode = me.renderLevelMembersNode(conf, row);
          var cardinality;
          //SAP thinks "All" levels could have a cardinality > 1, like, what the hell - 10.000
          if (row.LEVEL_TYPE === 1) { //1: MDLEVEL_TYPE_ALL
            cardinality = 1;
          }
          else {
            cardinality = row.LEVEL_CARDINALITY;
          }
          if (cardinality <= me.maxLowCardinalityLevelMembers) {
            levelMembersNodes.push(membersNode);
          }
        });

        var callback = conf.callback;
        delete conf.callback;

        me.flattenLevelMembersNodes(levelMembersNodes, 0, function(){
          callback();
          me.fireEvent("done");
        });

      },
      error: function(xmla, options, error){
        conf.callback();
        me.fireEvent("error", error);
      }
    });
  },
  renderLevelTreeNode: function(conf, row){
    var hierarchyTreeNode = conf.hierarchyTreeNode;
    var id = this.getLevelTreeNodeId(row.LEVEL_UNIQUE_NAME);
    var levelCaption = row.LEVEL_CAPTION;
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
    var state = row.LEVEL_TYPE === 1 ? TreeNode.states.flattened : TreeNode.states.expanded;
    return new TreeNode({
      parentTreeNode: hierarchyTreeNode,
      classes: ["level", "leveltype" + row.LEVEL_TYPE, "levelunicity" + row.LEVEL_UNIQUE_SETTINGS],
      id: id,
      objectName: objectName,
      title: title,
      tooltip: tooltip,
      metadata: row,
      state: state
    });
  },
  //levels with 10 members or less will get their members folder flattened.
  levelLowCardinality: 10,
  renderLevelTreeNodes: function(conf){
    var me = this;
    me.fireEvent("busy");
    var hierarchyTreeNode = conf.hierarchyTreeNode;
    var row = hierarchyTreeNode.conf.metadata;
    var hierarchyCaption = row.HIERARCHY_CAPTION;
    var url = conf.url;
    var properties = {
      DataSourceInfo: conf.dataSourceInfo,
      Catalog: row.CATALOG_NAME
    };
    var restrictions = {
      CATALOG_NAME: row.CATALOG_NAME,
      CUBE_NAME: row.CUBE_NAME,
      HIERARCHY_UNIQUE_NAME: row.HIERARCHY_UNIQUE_NAME
    };
    me.xmla.discoverMDLevels({
      url: conf.url,
      properties: properties,
      restrictions: restrictions,
      success: function(xmla, options, rowset){
        //create a treenode for each level
        rowset.eachRow(function(row){
          if (me.checkIsExcluded(options, row)) {
            return;
          }
          //https://technet.microsoft.com/en-us/library/ms126038(v=sql.110).aspx reads:
          //A Boolean that indicates whether the level is visible. Always returns True. If the level is not visible, it will not be included in the schema rowset.
          //So, we might as well not check it at all. Besides, SAP doesn't support it.
          //if (!row.LEVEL_IS_VISIBLE) {
          //  return;
          //}
          row.HIERARCHY_CAPTION = hierarchyCaption;
          me.renderLevelTreeNode(conf, row);
        });

        rowset.reset();
        conf.levelsRowset = rowset;

        me.renderLevelPropertyNodes(conf);
      },
      error: function(xmla, options, error){
        conf.callback();
        me.fireEvent("error", error);
      },
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
    return new TreeNode({
      state: TreeNode.states.expanded,
      parentElement: this.cubeTreePane.getDom(),
      classes: classes,
      id: "dimension:" + row.DIMENSION_UNIQUE_NAME,
      objectName: objectName,
      title: title,
      tooltip: tooltip,
      metadata: row
    });
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
            conf.measuresTreeNode.conf.metadata = row;
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
    return levelTreeNode.conf.metadata;
  },
  getDefaultMember: function(conf, defaultMemberQueue, defaultMemberQueueIndex){
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
        me.getDefaultMember(conf, defaultMemberQueue, ++defaultMemberQueueIndex);
      },
      error: function(xmla, options, error){
      }
    });
  },
  renderHierarchyTreeNode: function(conf, row){
    var me = this;
    var dimensionNode = TreeNode.getInstance("node:dimension:" + row.DIMENSION_UNIQUE_NAME);
    if (dimensionNode.isFlattened() && dimensionNode.getChildNodeCount() >= 1) {
      dimensionNode.setState(TreeNode.states.unflattened);
    }
    var dimensionTitle = dimensionNode.conf.objectName;
    var objectName = row.HIERARCHY_CAPTION || row.HIERARCHY_NAME;
    var hierarchyTitle = objectName;
    if (dimensionTitle !== hierarchyTitle) {
      hierarchyTitle = "<span class=\"label label-prefix\">" + dimensionTitle + "</span>" + hierarchyTitle;
    }
    var tooltipAndInfoLabel = this.createNodeTooltipAndInfoLabel(row.DESCRIPTION);
    var tooltip = tooltipAndInfoLabel.tooltip || hierarchyTitle;
    var title = hierarchyTitle+ tooltipAndInfoLabel.infoLabel;

    var hierarchyTreeNode = new TreeNode({
      state: TreeNode.states.collapsed,
      parentTreeNode: dimensionNode,
      classes: ["hierarchy", "dimensiontype" + row.DIMENSION_TYPE],
      id: this.getHierarchyTreeNodeId(row),
      objectName: objectName,
      title: title,
      tooltip: tooltip,
      metadata: row,
      loadChildren: function(callback) {
        //get the level of the hierarchy.
        conf.hierarchyTreeNode = this;
        conf.callback = callback;
        me.renderLevelTreeNodes(conf);
      }
    });
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
          //if the hierarchy is not visible, don't render it.
          if (iDef(row.HIERARCHY_IS_VISIBLE) && row.HIERARCHY_IS_VISIBLE === false) {
            return;
          }
          //actually add a treenode for the hierarchy.
          var hierarchyTreeNode = me.renderHierarchyTreeNode(conf, row);
          if (hasMultipleHierarchies === false && hierarchyTreeNode.getParentTreeNode().getChildNodeCount() > 1) {
            hasMultipleHierarchies = true;
          }
          if (row.DEFAULT_MEMBER) {
            defaultMemberQueue.push(hierarchyTreeNode);
          }
        });
        if (hasMultipleHierarchies) {
          me.createShowDimensionNodesCheckbox();
        }
        me.getDefaultMember(conf, defaultMemberQueue, 0);
        //done rendering hierarchy treenodes
      }
    });
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
  getDerivedMeasureTreeNodeId: function(measure, derivedMeasure) {
    var measureUniqueName = measure.MEASURE_UNIQUE_NAME;
    var measuresTreeNodeId = this.getMeasureTreeNodeId(measureUniqueName);
    var derivedMeasureName = derivedMeasure.name;
    var derivedMeasureTreeNodeId = measuresTreeNodeId + ":" + derivedMeasureName;
    return derivedMeasureTreeNodeId;
  },
  createDerivedMeasureTreeNode: function(derivedMeasure, measureCaption) {
    //TODO: put all this MDX and metadata related stuff in the query designer.
    //it doesn't really belong in the tree.
    //it also doesn't belong in the query designer but it's less of a misfit there.
    var measuresHierarchyUniqueName = QueryDesigner.prototype.measuresHierarchyName;
    var measure = derivedMeasure.derivedFrom;
    var measureName = measure.MEASURE_NAME;
    measureName = QueryDesignerAxis.prototype.stripBracesFromIdentifier(measureName);
    var name = gMsg(derivedMeasure.name, measureName);
    var caption = gMsg(derivedMeasure.captionMessageKey, measureCaption);


    derivedMeasure.MEASURE_CAPTION = caption;
    derivedMeasure.HIERARCHY_UNIQUE_NAME = measuresHierarchyUniqueName;
    derivedMeasure.MEASURE_NAME = name;
    derivedMeasure.MEASURE_UNIQUE_NAME = QueryDesignerAxis.prototype.braceIdentifier(measuresHierarchyUniqueName) +
                                         "." +
                                         //use the caption rather than the name because
                                         //mondrian does not support the CAPTION property for calc members.
                                         //QueryDesignerAxis.prototype.braceIdentifier(name);
                                         QueryDesignerAxis.prototype.braceIdentifier(caption);
    if (derivedMeasure.formatString) {
      derivedMeasure.DEFAULT_FORMAT_STRING = derivedMeasure.formatString;
    }

    var classes = ["derived-measure", "measure"];
    if (derivedMeasure.classes) {
      classes = classes.concat(derivedMeasure.classes);
    }
    var derivedMeasureTreeNode = new TreeNode({
      state: TreeNode.states.leaf,
      classes: classes,
      id: this.getDerivedMeasureTreeNodeId(measure, derivedMeasure),
      title: caption,
      tooltip: gMsg(derivedMeasure.tooltipMessageKey, measureCaption),
      metadata: derivedMeasure
    });
    return derivedMeasureTreeNode;
  },
  createDerivedMeasureTreeNodes: function(measure, measureCaption){
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
      derivedMeasure = merge({
        derivedFrom: measure
      }, derivedMeasures[i]);
      child = this.createDerivedMeasureTreeNode(derivedMeasure, measureCaption);
      children.push(child);
    }
    return children;
  },
  renderMeasureNode: function(conf, row){
    var tooltipAndInfoLabel = this.createNodeTooltipAndInfoLabel(row.DESCRIPTION);
    var objectName = row.MEASURE_CAPTION || row.MEASURE_NAME;
    var title = objectName;
    var tooltip = tooltipAndInfoLabel.tooltip || title;
    title = title + tooltipAndInfoLabel.infoLabel;

    var nodeConf = {
      parentTreeNode: conf.measuresTreeNode,
      classes: ["measure", "aggregator" + row.MEASURE_AGGREGATOR],
      id: this.getMeasureTreeNodeId(row.MEASURE_UNIQUE_NAME),
      objectName: objectName,
      title: title,
      tooltip: tooltip,
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
        me.renderDimensionTreeNodes(conf);
      }
    });
  },
  getMeasuresTreeNodeId: function(){
    return "[Measures]";
  },
  renderMeasuresNode: function(conf){
    var measuresTreeNode = new TreeNode({
      state: TreeNode.states.expanded,
      parentElement: this.cubeTreePane.getDom(),
      classes: ["measures", "hierarchy", "dimensiontype" + Xmla.Rowset.MD_DIMTYPE_MEASURE],
      id: this.getMeasuresTreeNodeId(),
      title: gMsg("Measures"),
      tooltip: gMsg("Measures")
    });
    conf.measuresTreeNode = measuresTreeNode;
    this.renderMeasureNodes(conf);
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
      "class": "show-dimension-nodes",
      id: "show-dimension-nodes"
    }, [
      cEl("DIV", {
        "class": "tooltip"
      }, gMsg("Check to show multi-hierarchy dimension nodes. Uncheck to hide all dimension nodes.")),
      showDimensionNodesCheckbox,
      cEl("SPAN", {
      }, gMsg("Show dimension nodes"))
    ]);
    cubeTreePaneDom.insertBefore(div, cubeTreePaneDom.firstChild);

    //initialize state of dimension tree nodes.
    this.showDimensionNodes(showDimensionNodesCheckbox.checked);
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
    var cubeTreePane = this.cubeTreePane;
    this.clearTreePane(cubeTreePane);
    var cubeTreePaneDom = cubeTreePane.getDom();
    this.hideCubeTreePane();

    var cube = cubeTreeNode.conf.metadata;
    var cubeName = cube.CUBE_NAME;

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
      "class": "current-catalog",
      "data-objectName": catalogName
    });
    var currentCube = cEl("SPAN", {
      "class": "current-cube",
      "data-objectName": cubeName
    });
    var currentCatalogAndCube =  cEl("DIV", {
      "class": "current-catalog-and-cube"
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
    cEl("DIV", {
      "class": "tooltip"
    }, tooltipAndInfoLabel.tooltip, currentCatalog);

    tooltipAndInfoLabel = this.createNodeTooltipAndInfoLabel(cube.DESCRIPTION);
    currentCube.innerHTML = cubeName + tooltipAndInfoLabel.infoLabel;
    cEl("DIV", {
      "class": "tooltip"
    }, tooltipAndInfoLabel.tooltip, currentCube);

    this.renderMeasuresNode({
      url: url,
      dataSourceInfo: dataSourceInfo,
      catalog: catalogName,
      cube: cubeName
    });
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
  collapseCube: function(){
    this.getSplitPane().collapse(this.getCubeTreePane().getDom());
  },
  collapseSchema: function(){
    this.getSplitPane().collapse(this.getSchemaTreePane().getDom());
  },
};

adopt(XmlaTreeView, Observable);

linkCss("../css/xmlatreeview.css");
})();
