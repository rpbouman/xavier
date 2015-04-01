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
/***************************************************************
*
*   QueryDesigner
*
***************************************************************/
var QueryDesigner;

(QueryDesigner = function(conf) {
    this.id = QueryDesigner.id++;
    this.conf = conf;
    this.axes = {};
    this.createAxes();
    QueryDesigner.instances[this.getId()] = this;
}).prototype = {
  defaultAxesConf: [
    {
      id: Xmla.Dataset.AXIS_COLUMNS,
      label: gMsg("Columns")
    },
    {
      id: Xmla.Dataset.AXIS_ROWS,
      label: gMsg("Rows")
    },
    {
      id: Xmla.Dataset.AXIS_SLICER,
      label: gMsg("Slicer")
    }
  ],
  highlightDropTargets: function(target, dragInfo){
    this.eachAxis(function(id, axis){
      if (axis.canDropItem(target, dragInfo)){
        axis.highlightValid();
      }
      else {
        axis.highlightInvalid();
      }
    });
  },
  unHighlightDropTargets: function(){
    this.eachAxis(function(id, axis){
      axis.removeHighlight();
    });
  },
  checkStartDrag: function(event, ddHandler){
    var target = event.getTarget();
    var queryDesignerAxis = QueryDesignerAxis.lookup(target);
    if (!queryDesignerAxis) {
      return false;
    }
    var queryDesigner = queryDesignerAxis.getQueryDesigner();
    if (queryDesigner !== this) {
      return false;
    }
    var metadata, className = target.className;
    className = className.split(" ")[0];
    var label = target.textContent || target.innerText;
    var classes = confCls(target.className);
    switch (className) {
      case "query-designer-axis-header":
        metadata = className;
        var table = target.parentNode.parentNode.parentNode;
        className = /query-designer-axis[012]/g.exec(table.className);
        classes = confCls(table.className);
        label = ({
          "query-designer-axis0": "Columns",
          "query-designer-axis1": "Rows",
          "query-designer-axisSlicerAxis": "Slicer"
        })[className];
        className = className[0];
        break;
      case "hierarchy":
      case "measures":
        var hierarchy = queryDesignerAxis.getHierarchyByName(target.id);
        metadata = hierarchy;
        break;
      case "measure":
      case "level":
      case "member":
      case "member-drilldown":
        var member = queryDesignerAxis.getMember(target.id);
        metadata = member.setDef.metadata;
        break;
      default:
        return false;
    }
    var dragInfo = {
      dragOrigin: this,
      queryDesignerAxis: queryDesignerAxis,
      classes: classes,
      className: className,
      metadata: metadata,
      label: label
    };
    return dragInfo;
  },
  eachAxis: function(callback, scope, ordered){
    var ids = [], id, axes = this.axes;
    for (id in axes) {
      ids.push(id);
    }
    //if ordered, then use natural order of axes (order by id)
    if (ordered) {
      ids.sort(function(a, b){
        if (a === Xmla.Dataset.AXIS_SLICER) {
          return (b === Xmla.Dataset.AXIS_SLICER) ? 0 : 1;
        }
        else
        if (a > b) {
          return 1;
        }
        else
        if (a < b) {
          return -1;
        }
        else {
          return 0;
        }
      })
    }
    var i, n = ids.length, axis;
    scope = scope || this;
    for (i = 0; i < n; i++) {
      id = ids[i];
      axis = axes[id];
      callback.call(scope, id, axis, i);
    }
  },
  swapAxes: function(axis1, axis2) {
    var id1 = axis1.conf.id;
    //swap the id
    axis1.conf.id = axis2.conf.id;
    axis2.conf.id = id1;

    //update the collection
    this.axes[axis1.conf.id] = axis1;
    QueryDesignerAxis.instances[axis1.getId()] = axis1;
    this.axes[axis2.conf.id] = axis2;
    QueryDesignerAxis.instances[axis2.getId()] = axis2;

    var dom = this.getDom(false);
    if (dom) {
      this.render();
    }
    this.fireEvent("changed");
  },
  clear: function() {
    for (var p in this.axes) {
        this.axes[p].reset();
    }
    this.dimensions = {};
    this.render();
  },
  addDimension: function(dimension, axis) {
    this.dimensions[dimension] = axis;
  },
  moveHierarchy: function(hierarchyName, fromAxis, toAxis, toIndex) {
    toAxis.importHierarchy(fromAxis, hierarchyName, toIndex);
  },
  createAxis: function(conf) {
    conf = merge(conf, {
      queryDesigner: this,
      layout: QueryDesignerAxis.layouts.horizontal
    });
    var axis = new QueryDesignerAxis(conf);
    this.axes[conf.id] = axis;
    axis.listen("changed", this.axisChanged, this);
  },
  createAxes: function() {
    var conf = this.conf, axisConf;
    var axesConf = conf.axes || this.defaultAxesConf;
    var i, n = axesConf.length;
    for (i = 0; i < n; i++){
      axisConf = axesConf[i];
      this.createAxis(axisConf);
    }
  },
  getAxis: function(id) {
    var axis = this.axes[id];
    if (!axis){
      throw "No such axis " + id;
    }
    return axis;
  },
  hasAxis: function(id){
    return Boolean(this.axes[id]);
  },
  hasColumnAxis: function(){
    return this.hasAxis(Xmla.Dataset.AXIS_COLUMNS);
  },
  getColumnAxis: function(){
    return this.getAxis(Xmla.Dataset.AXIS_COLUMNS);
  },
  hasRowAxis: function(){
    return this.hasAxis(Xmla.Dataset.AXIS_ROWS);
  },
  getRowAxis: function(){
    return this.getAxis(Xmla.Dataset.AXIS_ROWS);
  },
  hasPageAxis: function(){
    return this.hasAxis(Xmla.Dataset.AXIS_PAGES);
  },
  getPageAxis: function(){
    return this.getAxis(Xmla.Dataset.AXIS_PAGES);
  },
  hasChapterAxis: function(){
    return this.hasAxis(Xmla.Dataset.AXIS_CHAPTERS);
  },
  getChapterAxis: function(){
    return this.getAxis(Xmla.Dataset.AXIS_CHAPTERS);
  },
  hasSectionAxis: function(){
    return this.hasAxis(Xmla.Dataset.AXIS_SECTIONS);
  },
  getSectionAxis: function(){
    return this.getAxis(Xmla.Dataset.AXIS_SECTIONS);
  },
  hasSlicerAxis: function(){
    return this.hasAxis(Xmla.Dataset.AXIS_SLICER);
  },
  getSlicerAxis: function(){
    return this.getAxis(Xmla.Dataset.AXIS_SLICER);
  },
  getAxisForHierarchy: function(hierarchyUniqueName) {
    var ret = null;
    this.eachAxis(function(id, axis){
      if (axis.hasHierarchy(hierarchyUniqueName)) {
        ret = axis;
        return false;
      }
    });
    return ret;
  },
  hasHierarchy: function(hierarchyUniqueName){
    return Boolean(this.getAxisForHierarchy(hierarchyUniqueName))
  },
  getId: function() {
    return QueryDesigner.prefix + this.id;
  },
  createDom: function() {
    var id = this.getId(),
        dom = this.dom = cEl("TABLE", {
            id: id,
            "class": QueryDesigner.prefix,
            cellspacing: 0
        })
    ;
    this.eachAxis(function(index, axis){
      var r, c, conf = axis.conf;
      r = dom.insertRow(dom.rows.length);
      c = r.insertCell(r.cells.length);
      c.className = confCls(
        QueryDesignerAxis.prefix,
        QueryDesignerAxis.prefix + conf.id,
        conf
      ).join(" ");
      c.setAttribute("colspan", "100%");
      c.appendChild(axis.getDom());
      if (conf.tooltip) {
        cEl("DIV", {
          "class": "tooltip"
        }, conf.tooltip, c);
      }
    }, this);

    return dom;
  },
  getDom: function(create) {
    var el = gEl(this.getId());
    if (!el && create !== false) {
      el = this.createDom();
    }
    return el;
  },
  render: function() {
    var container = this.getContainer();
    container.innerHTML = "";
    aCh(container, this.getDom());
    var postfix;

    postfix = "-horizontal-drag-proxy";
    this.horizontalDragProxy = cEl("DIV", {
      id: this.getId() + postfix,
      "class": QueryDesigner.prefix + postfix
    }, null, container);

    postfix = "-vertical-drag-proxy";
    this.verticalDragProxy = cEl("DIV", {
      id: this.getId() + postfix,
      "class": QueryDesigner.prefix + postfix
    }, null, container);
    this.eachAxis(function(id, axis){
      axis.updateDom();
    });
  },
  getContainer: function() {
    return gEl(this.conf.container);
  },
  getMdx: function(cubeName){
    var mdx = "", gap = false, slicerMdx;
    if (this.eachAxis(function(id, axis){
      var axisMdx = "", isSlicer = axis.isSlicerAxis();
      axisMdx = axis.getMdx();
      if (isSlicer) {
        slicerMdx = axisMdx;
      }
      else {
        if (axisMdx === "") {
          gap = true;
        }
        else
        if (gap === true) {
          return false;
        }
        else {
          if (mdx){
            mdx += "\n,      ";
          }
          mdx += axisMdx;
        }
      }
      if (axisMdx === "" && axis.conf.mandatory === true) {
        return false;
      }
    }, this, true) === false) {
      return null;
    }
    mdx = "SELECT " + mdx + "\nFROM   [" + cubeName + "]";
    if (slicerMdx) {
      mdx += "\nWHERE " + slicerMdx;
    }
    return mdx;
  },
  axisChanged: function(axis, event, data) {
    this.fireEvent("changed", axis);
  }
};

