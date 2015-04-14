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
}).prototype = {
  //whether catalog nodes should initially be hidden
  catalogNodesInitiallyFlattened: true,
  //whether dimension nodes should initially be hidden
  dimensionNodesInitiallyFlattened: true,
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
  init: function(){
    this.fireEvent("busy");
    var me = this;
    var xmla = me.xmla;
    var schemaTreePane = me.schemaTreePane;
    this.clearTreePane(schemaTreePane);
    var schemaTreePaneDom = schemaTreePane.getDom();

    var catalogQueueIndex = -1;
    var catalogQueue = [];

    function doCatalogQueue(){
      if (!(++catalogQueueIndex < catalogQueue.length)) return false;
      var providerNode = catalogQueue[catalogQueueIndex];
      var conf = providerNode.conf;
      var metadata = conf.metadata;
      xmla.discoverDBCatalogs({
        url: metadata.URL,
        properties: {
          DataSourceInfo: metadata.DataSourceInfo
        },
        error: function(xmla, options, error){
          me.fireEvent("error", error);
        },
        success: function(xmla, options, rowset){
          rowset.eachRow(function(row){
            var state = TreeNode.states.expanded;
            var treeNode = new TreeNode({
              classes: "catalog",
              state: state,
              id: conf.id + ":catalog:" + row.CATALOG_NAME,
              parentTreeNode: providerNode,
              title: row.CATALOG_NAME,
              tooltip: row.DESCRIPTION || row.CATALOG_NAME,
              metadata: row
            });
            cubeQueue.push(treeNode);
          });
          if (doCatalogQueue() === false) doCubeQueue();
        }
      });
    }

    var cubeQueueIndex = -1;
    var cubeQueue = [];
    function doCubeQueue(){
      if (!(++cubeQueueIndex < cubeQueue.length)) {
        me.fireEvent("done");
        return false;
      }
      var catalogNode = cubeQueue[cubeQueueIndex];
      var providerNode = catalogNode.getParentTreeNode();
      var conf = catalogNode.conf;
      var catalog = conf.metadata.CATALOG_NAME;
      var metadata = providerNode.conf.metadata;
      xmla.discoverMDCubes({
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
            var title = row.CUBE_CAPTION || row.CUBE_NAME;
            var catalogPrefix = "<span class=\"label label-prefix\">" + catalog + "</span>";
            title = catalogPrefix + title;
            var treeNode = new TreeNode({
              classes: "cube",
              state: TreeNode.states.leaf,
              id: conf.id + ":cube:" + row.CUBE_NAME,
              parentTreeNode: catalogNode,
              title: title,
              tooltip: row.DESCRIPTION || row.CUBE_NAME,
              metadata: row
            });
          });
          if (!showCatalogNodesCheckbox.checked) {
            catalogNode.setState(TreeNode.states.flattened);
          }
          doCubeQueue();
        }
      });
    }

    var showCatalogNodesCheckbox = cEl("INPUT", {
      type: "checkbox"
    });
    showCatalogNodesCheckbox.checked = !this.catalogNodesInitiallyFlattened;
    listen(showCatalogNodesCheckbox, "click", this.showCatalogNodes, this);

    cEl("DIV", {
      "class": "show-catalog-nodes"
    }, [
      showCatalogNodesCheckbox,
      cEl("SPAN", {
      }, gMsg("Show catalog nodes"))
    ], schemaTreePaneDom);

    xmla.discoverDataSources({
      error: function(xmla, options, error){
        me.fireEvent("error", error);
      },
      success: function(xmla, options, rowset){
        rowset.eachRow(function(row){
          //first, check the provider type.
          //we only handle MDP providers (OLAP)
          var isMDP = false;
          var providerType = row.ProviderType;
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
          var url = parseUri(row.URL);
          if (url.isRelative) {
            var url = row.URL;
            row.URL = options.url;
            //If the original url does not end with a slash, add it.
            if (options.url.charAt(options.url.length - 1) !== "/") {
              row.URL += "/";
            }
            row.URL += url;
          }

          //For now, overwrite the value of the URL field.
          //Too many servers misbehave when they return an actual value
          //see http://issues.iccube.com/issue/ic3pub-62
          row.URL = options.url;

          //Render MDP providers as treenodes.
          var treeNode = new TreeNode({
            classes: "datasource",
            state: TreeNode.states.expanded,
            id: "datasource:" + row.DataSourceName,
            parentElement: schemaTreePaneDom,
            title: row.DataSourceName,
            tooltip: row.Description || row.DataSourceName,
            metadata: row
          });

          //push to the queue so we can find the catalogs in a next round.
          catalogQueue.push(treeNode);
        });
        doCatalogQueue();
      }
    });
    this.schemaTreeListener = new TreeListener({container: this.schemaTreePane.getDom()});
    this.cubeSelection = new TreeSelection({treeListener: this.schemaTreeListener});
    this.cubeSelection.listen("selectionChanged", function(cubeSelection, event, data){
      if (!data.newSelection || !data.newSelection.length) return;
      var selection = data.newSelection[0];
      switch (selection.conf.classes) {
        case "cube":
          this.loadCube(selection);
          break;
        default:
      }
    }, this);
    this.cubeTreeListener = new TreeListener({container: this.cubeTreePane.getDom()});
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
  showCatalogNodes: function(event){
    var target = event.getTarget(), state;
    if (target.checked) {
      state = TreeNode.states.unflattened;
    }
    else {
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
    var target = event.getTarget(), state;
    if (target.checked) {
      state = TreeNode.states.unflattened;
    }
    else {
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
    switch (className) {
      case "measure":
      case "measures":
      case "hierarchy":
      case "level":
      case "member":
      case "property":
        this.getCubeTreePane().getDom().style.overflow = "hidden";
        break;
      default:
        return false;
    }
    return {
      dragOrigin: this,
      label: treeNode.getTitle(),
      metadata: treeNode.conf.metadata,
      classes: classes,
      className: className
    };
  },
  notifyEndDrag: function(event, dndHandler){
    this.getCubeTreePane().getDom().style.overflow = "";
  },
  renderAllLevel: function(conf, level) {
    var me = this;
    var hierarchyTreeNode = conf.hierarchyTreeNode;
    var idPostfix =  ":level:" + level.LEVEL_UNIQUE_NAME;
    var levelTreeNode = TreeNode.getInstance(hierarchyTreeNode.getId() + idPostfix);
    conf.levelTreeNode = levelTreeNode;
    var hierarchyMetaData = hierarchyTreeNode.conf.metadata;
    var url = conf.url;
    var properties = {
      DataSourceInfo: conf.dataSourceInfo,
      Catalog: conf.catalog
    };
    var restrictions = {
      CUBE_NAME: conf.cube,
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
    var me = this;
    var url = conf.url;
    var properties = {
      DataSourceInfo: conf.dataSourceInfo,
      Catalog: conf.catalog,
      Format: "Multidimensional",
      AxisFormat: "TupleFormat",
    };
    var parentNode = conf.parentNode,
        parentNodeConf = parentNode.conf,
        metadata = parentNodeConf.metadata,
        mdx = "WITH MEMBER [Measures].numChildren " +
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
      Catalog: conf.catalog,
      Format: "Multidimensional",
      AxisFormat: "TupleFormat",
    };
    var restrictions = {
      CUBE_NAME: conf.cube,
      HIERARCHY_UNIQUE_NAME: row.HIERARCHY_UNIQUE_NAME,
      LEVEL_UNIQUE_NAME: row.LEVEL_UNIQUE_NAME
    };
    var memberNodeId = membersTreeNode.conf.id  + ":" + row.MEMBER_UNIQUE_NAME;
    new TreeNode({
      parentTreeNode: membersTreeNode,
      classes: "member",
      id: memberNodeId,
      title: row.MEMBER_CAPTION || row.MEMBER_NAME,
      metadata: row,
      loadChildren: function(callback){
        conf.parentNode = this;
        conf.callback = callback;
        me.renderChildMemberNodes(conf);
      }
    });
  },
  renderLevelMemberNodes: function(conf){
    var me = this;
    var membersTreeNode = conf.membersTreeNode;
    var row = membersTreeNode.conf.metadata;
    var url = conf.url;
    var properties = {
      DataSourceInfo: conf.dataSourceInfo,
      Catalog: conf.catalog
    };
    var restrictions = {
      CUBE_NAME: conf.cube,
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
        conf.callback();
        me.fireEvent("done");
      },
      error: function(xmla, options, error){
        conf.callback();
        me.fireEvent("error", error);
      }
    });
  },
  renderLevelMembersNode: function(conf, row){
    var me = this;
    var hierarchyTreeNode = conf.hierarchyTreeNode;
    var idPostfix =  ":level:" + row.LEVEL_UNIQUE_NAME;
    var id = hierarchyTreeNode.conf.id + idPostfix;
    new TreeNode({
      parentTreeNode: TreeNode.getInstance(hierarchyTreeNode.getId() + idPostfix),
      classes: "members",
      id: id + ":members",
      title: gMsg("Members"),
      tooltip: gMsg("Members"),
      metadata: row,
      state: TreeNode.states.collapsed,
      loadChildren: function(callback){
        conf.membersTreeNode = this;
        conf.callback = callback;
        me.renderLevelMemberNodes(conf);
      }
    })
  },
  renderLevelPropertyNode: function(conf, row) {
    var me = this;
    var hierarchyTreeNode = conf.hierarchyTreeNode;
    var idPostfix =  ":level:" + row.LEVEL_UNIQUE_NAME;
    var levelTreeNode = TreeNode.getInstance(hierarchyTreeNode.getId() + idPostfix);
    var id = hierarchyTreeNode.conf.id + idPostfix;
    if (!levelTreeNode) {
      //the level tree node might not have been created if it was marked as not visible
      return;
    }
    new TreeNode({
      parentTreeNode: levelTreeNode,
      classes: "property",
      id: id + ":property:" + row.PROPERTY_NAME,
      title: row.PROPERTY_CAPTION || row.PROPERTY_NAME,
      state: TreeNode.states.leaf,
      metadata: row
    })
  },
  renderLevelPropertyNodes: function(conf) {
    var me = this;
    var hierarchyTreeNode = conf.hierarchyTreeNode;
    var hierarchyMetaData = hierarchyTreeNode.conf.metadata;
    var url = conf.url;
    var properties = {
      DataSourceInfo: conf.dataSourceInfo,
      Catalog: conf.catalog
    };
    var restrictions = {
      CUBE_NAME: conf.cube,
      HIERARCHY_UNIQUE_NAME: hierarchyMetaData.HIERARCHY_UNIQUE_NAME
    };
    me.xmla.discoverMDProperties({
      url: url,
      properties: properties,
      restrictions: restrictions,
      success: function(xmla, options, rowset){
        rowset.eachRow(function(row){
          me.renderLevelPropertyNode(conf, row);
        });
        conf.levelsRowset.eachRow(function(row){
          if (!row.LEVEL_IS_VISIBLE) {
            return;
          }
          if (row.LEVEL_TYPE === 1){  //All level
            me.renderAllLevel(conf, row);
          }
          else {
            me.renderLevelMembersNode(conf, row);
          }
        });
        conf.callback();
        me.fireEvent("done");
      },
      error: function(xmla, options, error){
        conf.callback();
        me.fireEvent("error", error);
      }
    });
  },
  renderLevelTreeNode: function(conf, row){
    var me = this;
    var hierarchyTreeNode = conf.hierarchyTreeNode;
    var id = hierarchyTreeNode.conf.id + ":level:" + row.LEVEL_UNIQUE_NAME;
    var levelCaption = row.LEVEL_CAPTION;
    var url = conf.url;
    var properties = {
      DataSourceInfo: conf.dataSourceInfo,
      Catalog: conf.catalog
    };
    var restrictions = {
      CUBE_NAME: conf.cube,
      HIERARCHY_UNIQUE_NAME: row.HIERARCHY_UNIQUE_NAME,
      LEVEL_UNIQUE_NAME: row.LEVEL_UNIQUE_NAME
    };
    new TreeNode({
      parentTreeNode: hierarchyTreeNode,
      classes: ["level", "leveltype" + row.LEVEL_TYPE, "levelunicity" + row.LEVEL_UNIQUE_SETTINGS],
      id: id,
      title: row.LEVEL_CAPTION || row.LEVEL_NAME,
      metadata: row,
      state: TreeNode.states.expanded
    });
  },
  renderLevelTreeNodes: function(conf){
    var me = this;
    me.fireEvent("busy");
    var hierarchyTreeNode = conf.hierarchyTreeNode;
    var row = hierarchyTreeNode.conf.metadata;
    var hierarchyCaption = row.HIERARCHY_CAPTION;
    var url = conf.url;
    var properties = {
      DataSourceInfo: conf.dataSourceInfo,
      Catalog: conf.catalog
    };
    var restrictions = {
      CUBE_NAME: conf.cube,
      HIERARCHY_UNIQUE_NAME: row.HIERARCHY_UNIQUE_NAME
    };
    me.xmla.discoverMDLevels({
      url: conf.url,
      properties: properties,
      restrictions: restrictions,
      success: function(xmla, options, rowset){
        //create a treenode for each level
        rowset.eachRow(function(row){
          if (!row.LEVEL_IS_VISIBLE) {
            return;
          }
          row.HIERARCHY_CAPTION = hierarchyCaption;
          me.renderLevelTreeNode(conf, row);
        });
        rowset.reset();
        conf.levelsRowset = rowset;
        //render property nodes for the levels
        me.renderLevelPropertyNodes(conf);
      },
      error: function(xmla, options, error){
        conf.callback();
        me.fireEvent("error", error);
      },
    });
  },
  renderDimensionTreeNode: function(conf, row){
    var me = this;
    var classes = ["dimension", "dimensiontype" + row.DIMENSION_TYPE, TreeNode.states.flattened];
    new TreeNode({
      state: TreeNode.states.expanded,
      parentElement: me.cubeTreePane.getDom(),
      classes: classes,
      id: "dimension:" + row.DIMENSION_UNIQUE_NAME,
      title: row.DIMENSION_CAPTION,
      tooltip: row.DESCRIPTION || row.DIMENSION_CAPTION || row.DIMENSION_NAME,
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
          //if this dimension happens to be a measure dimension, don't render it.
          //We already have measures
          if (row.DIMENSION_TYPE === Xmla.Rowset.MD_DIMTYPE_MEASURE) {
            conf.measuresTreeNode.conf.metadata = row;
            return;
          }
          //actually add a treenode for the hierarchy.
          me.renderDimensionTreeNode(conf, row);
        });
        //add hierarchies
        me.renderHierarchyTreeNodes(conf);
        //done rendering hierarchy treenodes
        me.fireEvent("done");
      }
    });
  },
  renderHierarchyTreeNode: function(conf, row){
    var me = this;
    var dimensionNode = TreeNode.getInstance("node:dimension:" + row.DIMENSION_UNIQUE_NAME);
    if (this.showDimensionNodesCheckbox.checked && dimensionNode.isFlattened() && dimensionNode.getChildNodeCount() >= 1) {
      dimensionNode.setState(TreeNode.states.unflattened);
    }
    var dimensionTitle = dimensionNode.getTitle();
    var hierarchyTitle = row.HIERARCHY_CAPTION;
    if (dimensionTitle !== hierarchyTitle) {
      hierarchyTitle = "<span class=\"label label-prefix\">" + dimensionTitle + "</span>" + hierarchyTitle;
    }

    new TreeNode({
      state: TreeNode.states.collapsed,
      parentTreeNode: dimensionNode,
      classes: ["hierarchy", "dimensiontype" + row.DIMENSION_TYPE],
      id: "hierarchy:" + row.HIERARCHY_UNIQUE_NAME,
      title: hierarchyTitle,
      tooltip: row.DESCRIPTION || row.HIERARCHY_CAPTION || row.HIERARCHY_NAME,
      metadata: row,
      loadChildren: function(callback) {
        //get the level of the hierarchy.
        conf.hierarchyTreeNode = this;
        conf.callback = callback;
        me.renderLevelTreeNodes(conf);
      }
    });
  },
  renderHierarchyTreeNodes: function(conf){
    var me = this;
    var url = conf.url;
    var properties = {
      DataSourceInfo: conf.dataSourceInfo,
      Catalog: conf.catalog
    };
    var restrictions = {
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
        rowset.eachRow(function(row){
          //if this hierarchy happens to be a measure hierarchy, don't render it.
          //We already have measures
          if (row.DIMENSION_TYPE === Xmla.Rowset.MD_DIMTYPE_MEASURE) {
            conf.measuresTreeNode.conf.metadata = row;
            return;
          }
          else
          //if the hierarchy is not visible, don't render it.
          if (!row.HIERARCHY_IS_VISIBLE || !row.DIMENSION_IS_VISIBLE) {
            return;
          }
          //actually add a treenode for the hierarchy.
          me.renderHierarchyTreeNode(conf, row);
        });
        //done rendering hierarchy treenodes
        me.fireEvent("done");
      }
    });
  },
  renderMeasureNode: function(conf, row){
    new TreeNode({
      state: TreeNode.states.leaf,
      parentTreeNode: conf.measuresTreeNode,
      classes: ["measure", "aggregator" + row.MEASURE_AGGREGATOR],
      id: "measure:" + row.MEASURE_UNIQUE_NAME,
      title: row.MEASURE_CAPTION || row.MEASURE_NAME,
      tooltip: row.DESCRIPTION || row.MEASURE_CAPTION || row.MEASURE_NAME,
      metadata: row
    });
  },
  renderMeasureNodes: function(conf){
    var me = this;
    var measuresTreeNode = conf.measuresTreeNode;
    var url = conf.url;
    var properties = {
      DataSourceInfo: conf.dataSourceInfo,
      Catalog: conf.catalog
    };
    var restrictions = {
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
          if (!row.MEASURE_IS_VISIBLE) {
            return;
          }
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
  renderMeasuresNode: function(conf){
    conf.measuresTreeNode = new TreeNode({
      state: TreeNode.states.expanded,
      parentElement: this.cubeTreePane.getDom(),
      classes: ["hierarchy", "dimensiontype" + Xmla.Rowset.MD_DIMTYPE_MEASURE],
      id: "measures",
      title: gMsg("Measures"),
      tooltip: gMsg("Measures")
    });
    this.renderMeasureNodes(conf);
  },
  loadCube: function(cubeTreeNode){
    this.collapseSchema();
    var me = this;
    this.fireEvent("busy");
    var xmla = this.xmla;
    var cubeTreePane = this.cubeTreePane;
    this.clearTreePane(cubeTreePane);
    var cubeTreePaneDom = cubeTreePane.getDom();

    var cube = cubeTreeNode.conf.metadata.CUBE_NAME;
    me.fireEvent("cubeSelected", cubeTreeNode);
    var catalogNode = cubeTreeNode.getParentTreeNode();
    var catalog = catalogNode.conf.metadata.CATALOG_NAME;
    var providerNode = catalogNode.getParentTreeNode();
    var metadata = providerNode.conf.metadata;
    var url = metadata.URL;
    var dataSourceInfo = metadata.DataSourceInfo;

    //checkbox to show / hide dimension level
    var showDimensionNodesCheckbox = this.showDimensionNodesCheckbox = cEl("INPUT", {
      type: "checkbox"
    });
    showDimensionNodesCheckbox.checked = !this.dimensionNodesInitiallyFlattened;
    listen(showDimensionNodesCheckbox, "click", this.showDimensionNodes, this);

    cEl("DIV", {
      "class": "show-dimension-nodes"
    }, [
      cEl("DIV", {
        "class": "tooltip"
      }, gMsg("Check to show multi-hierarchy dimension nodes. Uncheck to hide all dimension nodes.")),
      showDimensionNodesCheckbox,
      cEl("SPAN", {
      }, gMsg("Show dimension nodes"))
    ], cubeTreePaneDom);

    //static indicator of the current catalog and cube
    cEl("DIV", {
      "class": "current-catalog-and-cube"
    }, [
      cEl("SPAN", {
        "class": "current-catalog"
      }, catalog),
      cEl("SPAN", {
        "class": "current-cube"
      }, cube)
    ], cubeTreePaneDom);

    this.renderMeasuresNode({
      url: url,
      dataSourceInfo: dataSourceInfo,
      catalog: catalog,
      cube: cube
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
  }
};

adopt(XmlaTreeView, Observable);

linkCss("../css/xmlatreeview.css");
})();
