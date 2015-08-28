var XavierTab;

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
  this.closeable = iDef(conf.closeable) ? conf.closeable : true;
  this.component = this;

  this.initMetadata();

}).prototype = {
  forCube: true,
  queryDesigner: null,
  visualizer: null,
  isForCube: function(cube){
    var forCube;
    //first. check if this is the kind of tab that is associated with a cube.
    if ((this.conf.forCube || this.forCube)) {
      //it is. Now check if we're matching against a specific cube
      if (cube) {
        //yes. Check if the tab's cube matches the specified cube.
        if (!eq(this.getDatasource(), cube.datasource)) {
          forCube = false;
        }
        else
        if (!eq(this.getCatalog(), cube.catalog)) {
          forCube = false;
        }
        else
        if (!eq(this.getCube(), cube.cube)) {
          forCube = false;
        }
        else {
          forCube = true;
        }
      }
      else {
        //not matching against a specific cube.
        //Since this tab is a tab for some cube, we return true.
        forCube = true;
      }
    }
    else {
      forCube = false;
    }
    return forCube;
  },
  destroy: function(){
    if (this.toolbar) {
      this.toolbar.destroy();
    }
    this.clear();
    this.conf.tabPane = null;
    dEl(this.getId());

    var dataset = this.getDataset();
    if (dataset) {
      dataset.close();
    }

    var queryDesigner = this.getQueryDesigner();
    if (queryDesigner) {
      queryDesigner.destroy();
    }

    var visualizer = this.getVisualizer();
    if (visualizer && iFun(visualizer.destroy)) {
      visualizer.destroy();
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
  getDataset: function(){
    if (this.dataset) {
      return this.dataset;
    }
    var visualizer = this.getVisualizer();
    if (!visualizer) {
      return;
    }
    if (iFun(visualizer.getDataset)) {
      return visualizer.getDataset();
    }
    if (visualizer.dataset) {
      return visualizer.dataset;
    }
    //throw "Unsupported operation: getDataset";
    return null;
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
  getXlsxExporter: function(){
    return this.getTabPane().getXlsxExporter();
  },
  getXmla: function(){
    return this.getTabPane().getXmla();
  },
  getXmlaTreeView: function(){
    return this.getTabPane().getXmlaTreeView();
  },
  getXmlaMetadataFilter: function(){
    return this.getTabPane().getXmlaMetadataFilter();
  },
  getMandatoryDimensions: function(){
    var treeview = this.getXmlaTreeView();
    var filter = this.getXmlaMetadataFilter();
    var datasourceFilter = this.getDatasource();
    var requestTypeFilter = Xmla.MDSCHEMA_DIMENSIONS;

    var rules = [];
    filter.eachRequestTypeRuleRule(function(rule){
      var ifMatch = rule.ifMatch;
      if (iUnd(ifMatch) || iUnd(ifMatch.mandatory)) {
        return;
      }
      var mandatory = ifMatch.mandatory;
      var dimensions = [], matcher = rule.matcher;
      treeview.eachDimensionNode(function(treeNode, index){
        var metadata = treeNode.conf.metadata;
        if (filter.match(matcher, metadata)) {
          dimensions.push(metadata);
        }
      }, this);

      if (dimensions.length) {
        rules.push({
          description: rule.description,
          mandatory: mandatory,
          dimensions: dimensions
        });
      }

    }, this, datasourceFilter, requestTypeFilter);
    return rules;
  },
  getDnd: function(){
    return this.getTabPane().getDnd();
  },
  getAutoRunEnabled: function(){
    return this.getTabPane().getAutoRunEnabled();
  },
  initMetadata: function(){
    var tabPane = this.getTabPane();
    this.setCube({
      datasource: tabPane.getDatasource(),
      catalog: tabPane.getCatalog(),
      cube: tabPane.getCube()
    });
  },
  setCube: function(metadata){
    if (metadata.cube && metadata.catalog && metadata.datasource) {
      this.setDatasource(metadata.datasource);
      this.setCatalog(metadata.catalog);
      this.setCube(metadata.cube);
    }
    else {
      this.cube = metadata;
    }
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
  getMetadata: function(){
    return {
      datasource: this.getDatasource(),
      catalog: this.getCatalog(),
      cube: this.getCube()
    };
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
    if (this.dataset) {
      this.dataset.close();
      this.dataset = null;
    }
    else
    if (visualizer && visualizer.dataset) {
      visualizer.dataset.close();
      visualizer.dataset = null;
    }
  },
  executeQuery: function(){
    var me = this;
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
    try {
      busy(true);
      visualizer.clear();
      if (!queryDesigner.checkValid()) {
        busy(false);
        return;
      }
      this.doLayout();
      var datasource = this.getDatasource();
      var catalog = this.getCatalog();
      var cube = this.getCube();
      var mdx = queryDesigner.getMdx(cube.CUBE_NAME);
      //console.time("executeQuery");
      xmla.execute({
        url: datasource.URL,
        properties: {
          DataSourceInfo: datasource.DataSourceInfo,
          Catalog: catalog.CATALOG_NAME,
          Format: Xmla.PROP_FORMAT_MULTIDIMENSIONAL
        },
        statement: mdx,
        success: function(xmla, options, dataset){
          //console.timeEnd("executeQuery");
          try {
            //console.time("renderDataset");
            visualizer.renderDataset(dataset, queryDesigner);
            //console.timeEnd("renderDataset");
            busy(false);
          }
          catch (exception) {
            busy(false);
            showAlert(gMsg("Error rendering dataset"), exception.toString() || exception.message || gMsg("Unexpected error"));
          }
        },
        error: function(xmla, options, exception){
          //console.timeEnd("executeQuery");
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
  },
  exportToExcel: function(){
    busy(true);
    try {
      var visualizer = this.getVisualizer();
      var dataset = this.getDataset();
      var queryDesigner = this.getQueryDesigner();
      if (!visualizer || !queryDesigner || !dataset) {
        busy(false);
        throw "There is nothing to export. Please enter a query first.";
      }
      xlsxExporter = this.getXlsxExporter();
      var catalog = this.getCatalog();
      var cube = this.getCube();
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

      var last;
      if (measureNames.length) {
        last = measureNames.pop();
        name += measureNames.join(", ");
        if (measureNames.length) {
          name += " " + gMsg("and") + " ";
        }
        name += last;
      }
      function axisDescription(hierarchies){
        var last, name = "";
        last = hierarchies.pop();
        name += hierarchies.join(",");
        if (hierarchies.length) {
          name += " " + gMsg("and") + " ";
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
      by = queryDesigner.getAxisId(by);
      by = axes[by];
      var hasBy = by.length;
      if (hasBy) {
        if (last) {
          name += " " + gMsg("by") + " ";
        }
        name += axisDescription(by);
      }

      if (vs) {
        vs = axes[vs];
        if (vs && vs.length) {
          if (hasBy) {
            name += " " + gMsg("vs") + " ";
          }
          else {
          name += " " + gMsg("by") + " ";
          }
          name += axisDescription(vs);
        }
      }

      slicer = axes["SlicerAxis"];
      if (slicer && slicer.length) {
        name += " " + gMsg("for a selection of") + " " + axisDescription(slicer);
      }

      xlsxExporter.doExport(name, catalog.CATALOG_NAME, cube.CUBE_NAME, visualizer, queryDesigner);
    }
    catch (exception){
      busy(false);
      showAlert(gMsg("Export Error"), gMsg(exception));
    }
    busy(false);
  },
  createQueryDesigner: function(dom, tab){
    //noop
  },
  initQueryDesigner: function(dom, noRender){
    var queryDesigner = this.queryDesigner = this.createQueryDesigner(dom, this);

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

    var mandatoryDimensions = this.getMandatoryDimensions();
    queryDesigner.setMandatoryDimensions(mandatoryDimensions);

    if (noRender !== false) {
      queryDesigner.render();
    }

    return queryDesigner;
  }
};
XavierTab.id = 0;
XavierTab.prefix = "xavier-tab";