adopt(QueryDesigner, Observable);

QueryDesigner.id = 0;
QueryDesigner.prefix = "query-designer";
QueryDesigner.instances = {};
QueryDesigner.getInstance = function(id){
  return QueryDesigner.instances[id];
};

QueryDesigner.lookup = function(el){
  while (el && (el.id.indexOf(QueryDesigner.prefix)===-1)) {
    if ((el = el.parentNode) === doc) {
      return null;
    }
  }
  return QueryDesigner.getInstance(el.id);
};

/***************************************************************
*
*   QueryDesignerAxis
*
***************************************************************/
var QueryDesignerAxis;
(QueryDesignerAxis = function(conf){
  this.conf = conf;
  this.reset();
  QueryDesignerAxis.instances[this.getId()] = this;
}).prototype = {
  getQueryDesigner: function() {
    return this.conf.queryDesigner;
  },
  reset: function() {
    this.hierarchies = [];
    this.dimensions = {};
    this.setDefs = {};
    this.updateDom();
  },
  getLayout: function() {
    return this.conf.layout;
  },
  getId: function(){
    return this.conf.queryDesigner.getId() + "-axis" + this.conf.id;
  },
  isSlicerAxis: function(){
    return this.conf.id === Xmla.Dataset.AXIS_SLICER;
  },
  createDom: function() {
    var conf = this.conf;
    var layout = this.getLayout();
    var id = this.getId();
    var dom = this.dom = cEl("TABLE", {
          cellspacing: 0,
          cellpadding: 2,
          id: id,
          "class": confCls(
            QueryDesignerAxis.prefix,
            QueryDesignerAxis.prefix + this.conf.id,
            QueryDesignerAxis.prefix + "-" + layout,
            this.conf
          )
      }),
      r = dom.insertRow(0),
      c = r.insertCell(0),
      t
    ;
    c.className = QueryDesignerAxis.prefix + "-header";
    sAtt(c, "colspan", "100%");
    switch (layout) {
      case QueryDesignerAxis.layouts.horizontal:
        break;
      case QueryDesignerAxis.layouts.vertical:
        dom.insertRow(1);
        dom.insertRow(2);
        break;
    }

    var canBeEmpty = iDef(conf.canBeEmpty) ? conf.canBeEmpty : true;
    switch (this.conf.id) {
      case Xmla.Dataset.AXIS_COLUMNS:
        label = gMsg("Columns");
        break;
      case Xmla.Dataset.AXIS_ROWS:
        label = gMsg("Rows");
        break;
      case Xmla.Dataset.AXIS_SLICER:
        label = gMsg("Slicer");
        canBeEmpty = false;
        break;
    }
    conf.canBeEmpty = canBeEmpty;
    c.innerHTML = conf.label || label;

    if (canBeEmpty) {
      var nonEmptyCheckbox = cEl("INPUT", {
        id: id + "-empty-checkbox",
        "class": "show-empty",
        title: "Show empty cells",
        type: "checkbox"
      }, null, c);
      var me = this;
      listen(nonEmptyCheckbox, "click", function(){
        me.fireEvent("changed");
      });
    }
    return dom;
  },
  updateDom: function() {
    switch (this.getLayout()) {
      case QueryDesignerAxis.layouts.vertical:
        this.updateDomVertical();
        break;
      case QueryDesignerAxis.layouts.horizontal:
        this.updateDomHorizontal();
        break;
    }
  },
  updateDomSetDefs: function(hierarchyName, c) {
    var hierarchySetDefs = this.getSetDefs(hierarchyName),
        j, m = hierarchySetDefs.length, setDef
    ;
    for (j = 0; j < m; j++) {
      setDef = hierarchySetDefs[j];
      var classes = [setDef.type, QueryDesignerAxis.prefix + "-item"];
      if (iDef(setDef.metadata.MEASURE_AGGREGATOR)){
        classes.push("aggregator" + setDef.metadata.MEASURE_AGGREGATOR);
      }
      var el = cEl("SPAN", {
        "class":  classes,
        title: setDef.expression,
        id: setDef.expression
      }, setDef.caption, c);
    }
  },
  updateDomVertical: function() {
    var hierarchies = this.hierarchies,
        hierarchy, hierarchyName,
        i, n = hierarchies.length,
        setDefs = this.setDefs, setDef,
        j, m,
        dom = this.getDom(),
        rows = dom.rows,
        r1 = rows[1], r2 = rows[2],
        c
    ;

    while (r1.cells.length) {
      r1.deleteCell(0);
      r2.deleteCell(0);
    }
    for (i = 0; i < n; i++) {
      hierarchy = hierarchies[i];
      hierarchyName = this.getHierarchyName(hierarchy);

      c = r1.insertCell(r1.cells.length);
      c.id = hierarchyName;
      c.innerHTML = this.getHierarchyCaption(hierarchy);
      c.className = this.getHierarchyName(hierarchy) === "Measures" ? "measures" : "hierarchy";
      c = r2.insertCell(r2.cells.length);

      this.updateDomSetDefs(hierarchyName, c);
    }
  },
  updateDomHorizontal: function() {
    var hierarchies = this.hierarchies,
        hierarchy, hierarchyName,
        i, n = hierarchies.length,
        setDefs = this.setDefs, setDef,
        j, m,
        dom = this.getDom(),
        rows = dom.rows,
        r, c
    ;
    while (rows.length > 1) {
      dom.deleteRow(rows.length - 1);
    }
    for (i = 0; i < n; i++) {
      hierarchy = hierarchies[i];
      hierarchyName = this.getHierarchyName(hierarchy);

      r = dom.insertRow(rows.length);
      r.className = "hierarchy";
      c = r.insertCell(0);
      c.id = hierarchyName;
      c.innerHTML = this.getHierarchyCaption(hierarchy);
      c.className = this.getHierarchyName(hierarchy) === "Measures" ? "measures" : "hierarchy";

      c = r.insertCell(1);
      this.updateDomSetDefs(hierarchyName, c);
    }
  },
  getDom: function() {
    var el = gEl(this.getId());
    if (!el) {
      el = this.createDom();
    }
    return el;
  },
  hasHierarchy: function(hierarchy) {
    return this.getHierarchyIndex(hierarchy)!==-1;
  },
  getHierarchyIndex: function(name) {
    for (var h = this.hierarchies, i = 0, n = h.length; i < n; i++){
      if (this.getHierarchyName(h[i]) === name) {
        return i;
      }
    }
    return -1;
  },
  getHierarchyIndexForTd: function(td) {
    td = gAnc(td, "TD");
    if (!td) {
      return null;
    }
    switch (this.getLayout()) {
      case QueryDesignerAxis.layouts.horizontal:
        return Math.floor(td.parentNode.rowIndex -1);
        break;
      case QueryDesignerAxis.layouts.vertical:
        if (td.className === "query-designer-axis-header") {
          return -1;
        }
        return Math.floor(td.cellIndex);
        break;
      default:
        return null;
    }
  },
  getMemberIndexForSpan: function(span) {
    var td = span.parentNode;
    if (td.tagName !== "TD") return null;
    var i, spans = gEls(td, "SPAN"), n = spans.length;
    for (i = 0; i < n; i++) {
      if (span === spans.item(i)) {
        return i;
      }
    }
    return -1;
  },
  getIndexesForTableCell: function(td) {
    var hierarchyIndex, tupleIndex;
    switch (this.getLayout()) {
      case QueryDesignerAxis.layouts.horizontal:
        hierarchyIndex = Math.floor(td.parentNode.rowIndex -1);
        tupleIndex = Math.floor((td.cellIndex - 2));
        break;
      case QueryDesignerAxis.layouts.vertical:
        hierarchyIndex = Math.floor(td.cellIndex);
        tupleIndex = Math.floor((td.parentNode.rowIndex - 2));
        break;
      default:
        return null;
    }
    return {
      hierarchyIndex: hierarchyIndex,
      tupleIndex: tupleIndex
    };
  },
  dropIncludes: function(name) {
    var item, conf = this.conf;
    if (!conf.drop) {
      return true;
    }

    item = conf.drop.exclude;
    if (item) {
      if (
        (iStr(item) && item === name) ||
        (iArr(item) && item.indexOf(name) !== -1)
      ) {
        return false;
      }
    }

    item = conf.drop.include;
    if (item) {
      if (
        (iStr(item) && item !== name) ||
        (iArr(item) && item.indexOf(name) === -1)
      ){
        return false;
      }
    }
    return true;
  },
  canDropItem: function(target, dragInfo) {
    var conf = this.conf,
        requestType = dragInfo.className,
        metadata = dragInfo.metadata
    ;
    if (!this.dropIncludes(requestType)) {
      return false;
    }
    //the item is an entire axis.
    if (metadata === "query-designer-axis-header") {
      //dropping an axis unto an axis means: swap the two axes.
      //we can do this only if the two axes are not the same.
      return !hCls(this.getDom().parentNode, requestType);
    }
    //if (target.tagName !== "TD") return;
    var dimensionName = this.getDimensionName(metadata),
        hierarchyName = this.getHierarchyName(metadata),
        axis,
        queryDesigner = this.getQueryDesigner()
    ;
    switch (requestType) {
      case "hierarchy":
      case "measures":
        if (dragInfo.dragOrigin instanceof QueryDesigner) {
          return true;
        }
        if (queryDesigner.hasHierarchy(hierarchyName)){
          return false;
        }
        //if this axis already has this hierarchy then we can't drop it again.
        if (this.hasHierarchy(hierarchyName)) {
          return false;
        }
        //if this axis already has a hierarchy with this dimension, then we can only replace
        if (this.dimensions[dimensionName] && target.className.indexOf("hierarchy")) {
          return false;
        }
        break;
      case "level":
      case "member":
      case "measure":
        axis = queryDesigner.getAxisForHierarchy(hierarchyName);
        if (axis && axis !== this) {
          //if the item has a hierarchy and the hierarchy is already present on another axis
          //then disallow drop.
          return false;
        }
        break;
      default:
        return false;
    }
    return true;
  },
  getMemberExpression: function(metadata, className) {
    if (metadata.MEMBER_UNIQUE_NAME) {
      var exp = metadata.MEMBER_UNIQUE_NAME;
      if (className === "member-drilldown") {
        exp += ".Children";
      }
      return exp;
    }
    if (metadata.MEASURE_UNIQUE_NAME) {
      return metadata.MEASURE_UNIQUE_NAME;
    }
    if (metadata.LEVEL_UNIQUE_NAME) {
      return metadata.LEVEL_UNIQUE_NAME + ".Members";
    }
    if (metadata.DEFAULT_MEMBER) {
      return metadata.DEFAULT_MEMBER;
    }
    if (metadata.DEFAULT_MEASURE) {
      return metadata.DEFAULT_MEASURE;
    }
    return null;
  },
  getDefaultMemberCaption: function(hierarchy) {
    var defaultMember = hierarchy.DEFAULT_MEMBER;
    if (!defaultMember || !defaultMember.indexOf(hierarchy.HIERARCHY_UNIQUE_NAME) + ".") {
      defaultMember = defaultMember.substr(hierarchy.HIERARCHY_UNIQUE_NAME.length + 1);
    }
    if (defaultMember[0]==="[" && defaultMember[defaultMember.length-1]==="]") {
      defaultMember = defaultMember.substr(1, defaultMember.length-2);
    }
    return defaultMember;
  },
  getMemberCaption: function(metadata) {
    if (metadata.MEMBER_CAPTION) {
      return metadata.MEMBER_CAPTION;
    }
    if (metadata.MEASURE_CAPTION) {
      return metadata.MEASURE_CAPTION;
    }
    if (metadata.LEVEL_CAPTION) {
      return metadata.LEVEL_CAPTION;
    }
    var caption;
    if (metadata.DEFAULT_MEMBER) {
      caption = metadata.DEFAULT_MEMBER.substr(metadata.HIERARCHY_UNIQUE_NAME.length + 1);
      if (caption[0] === "[") {
        caption = caption.substr(1, caption.length - 2);
      }
      return caption;
    }
    return null;
  },
  getHierarchyCaption: function(hierarchy) {
    if (hierarchy.HIERARCHY_CAPTION) {
      return hierarchy.HIERARCHY_CAPTION;
    }
    var name = this.getHierarchyName(hierarchy);
    if (/^\[[^\]]+\]$/.test(name)) {
      name = name.substr(1, name.length - 2);
    }
    return name;
  },
  getHierarchyName: function(hierarchy) {
    if (iInt(hierarchy)) {
      hierarchy = this.getHierarchyByIndex(hierarchy);
    }

    var hierarchyName;
    if (iStr(hierarchy)) {
      hierarchyName = hierarchy;
    }
    else
    if (hierarchy.DIMENSION_TYPE && hierarchy.DIMENSION_TYPE === Xmla.Rowset.MD_DIMTYPE_MEASURE) {
      hierarchyName = "Measures";
    }
    else
    if (hierarchy.HIERARCHY_UNIQUE_NAME) {
      hierarchyName = hierarchy.HIERARCHY_UNIQUE_NAME;
    }
    else {
      hierarchyName = "Measures";
    }
    return hierarchyName;
  },
  getDimensionName: function(hierarchy) {
    if (!hierarchy){
      debugger;
    }
    var dimensionName;
    if (hierarchy.DIMENSION_TYPE && hierarchy.DIMENSION_TYPE === Xmla.Rowset.MD_DIMTYPE_MEASURE) {
      dimensionName = "Measures";
    }
    else
    if (hierarchy.DIMENSION_UNIQUE_NAME) {
      dimensionName = hierarchy.DIMENSION_UNIQUE_NAME;
    }
    else {
      dimensionName = "Measures";
    }
    return dimensionName;
  },
  eachHierarchy: function(callback, scope){
    var i, hierarchies = this.hierarchies, n = hierarchies.length, hierarchy;
    for (i = 0; i < n; i++){
      hierarchy = hierarchies[i];
      if (callback.call(scope, hierarchy, i) === false) {
        return false;
      }
    }
    return true;
  },
  eachSetDef: function(callback, scope, hierarchy){
    if (hierarchy) {
      var hierarchyName = this.getHierarchyName(hierarchy);
      hierarchy = this.getHierarchyByName(hierarchyName);
      var hierarchyIndex = this.getHierarchyIndex(hierarchyName);
      var setDefs = this.getSetDefs(hierarchyName);
      var i, n = setDefs.length;
      for (i = 0; i < n; i++) {
        if (callback.call(scope, setDefs[i], i, hierarchy, hierarchyIndex) === false) {
          return false;
        }
      }
    }
    else {
      if (this.eachHierarchy(function(hierarchy, index){
        return this.eachSetDef(callback, scope, hierarchy);
      }, this) === false) {
        return false;
      }
    }
    return true;
  },
  getHierarchyByIndex: function(index) {
    return this.hierarchies[index];
  },
  getHierarchyByName: function(name) {
    var hierarchies = this.hierarchies,
        i, n = hierarchies.length, hierarchy
    ;
    for (i = 0; i < n; i++) {
      hierarchy = hierarchies[i];
      if (this.getHierarchyName(hierarchy) === name) {
        return hierarchy;
      }
    }
    return null;
  },
  getMemberByExpression: function(expression, index){
    var hierarchy, hierarchySetDefs, setDefs = this.setDefs, i, n, setDef;
    for (hierarchy in setDefs) {
        hierarchySetDefs = setDefs[hierarchy];
        n = hierarchySetDefs.length;
        if (iDef(index)) {
          if (index < n) {
            setDef = hierarchySetDefs[index];
            if (setDef.expression === expression) {
              return {
                hierarchy: hierarchy,
                setDef: setDef,
                index: index
              }
            }
            else {
              return null;
            }
          }
          else {
            return null;
          }
        }
        else {
          for (i = 0; i < n; i++){
            setDef = hierarchySetDefs[i];
            if (setDef.expression === expression) {
              return {
                hierarchy: hierarchy,
                setDef: setDef,
                index: i
              };
            }
          }
        }
    }
    return null;
  },
  getHierarchyCount: function(){
    return this.hierarchies.length;
  },
  _removeHierarchy: function(item){
    if (iObj(item)) {
      item = this.getHierarchyName(item);
    }
    if (iStr(item)) {
      item = this.getHierarchyIndex(item);
    }
    if (!iNum(item) || item === -1) {
      return false;
    }
    var hierarchy = this.getHierarchyByIndex(item);
    if (!hierarchy) return false;
    var hierarchyName = this.getHierarchyName(hierarchy);
    this.hierarchies.splice(item, 1);
    delete this.setDefs[hierarchyName];
    var dimension, dimensions = this.dimensions;
    for (dimension in dimensions) {
      if (dimensions[dimension] === hierarchyName) {
        delete dimensions[dimension];
        break;
      }
    }
    this.updateDom();
    return true;
  },
  removeHierarchy: function(item){
    var change = this._removeHierarchy(item);
    if (change) {
      this.fireEvent("changed");
    }
    return change;
  },
  clear: function(){
    var hierarchyCount = this.getHierarchyCount();
    this.reset();
    if (hierarchyCount) {
      this.fireEvent("changed");
    }
  },
  getMemberByIndexes: function(hierarchyIndex, memberIndex) {
    var hierarchyCount = this.getHierarchyCount();
    if (hierarchyIndex >= hierarchyCount) {
      return null;
    }
    var setDefs = this.getSetDefs(hierarchyIndex);
    if (memberIndex >= setDefs.length) {
      return null;
    }
    var hierarchy = this.getHierarchyByIndex(hierarchyIndex);
    var setDef = setDefs[memberIndex];
    return {
      hierarchy: hierarchy,
      setDef: setDef,
      index: memberIndex
    }
  },
  getMember: function(item, className) {
    if (iObj(item)) {
      item = this.getMemberExpression(item, className);
    }
    if (!iStr(item)) {
      return false;
    }
    return this.getMemberByExpression(item);
  },
  getMemberDescendants: function(metadata, type){
    var member;
    var members = [];
    var hierarchyName = this.getHierarchyName(metadata);
    var setDefs = this.setDefs[hierarchyName];
    var expression = this.getMemberExpression(metadata, type);
    var i, n = setDefs.length, setDef;
    for (i = 0; i < n; i++) {
      setDef = setDefs[i];
      if (setDef.expression === expression) {
        member = setDef;
        break;
      }
    }
    if (!member) {
      throw "Member not found";
    }
    var memberLevel;
    if (iDef(member.metadata.LEVEL_NUMBER)){
      memberLevel = member.metadata.LEVEL_NUMBER;
    }
    else
    if (member.metadata.ALL_MEMBER  === expression) {
      memberLevel = 0;
    }
    var index = expression.length - ".Children".length;
    if (expression.substr(index) === ".Children") {
      expression = expression.substr(0, index);
    }
    for (i = 0; i < n; i++) {
      setDef = setDefs[i];
      if (setDef === member) {
        continue;
      }
      if (memberLevel === 0) {
        members.push(setDef);
      }
      else
      if (setDef.expression.indexOf(expression) === 0) {
        members.push(setDef);
      }
    }
    return members;
  },
  _removeMember: function(item, className){
    var member = this.getMember(item, className);
    if (!member) {
      return false;
    }
    var metadata = member.setDef.metadata;
    var setDefs = this.getSetDefs(member.hierarchy);
    setDefs.splice(member.index, 1);
    var hierarchyIndex = this.getHierarchyIndex(member.hierarchy);
    if (!setDefs.length) {
      return this.removeHierarchy(hierarchyIndex);
    }
    this.updateDom();
    return true;
  },
  removeMember: function(metadata, type) {
    var change = false;
    //handle multi-item support.
    var items;
    if (iArr(metadata)) {
      //item is already an array
      items = metadata;
    }
    else {
      //item is a single item. Make it an array of items.
      items = [{
        metadata: metadata,
        type: type
      }];
    }
    //remove items.
    //TODO: currently, we report success if one or more items are removed.
    //there is no way to know if only some items got removed.
    var i, n = items.length, item;
    for (i = 0; i < n; i++) {
      item = items[i];
      metadata = item.metadata;
      type = item.type;
      if (this._removeMember(metadata, type)){
        change = true;
      }
    }
    //if some changes were made, send an event (so listener can re-execute the query)
    if (change) {
      this.fireEvent("changed");
    }
    return change;
  },
  getMemberInfo: function(requestType, metadata){
    var expression = this.getMemberExpression(metadata, requestType), caption;
    switch (requestType) {
      case "measures":
        caption = this.getMemberCaption(metadata);
        requestType = "measure";
        break;
      case "hierarchy":
        caption = this.getMemberCaption(metadata);
        requestType = "member";
        break;
      case "level":
        caption = metadata.LEVEL_CAPTION;
        break;
      case "member":
        caption = metadata.MEMBER_CAPTION;
        break;
      case "member-drilldown":
        caption = metadata.MEMBER_CAPTION;
        break;
      case "measure":
        caption = metadata.MEASURE_CAPTION;
        break;
    }
    return {
      expression: expression,
      caption: caption,
      type: requestType,
      metadata: metadata
    };
  },
  _addMember: function(memberIndex, requestType, metadata) {
    var memberInfo = this.getMemberInfo(requestType, metadata),
        hierarchyName = this.getHierarchyName(metadata),
        hierarchyIndex = this.getHierarchyIndex(hierarchyName),
        layout = this.getLayout(),
        dom = this.getDom(),
        r,c,memberList
    ;
    if (hierarchyIndex === -1) {
      throw "Hierarchy not present in this axis";
    }
    this.getSetDefs(hierarchyName).splice(memberIndex + 1, 0, memberInfo);
    this.updateDom();
  },
  addMember: function(memberIndex, requestType, metadata) {
    this._addMember(memberIndex, requestType, metadata);
    this.fireEvent("changed");
  },
  _addHierarchy: function(hierarchyIndex, metadata) {
    var hierarchyName = this.getHierarchyName(metadata),
        layout = this.getLayout()
    ;
    if (hierarchyIndex === -1) {
      hierarchyIndex = 0;
    }
    this.hierarchies.splice(hierarchyIndex, 0, metadata);
    this.dimensions[this.getDimensionName(metadata)] = hierarchyName;
    this.setDefs[hierarchyName] = [];
  },
  addHierarchy: function(hierarchyIndex, requestType, metadata) {
    this._addHierarchy(hierarchyIndex, metadata);
    return this.addMember(-1, requestType, metadata);
  },
  importHierarchy: function(axis, hierarchy, targetIndex){
    if (axis === this) {
      throw "Can't import to itself";
    }
    var hierarchyName = axis.getHierarchyName(hierarchy);
    var hierarchy = axis.getHierarchyByName(hierarchyName),
        setDefs = axis.setDefs[hierarchyName]
    ;
    if (!hierarchy) {
      throw "Hierarchy not found";
    }
    axis._removeHierarchy(hierarchyName);
    this._addHierarchy(targetIndex, hierarchy);
    this.setDefs[hierarchyName] = setDefs;
    this.updateDom();
    this.fireEvent("changed");
  },
  getSetDefs: function(hierarchy){
    if (iInt(hierarchy)){
      hierarchy = this.getHierarchyByIndex(hierarchy);
      hierarchy = this.getHierarchyName(hierarchy);
    }
    else
    if (iObj(hierarchy)) {
      hierarchy = this.getHierarchyName(hierarchy);
    }
    return this.setDefs[hierarchy];
  },
  getSetDefItemCount: function(hierarchyName){
    return this.getSetDefs(hierarchyName).length;
  },
  _moveMember: function(member, className, toIndex) {
    member = this.getMember(member, className);
    if (member.index === toIndex) {
      return false;
    }
    var setDefs = this.getSetDefs(member.hierarchy);
    setDefs.splice(member.index, 1);
    setDefs.splice(toIndex, 0, member.setDef);
    this.updateDom();
    return true;
  },
  moveMember: function(member, className, toIndex) {
    var change = this._moveMember(member, className, toIndex);
    if (change) {
      this.fireEvent("changed");
    }
  },
  _moveHierarchy: function(hierarchyName, newIndex) {
    var oldIndex = this.getHierarchyIndex(hierarchyName);
    if (oldIndex === newIndex) {
      return false;
    }
    var hierarchies = this.hierarchies,
        hierarchy = this.getHierarchyByIndex(oldIndex)
    ;
    hierarchies.splice(oldIndex, 1);
    hierarchies.splice(newIndex, 0, hierarchy);
    this.updateDom();
    return true;
  },
  moveHierarchy: function(hierarchyName, index) {
    if (index < 1) {
      index = 0;
    }
    hierarchyName = this.getHierarchyName(hierarchyName);
    if (this._moveHierarchy(hierarchyName, index)) {
      this.fireEvent("changed");
    }
  },
  getDropIndexes: function(target){
    var dropMemberIndex, dropHierarchyIndex;
    if (target.tagName === "SPAN") {
      dropMemberIndex = this.getMemberIndexForSpan(target);
      target = target.parentNode;
    }
    else {
      dropMemberIndex = -1;
    }

    if (target.tagName === "TD") {
      dropHierarchyIndex = this.getHierarchyIndexForTd(target);
    }
    return {
      dropMemberIndex: dropMemberIndex,
      dropHierarchyIndex: dropHierarchyIndex
    };
  },
  itemDropped: function(target, dragInfo) {
    var requestType = dragInfo.className,
        metadata = dragInfo.metadata,
        hierarchyName = this.getHierarchyName(metadata),
        hierarchyIndex = this.getHierarchyIndex(hierarchyName),
        dropIndexes, dropHierarchyName,
        memberType, memberExpression, memberCaption
    ;
    if (hCls(target, "show-empty")) {
      target = gAnc(target, "TD");
    }
    dropIndexes = this.getDropIndexes(target);
    if (typeof(dropIndexes.dropHierarchyIndex)==="undefined") {
      debugger;
      return;
    }
    if (hierarchyIndex === -1) {
      //if the hierarchy was not already in this axis, add it.
      this.addHierarchy(dropIndexes.dropHierarchyIndex+1, requestType, metadata);
    }
    else {
      //if the hierarchy is already present, add the member expression to the member list.
      var member = this.getMember(metadata);
      if (!member) {
        this.addMember(dropIndexes.dropMemberIndex, requestType, metadata);
      }
      else {
        this.moveMember(metadata, requestType, dropIndexes.dropMemberIndex);
      }
    }
  },
  getMdx: function(defaultSet) {
    var conf = this.conf,
        hierarchies = this.hierarchies, i, n = hierarchies.length,
        hierarchy, hierarchyName, minLevel, maxLevel,
        setDefs = this.setDefs, setDef, member, members,
        queryDesigner = this.getQueryDesigner(),
        mdx = "";
    ;
    for (i = 0; i < n; i++) {
      minLevel = null, maxLevel = null;
      hierarchy = hierarchies[i];
      hierarchyName = this.getHierarchyName(hierarchy);
      setDef = setDefs[hierarchyName];
      for (j = 0, m = setDef.length, members = ""; j < m; j++) {
        if (members.length) {
          members += ", ";
        }
        members += setDef[j].expression;
      }
      setDef = "{" + members + "}";
      if (hierarchyName !== "Measures" && !this.isSlicerAxis()) {
        setDef = "Hierarchize(" + setDef + ")";
      }
      mdx = mdx ? "CrossJoin(" + mdx + ", " + setDef + ")" : setDef;
    }
    if (!mdx.length && defaultSet) {
      mdx = defaultSet;
    }
    if (conf.id !== Xmla.Dataset.AXIS_SLICER) {
      if (mdx.length) {
        var nonEmpty = false;
        if (conf.canBeEmpty === true) {
          var emptyCheckBox = gEl(this.getId() + "-empty-checkbox");
          nonEmpty = emptyCheckBox && !emptyCheckBox.checked;
        }
        else {
          nonEmpty = true;
        }
        if (nonEmpty) {
          mdx = "NON EMPTY " + mdx;
        }
        var myIntrinsicProperties = this.conf.intrinsicProperties;
        if (myIntrinsicProperties) {
          var intrinsicProperties;
          if (iStr(myIntrinsicProperties)) {
            intrinsicProperties = myIntrinsicProperties;
          }
          else
          if (iArr(myIntrinsicProperties)) {
            intrinsicProperties = myIntrinsicProperties.join(", ");
          }
          else
          if (iObj(myIntrinsicProperties)){
            intrinsicProperties = "";
            var intrinsicProperty
            for (intrinsicProperty in myIntrinsicProperties) {
              if (intrinsicProperties.length) {
                intrinsicProperties += ", ";
              }
              intrinsicProperties += intrinsicProperty;
            }
          }
          mdx += " DIMENSION PROPERTIES " + intrinsicProperties;
        }
        mdx += " ON Axis(" + this.conf.id + ")";
      }
    }
    return mdx;
  },
  highlight: function(classToAdd, classToRemove) {
    var dom = this.getDom();
    rCls(dom, classToRemove);
    aCls(dom, classToAdd);
  },
  highlightValid: function() {
    this.highlight("valid-drop-axis", "invalid-drop-axis");
  },
  highlightInvalid: function() {
    this.highlight("invalid-drop-axis", "valid-drop-axis");
  },
  removeHighlight: function(){
    rCls(this.getDom(), ["valid-drop-axis", "invalid-drop-axis"]);
  }
};

adopt(QueryDesignerAxis, Observable);

QueryDesignerAxis.prefix = QueryDesigner.prefix + "-axis";
QueryDesignerAxis.layouts = {
  horizontal: "horizontal",
  vertical: "vertical",
};
QueryDesignerAxis.instances = {};
QueryDesignerAxis.getInstance = function(id){
  return QueryDesignerAxis.instances[id];
};

QueryDesignerAxis.lookup = function(el){
  while (el && (iUnd(el.className) || (iStr(el.className) && el.className.indexOf(QueryDesignerAxis.prefix + " ")))) {
    if ((el = el.parentNode) === doc) return null;
  }
  return QueryDesignerAxis.getInstance(el.id);
};

linkCss("../css/mdquerydesigner.css");
