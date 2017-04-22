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
/***************************************************************
*
*   QueryDesigner
*
***************************************************************/
var QueryDesigner;

(QueryDesigner = function(conf) {
    this.id = QueryDesigner.id++;
    this.conf = conf || {};
    if (iUnd(conf.generateTupleForSlicer)) {
    	conf.generateTupleForSlicer = this.generateTupleForSlicer;
    }
    if (iUnd(conf.allowMultipleHierarchiesFromSameDimensionOnOneAxis)) {
    	conf.allowMultipleHierarchiesFromSameDimensionOnOneAxis = this.allowMultipleHierarchiesFromSameDimensionOnOneAxis;
    }
    this.axes = {};
    this.createAxes();
    if (iFun(conf.getMdx)) {
      this.getMdx = conf.getMdx;
    }
    QueryDesigner.instances[this.getId()] = this;
}).prototype = {
  //flag to ccontrol how the slicer is generated. 
  //when false, Xavier will generate a Set expression.
  //when true, Xavier will generate a set expression, but squash it to a tuple using Aggregate
  //This is to overcome the limitation in some XML/A providers (SAP/HANA) only accept a Tuple in the WHERE clause (and not a Set).
  generateTupleForSlicer: true,
  //Flag that controls whether a query axis can have items from different hierarchies from one and the same dimension on one query axis.
  //By default it is false. This makes sense since hierarchies are supposed ley independent from each other.
  //In SAP HANA however, one is sometimes forced to create multiple hierarchies in a Dimension Calc view.
  //In XML/A that ends up as one dimension with many hierarchies, and we typically would like to use these on any axis.
  allowMultipleHierarchiesFromSameDimensionOnOneAxis: false,
  measuresHierarchyName: "[Measures]",
  setMandatoryDimensions: function(mandatoryDimensions) {
    this.mandatoryDimensions = mandatoryDimensions;
  },
  eachMandatoryDimension: function(callback, scope){
    var mandatoryDimensions = this.mandatoryDimensions;
    if (iUnd(mandatoryDimensions)) {
      return true;
    }
    var i, n = mandatoryDimensions.length, mandatoryDimension;
    for (i = 0; i < n; i++) {
      mandatoryDimension = mandatoryDimensions[i];
      if (callback.call(scope || this, mandatoryDimension, i) === false) {
        return false;
      }
    }
    return true;
  },
  getXmlaTreeView: function(){
    return this.conf.xmlaTreeView;
  },
  getXmla: function(){
    return this.conf.xmla;
  },
  fireEvents: function(flag){
    if (arguments.length) {
      this.eachAxis(function(id, axis){
        axis.fireEvents(flag);
      }, this);
      Observable.prototype.fireEvents.call(this, flag);
    }
    else {
      return Observable.prototype.fireEvents.call(this);
    }
  },
  destroy: function(){
    this.unlisten();
    this.destroyAxes();
    this.axes = null;
    var id = this.getId();
    dEl(id);
    delete QueryDesigner.instances[id] ;
  },
  destroyAxes: function(){
    this.eachAxis(function(id, axis){
      axis.destroy();
    }, this);
  },
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
      label: gMsg("Slicer"),
      tooltip: gMsg("The members on this axis form a selection of the total data set (a slice) or which data are shown."),
      hint: gMsg("Optionally, drag any members unto the slicer axis to control which selection of data will be visualized."),
      "class": "slicer",
      drop: {
        include: "member"
      },
      userSortable: false
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

      var sortDom = axis.getUserSortOptionsDom();
      if (sortDom) {
        if (dragInfo.dragOrigin instanceof QueryDesigner || axis.getUserSortOptions().indexOf(dragInfo.className) === -1) {
          axis.highlightSortOptionsInvalid();
        }
        else {
          axis.highlightSortOptionsValid();
        }
      }
    });
  },
  unHighlightDropTargets: function(){
    this.eachAxis(function(id, axis){
      axis.removeHighlight();
    });
  },
  findDropTarget: function(dragInfo){
    var dropTargets = [];
    this.eachAxis(function(id, axis){
      var axisDropTarget = axis.findDropTarget(dragInfo);
      if (!axisDropTarget) {
        return;
      }
      dropTargets.push({
        axis: axis,
        target: axisDropTarget
      });
    });
    if (!dropTargets.length) {
      return null;
    }

    //get the most appropriate axis on top:
    dropTargets.sort(function(a, b){
      var aAxis = a.axis, aPopulated = aAxis.isPopulated(),
          aConf = aAxis.conf, aMandatory = aConf.mandatory,
          aHierarchyCount = aAxis.getHierarchyCount(),
          aTarget = a.target, aSiblings = aTarget.parentNode.childNodes.length
      ;
      var bAxis = b.axis, bPopulated = bAxis.isPopulated(),
          bConf = bAxis.conf, bMandatory = bConf.mandatory
          bHierarchyCount = bAxis.getHierarchyCount(),
          bTarget = b.target, bSiblings = bTarget.parentNode.childNodes.length
      ;

      if (  //if a is mandatory and not yet populated, and b is not mandatory, or b is populated,
            //a is more appropriate and thus a < b (i.e. a should in front of b)
        (aMandatory && !aPopulated) && (!bMandatory || bPopulated)  ||
        !aPopulated && bPopulated
      ) {
        return -1;
      }
      else
      if (  //if b is mandatory and not yet populated, and a is not mandatory, or a is populated,
            //b is more appropriate and thus b < a (i.e. b should be in front of a)
        (bMandatory && !bPopulated) && (!aMandatory || aPopulated)  ||
        !bPopulated && aPopulated
      ) {
        return 1;
      }
      else
      if (!aPopulated && bPopulated) {
        return -1;
      }
      else
      if (aPopulated && !bPopulated) {
        return 1;
      }
      else
      if (aHierarchyCount < bHierarchyCount) {
        return -1;
      }
      else
      if (aHierarchyCount > bHierarchyCount) {
        return 1;
      }
      if (aSiblings < bSiblings) {
        return -1;
      }
      else
      if (aSiblings > bSiblings) {
        return 1;
      }
      else
      if (a.id < b.id) {
        return -1;
      }
      else
      if (a.id > b.id) {
        return 1;
      }
      return 0;
    });
    return dropTargets[0];
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
    var isSortOption = false;
    switch (className) {
      case "query-designer-axis-header":
        metadata = className;
        var table = target.parentNode.parentNode.parentNode;
        className = /query-designer-axis(\d+|SlicerAxis)/g.exec(table.className);
        classes = confCls(table.className);
        label = queryDesignerAxis.getLabel();
        className = className[0];
        break;
      case "hierarchy":
      case "measures":
        var hierarchy = queryDesignerAxis.getHierarchyByName(target.id);
        metadata = hierarchy;
        break;
      case "derived-measure":
      case "measure":
      case "level":
      case "property":
      case "member":
      case "member-drilldown":
        var member = queryDesignerAxis.getMember(target.id);
        metadata = member.setDef.metadata;
        break;
      case "user-sort-hierarchy":
      case "user-sort-member":
        var sortOption = queryDesignerAxis.sortOption;
        var memberInfo = sortOption.memberInfo;
        var metadata = memberInfo.metadata;
        var label = memberInfo.caption;
        var className = memberInfo.type;
        isSortOption = true;
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
      label: label,
      isSortOption: isSortOption
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
      if (callback.call(scope, id, axis, i) === false) {
        return false;
      };
    }
    return true;
  },
  swapAxes: function(axis1, axis2) {
    var id1 = axis1.conf.id;
    //swap the id
    axis1.conf.id = axis2.conf.id;
    axis2.conf.id = id1;

    //update the collection
    this.axes[axis1.getAxisId()] = axis1;
    QueryDesignerAxis.instances[axis1.getId()] = axis1;

    this.axes[axis2.getAxisId()] = axis2;
    QueryDesignerAxis.instances[axis2.getId()] = axis2;

    var dom = this.getDom(false);
    if (dom) {
      this.render();
    }
    this.fireEvent("changed");
  },
  removeAxisContents: function(axis){
    var contents = axis.removeContents();
    return contents;
  },
  setAxisContents: function(axis, contents){
    axis.setContents(contents);
  },
  swapContentOfAxes: function(axis1, axis2){
    var axis1Contents = axis1.removeContents();
    var axis2Contents = axis2.removeContents();

    axis1.setContents(axis2Contents);
    axis2.setContents(axis1Contents);

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
  moveMeasures: function(fromAxis, toAxis, toIndex){
    return this.moveHierarchy(QueryDesigner.prototype.measuresHierarchyName, fromAxis, toAxis, toIndex);
  },
  getAxisId: function(id){
    if (iInt(id)) {
      id = "Axis(" + id + ")";
    }
    else
    if (id === Xmla.Dataset.AXIS_SLICER){
      id = Xmla.Dataset.AXIS_SLICER;
    }
    else {
      throw "Invalid axis id: " + id;
    }
    return id;
  },
  addAxis: function(axis) {
    var id = this.getAxisId(axis.conf.id);
    if (this.hasAxis(id)) {
      throw "Axis with id \"" + axis.conf.id + "\" already exists.";
    }
    this.axes[id] = axis;
    axis.listen("changed", this.axisChanged, this);
  },
  removeAxis: function(axis){
    if (!this.hasAxis(axis)) {
      throw "No such axis";
    }
    if (iInt(axis) || iStr(axis)) {
      axis = this.getAxis(axis);
    }
    axis.unlisten("changed", this.axisChanged, this);
    delete this.axes[this.getAxisId(axis.conf.id)];
    return axis;
  },
  createAxis: function(conf) {
    conf = merge(conf, {
      queryDesigner: this,
      layout: QueryDesignerAxis.layouts.horizontal
    });
    var defaultConf, id = conf.id,
        defaultAxesConf = this.defaultAxesConf,
        defaultAxesConfLength = defaultAxesConf.length
    ;
    if (id === Xmla.Dataset.AXIS_SLICER) {
      defaultConf = defaultAxesConf[defaultAxesConfLength - 1];
    }
    else
    if (conf.id < defaultAxesConfLength) {
      defaultConf = defaultAxesConf[id];
    }
    else {
      defaultConf = {};
    }
    conf = merge(conf, defaultConf);
    var axis = new QueryDesignerAxis(conf);
    axis.fireEvents(this.fireEvents());
    this.addAxis(axis);
    return axis;
  },
  createAxes: function() {
    var oldFireEvents = this.fireEvents();
    this.fireEvents(false);
    var conf = this.conf, axisConf;
    var axesConf = conf.axes || this.defaultAxesConf;
    var i;
    for (i in axesConf){
      axisConf = axesConf[i];
      this.createAxis(axisConf);
    }
    this.eachAxis(function(id, axis){
      if (axis.conf.members) {
        axis.addMembers(axis.conf.members);
      }
    }, this);
    this.fireEvents(oldFireEvents);
  },
  getAxis: function(id) {
    if (iInt(id)) {
      id = this.getAxisId(id);
    }
    var axis = this.axes[id];
    if (!axis){
      throw "No such axis " + id;
    }
    return axis;
  },
  hasAxis: function(axis){
    if (iInt(axis)) {
      axis = this.getAxisId(axis);
    }
    if (iStr(axis)) {
      return Boolean(this.axes[axis]);
    }
    else
    if (axis instanceof QueryDesignerAxis){
      var id = this.getAxisId(axis.conf.id);
      var myAxis = this.axes[id];
      if (myAxis && myAxis === axis) {
        return true;
      }
      else {
        return false;
      }
    }
    throw "Invalid argument";
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
  getAxisForDimension: function(dimension){
    var ret = null;
    this.eachAxis(function(id, axis){
      if (axis.hasDimension(dimension)) {
        ret = axis;
        return false;
      }
    });
    return ret;
  },
  hasDimension: function(dimension) {
    return Boolean(this.getAxisForDimension(dimension))
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
  getMessageAreaId: function(){
    var id = this.getId();
    return id + "-message-area";
  },
  getMessageArea: function(){
    return gEl(this.getMessageAreaId());
  },
  getMandatoryDimensionMessageAreaId: function(index){
    var id = this.getId();
    return id + "-mandatory-dimension-message-area" + index;
  },
  createMandatoryDimensionMessageArea: function(rule, index, messageArea){
    return cEl("DIV", {
      "class": "mandatory-dimension-message-area mandatory-dimension-message-area-empty",
      id: this.getMandatoryDimensionMessageAreaId(index)
    }, rule.description, messageArea);
  },
  createMandatoryDimensionMessageAreas: function(messageArea){
    this.eachMandatoryDimension(function(rule, index){
      this.createMandatoryDimensionMessageArea(rule, index, messageArea);
    }, this);
  },
  createMessageArea: function(dom){
    if (dom.tagName === "TD") {
      dom.setAttribute("rowspan", "100%");
    }
    var messageArea = cEl("DIV", {
      id: this.getMessageAreaId(),
      "class": "message-area"
    }, null, dom);
    this.createMandatoryDimensionMessageAreas(messageArea);
    return messageArea;
  },
  createAxisMessageArea: function(axis, index, messageArea){
    var axisMessageArea = cEl("DIV", {
      "class": "axis-message-area axis-message-area-empty",
      id: axis.getMessageAreaId()
    }, axis.conf.hint);
    aCh(messageArea, axisMessageArea);
    return axisMessageArea;
  },
  createAxisMessageAreas: function(messageArea) {
    this.eachAxis(function(index, axis){
      this.createAxisMessageArea(axis, index, messageArea);
    }, this);
  },
  hideMessageArea: function(){
    Displayed.hide(this.getMessageAreaId());
  },
  showMessageArea: function(showOrHide){
    var messageArea = this.getMessageArea();
    if (!messageArea) {
      return;
    }
    if (iUnd(showOrHide)) {
      showOrHide = true;
    }
    Displayed.setDisplayed(messageArea, showOrHide);
  },
  clickHandler: function(event){
    var target = event.getTarget();
    var queryDesignerAxis = QueryDesignerAxis.lookup(target);
    if (!queryDesignerAxis) {
      return;
    }
    queryDesignerAxis.clickHandler(event);
  },
  createDom: function() {
    //
    var id = this.getId(),
        dom = this.dom = cEl("TABLE", {
            id: id,
            "class": QueryDesigner.prefix,
            cellspacing: 0
        })
    ;
    //
    var rows = dom.rows, messageArea;
    this.eachAxis(function(index, axis){
      var r, c, conf = axis.conf;
      r = dom.insertRow(rows.length);
      c = r.insertCell(r.cells.length);
      c.className = confCls(
        QueryDesignerAxis.prefix,
        QueryDesignerAxis.prefix + conf.id,
        conf
      ).join(" ");
      c.appendChild(axis.getDom());

      //message area
      if (r.rowIndex === 0) {
        c = r.insertCell(r.cells.length);
        c.className = "message-area";
        messageArea = this.createMessageArea(c);
      }

      //append a message area for each axis.
      this.createAxisMessageArea(axis, index, messageArea);
    }, this);

    listen(dom, "click", this.clickHandler, this);
    return dom;
  },
  getDom: function(create) {
    var el = gEl(this.getId());
    if (!el && create !== false) {
      el = this.createDom();
    }
    return el;
  },
  updateDom: function(flag){
    if (flag === false) {
      this.dontUpdateDom = true;
    }
    else {
      delete this.dontUpdateDom;
    }
  },
  render: function() {
    if (this.dontUpdateDom) {
      return;
    }
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
    this.checkValid();
  },
  getContainer: function() {
    return gEl(this.conf.container);
  },
  checkAxisValid: function(axis, empty){
    var valid = axis.checkValid();
    var add, remove;
    if (axis.isPopulated()) {
      var n = empty.length;
      //if this axis is populated, but any previous axis was not, then we have a gap.
      //normally, a gap is not ok, except for the slicer axis.
      if (!axis.isSlicerAxis() && n) {
        valid = false;  //we have gap
        var i;
        add = "axis-message-area-invalid";
        remove = ["axis-message-area-empty", "axis-message-area-populated"];
        for (i = 0; i < n; i++) {
          rCls(empty[i].getMessageAreaId(), remove, add);
        }
        empty.length = 0;
      }
      add = "axis-message-area-populated";
      remove = ["axis-message-area-empty", "axis-message-area-invalid"];
    }
    else {
      if (axis.conf.mandatory === true) {
        add = "axis-message-area-invalid";
        remove = ["axis-message-area-empty", "axis-message-area-populated"];
        valid = false;
      }
      else {
        if (axis.allowGap !== true) {
          empty.push(axis);
        }
        add = "axis-message-area-empty";
        remove = ["axis-message-area-invalid", "axis-message-area-populated"];
      }
    }
    
    rCls(axis.getMessageAreaId(), remove, add);
    return valid;
  },
  checkAxesValid: function(){
    var valid = true, empty = [];
    this.eachAxis(function(id, axis) {
      var axisValidity = this.checkAxisValid(axis, empty);
      if (axisValidity === false) {
        valid = false;
      }
    }, this, true);
    return valid;
  },
  checkMandatoryDimensionsValid: function(){
    var valid = true;
    this.eachMandatoryDimension(function(rule, index){
      var ruleValid = false;
      var mandatory = rule.mandatory;
      var usedDimensions = [];
      var dimensions = rule.dimensions;
      var i, n = dimensions.length, dimension;
      for (i = 0; i < n; i++){
        dimension = dimensions[i];
        if (this.hasDimension(dimension)) {
          usedDimensions.push(dimension);
        }
      }
      switch (mandatory) {
        case XmlaMetadataFilter.PROP_MANDATORY_ALL:
          ruleValid = dimensions.length === usedDimensions.length;
          break;
        case XmlaMetadataFilter.PROP_MANDATORY_SOME:
          ruleValid = usedDimensions.length > 0;
          break
        case XmlaMetadataFilter.PROP_MANDATORY_ONE:
          ruleValid = usedDimensions.length === 1;
          break
      }
      var remove, add;
      if (ruleValid) {
        add = "mandatory-dimension-message-area-valid";
        remove = ["mandatory-dimension-message-area-empty", "mandatory-dimension-message-area-invalid"];
      }
      else {
        add = "mandatory-dimension-message-area-invalid";
        remove = ["mandatory-dimension-message-area-empty", "mandatory-dimension-message-area-valid"];
        valid = false;
      }
      rCls(this.getMandatoryDimensionMessageAreaId(index), remove, add);
    }, this);
    return valid;
  },
  checkValid: function(){
    var axesValid = this.checkAxesValid();
    var mandatorDimensionsValid = this.checkMandatoryDimensionsValid();
    var valid = axesValid && mandatorDimensionsValid;
    this.showMessageArea(!valid);
    return valid;
  },
  getMdx: function(cubeName){
    var mdx = "", withClauseMdx = "", gap = false, slicerMdx;
    if (this.eachAxis(function(id, axis){
      var axisMdx = "", isSlicer = axis.isSlicerAxis();
      var calculatedMembersMdx = axis.getCalculatedMembersMdx();
      if (calculatedMembersMdx) {
        withClauseMdx += calculatedMembersMdx;
      }
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
    mdx = [
      "SELECT ",
      mdx,
      "FROM",
      QueryDesignerAxis.prototype.braceIdentifier(cubeName)
    ];
    
    if (slicerMdx) {
      mdx = mdx.concat([
        "WHERE", 
        slicerMdx
      ]);
    }
    if (withClauseMdx) {
      mdx = [
        "WITH",
        withClauseMdx
      ].concat(mdx);
    }
    mdx.unshift("/* " + this.getId() + ": getMdx() */");
    mdx = mdx.join("\n");
    return mdx;
  },
  axisChanged: function(axis, event, data) {
    this.fireEvent("changed", axis);
  },
  isPopulated: function(){
    var populated = false;
    this.eachAxis(function(id, axis){
      if (axis.isPopulated()){
        populated = true;
        return false;
      }
    }, this);
    return populated;
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
  this.conf = conf || {};
  if (iFun(conf.getMdx)) {
    this.getMdx = conf.getMdx;
  }
  if (iDef(conf.allowGap)){
    this.allowGap = conf.allowGap;
  }
  if (iDef(conf.hierarchized)) {
    this.hierarchized = conf.hierarchized;
  }
  this.reset();
  QueryDesignerAxis.instances[this.getId()] = this;
}).prototype = {
  hierarchized: true,
  //whether this axis is allowed to be empty even if the next axis is populated.
  allowGap: false,
  userSortable: true,
  userSortOptions: ["measure", "level", "property"],
  userSortBreaksHierarchy: true,
  userSortDirection: "asc",
  clickHandler: function(event) {
    var target = event.getTarget();
    if (hCls(target, "query-designer-axis-header")) {
      var parentNode = target.parentNode;
      if (hCls(parentNode, "user-sort-option")) {
        this.toggleSortDirection();
      }
    }
    else
    if (hCls(target, "show-empty")) {
      this.fireEvent("changed");
    }
  },
  removeContents: function(){
    var contents = {
      hierarchies: this.hierarchies,
      dimensions: this.dimensions,
      setDefs: this.setDefs,
      sortOption: this.sortOption
    };
    this.reset(false);
    return contents;
  },
  setContents: function(contents){
      this.hierarchies = contents.hierarchies;
      this.dimensions = contents.dimensions;
      this.setDefs = contents.setDefs;
      this.sortOption = contents.sortOption; 
  },
  destroy: function(){
    var queryDesigner = this.conf.queryDesigner;
    var id = queryDesigner.getAxisId(this.conf.id);
    delete queryDesigner.axes[id];
    this.unlisten();
    var id = this.getId();
    dEl(id);
    delete QueryDesignerAxis.instances[id];
    this.conf.queryDesigner = null;
  },
  getQueryDesigner: function() {
    return this.conf.queryDesigner;
  },
  getMessageAreaId: function(){
    var queryDesignerId = this.getQueryDesigner().getId();
    var axisId = this.conf.id;
    return queryDesignerId + "-axis-message-area-" + axisId;
  },
  reset: function(updateDom) {
    this.hierarchies = [];
    this.dimensions = {};
    this.setDefs = {};
    delete this.sortOption;
    if (updateDom !== false) {
      this.updateDom();
    }
  },
  getLayout: function() {
    return this.conf.layout;
  },
  getAxisId: function(){
    return this.conf.queryDesigner.getAxisId(this.conf.id);
  },
  getId: function(){
    return this.conf.queryDesigner.getId() + "-axis" + this.conf.id;
  },
  getLabel: function(){
    var conf = this.conf;
    if (!conf) {
      return;
    }
    var label;
    label = conf.label;
    if (!label) {
      switch (conf.id) {
        
      }
    }
    return label;
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

    var label,
        canBeEmpty = iDef(conf.canBeEmpty) ? conf.canBeEmpty : true;
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
    if (conf.tooltip) {
      cEl("DIV", {
        "class": "tooltip",
        style: {
          "font-weight": "normal"
        }
      }, conf.tooltip, c);
    }

    var hasEmptyCheckBox;
    if (iDef(conf.hasEmptyCheckBox)) {
      hasEmptyCheckBox = Boolean(conf.hasEmptyCheckBox);
    }
    else {
      hasEmptyCheckBox = true;
    }

    if (canBeEmpty && hasEmptyCheckBox !== false) {
      var nonEmptyCheckbox = cEl("INPUT", {
        id: id + "-empty-checkbox",
        "class": "show-empty",
        title: "Show empty cells",
        type: "checkbox"
      }, null, c);
      var me = this;
    }

    return dom;
  },
  updateDom: function() {
    if (this.getQueryDesigner().dontUpdateDom) {
      return;
    }
    switch (this.getLayout()) {
      case QueryDesignerAxis.layouts.vertical:
        //this is basically obsolete.
        this.updateDomVertical();
        break;
      case QueryDesignerAxis.layouts.horizontal:
        this.updateDomHorizontal();
        break;
    }
  },
  updateDomSetDefs: function(hierarchyName, c) {
    var hierarchySetDefs = this.getSetDefs(hierarchyName),
        j, m = hierarchySetDefs.length, setDef, metadata, classes
    ;
    for (j = 0; j < m; j++) {
      setDef = hierarchySetDefs[j];
      metadata = setDef.metadata;
      classes = [setDef.type];
      if (setDef.type === "derived-measure" && metadata.classes) {
        classes = classes.concat(metadata.classes);
      }
      if (iDef(metadata.MEASURE_AGGREGATOR)){
        classes.push("aggregator" + metadata.MEASURE_AGGREGATOR);
      }
      if (iDef(metadata.LEVEL_TYPE)){
        classes.push("leveltype" + metadata.LEVEL_TYPE);
      }
      if (iDef(metadata.LEVEL_UNIQUE_SETTINGS)){
        classes.push("levelunicity" + metadata.LEVEL_UNIQUE_SETTINGS);
      }
      classes.push(QueryDesignerAxis.prefix + "-item");
      var el = cEl("SPAN", {
        "class":  classes,
        title: setDef.expression,
        id: setDef.expression
      }, setDef.caption, c);
    }
  },
  getHierarchyClassName: function(hierarchy) {
    var hierarchyName = this.getHierarchyName(hierarchy);
    var className;
    className = hierarchyName === QueryDesigner.prototype.measuresHierarchyName ? "measures" : "hierarchy";
    className += " dimensiontype" + hierarchy.DIMENSION_TYPE;
    return className;
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
      c.className = this.getHierarchyClassName(hierarchy);
      c = r2.insertCell(r2.cells.length);

      this.updateDomSetDefs(hierarchyName, c);
    }
  },
  isUserSortable: function(){
    var conf = this.conf, sortable
    if (iDef(conf.userSortable)) {
      sortable = conf.userSortable;
    }
    else {
      sortable = this.userSortable;
    }
    return sortable;
  },
  getUserSortOptions: function(){
    var conf = this.conf, options
    if (iDef(conf.userSortOptions)) {
      options = conf.userSortOptions;
    }
    else {
      options = this.userSortOptions;
    }
    return options;
  },
  getUserSortBreaksHierarchy: function(){
    var conf = this.conf, userSortBreaksHierarchy
    if (iDef(conf.userSortBreaksHierarchy)) {
      userSortBreaksHierarchy = conf.userSortBreaksHierarchy;
    }
    else {
      userSortBreaksHierarchy = this.userSortBreaksHierarchy;
    }
    return userSortBreaksHierarchy;
  },
  toggleSortDirection: function(){
    var sortOption = this.sortOption
    if (!sortOption) {
      return;
    }
    var direction;
    switch (sortOption.direction) {
      case "asc":
        direction = "desc";
        break;
      case "desc":
        direction = "asc";
        break;
      default:
        return;
    }
    sortOption.direction = direction;
    this.updateDom();
    this.fireEvent("changed");
  },
  setSortOption: function(dragInfo){
    if (dragInfo === null) {
      delete this.sortOption;
    }
    else {
      var requestType = dragInfo.className,
          metadata = dragInfo.defaultMember || dragInfo.metadata
      ;
      var hierarchyName = this.getHierarchyName(metadata);
      var treeView = this.getQueryDesigner().getXmlaTreeView();
      var hierarchy = treeView.getHierarchyMetadata(hierarchyName);
      var memberInfo = this.getMemberInfo(requestType, metadata);
      var direction;
      if (this.sortOption) {
        direction = this.sortOption.direction;
      }
      else {
        direction = this.userSortDirection;
      }
      this.sortOption = {
        direction: direction,
        hierarchy: hierarchy,
        memberInfo: memberInfo,
        breaksHierarchy: this.getUserSortBreaksHierarchy()
      };
    }
    this.updateDom();
    this.fireEvent("changed");
  },
  getSortDomId: function() {
    return this.getId() + "-sort-options";
  },
  getUserSortOptionsDom: function(){
    return gEl(this.getSortDomId());
  },
  updateSortOptionsDomHorizontal: function(dom){
    var rows = dom.rows, r, c;
    //header row demarcates the sort options from the rest of the axis
    r = dom.insertRow(rows.length);
    r.id = this.getSortDomId();
    r.className = "user-sort-option";
    c = r.insertCell(0);
    c.className = "query-designer-axis-header";
    sAtt(c, "colspan", "100%");
    c.innerHTML = gMsg("Sort Options");
    var tooltip = cEl("DIV", {
      class: "tooltip",
      style: {
        "font-weight": "normal"
      }
    }, null, c);

    //one row to hold the member, measure or property that is used to sort.
    var sortOption = this.sortOption;
    if (!sortOption) {
      tooltip.innerHTML = gMsg("Drop a measure, level, or property here to sort the output of this axis in the query result.");
      return;
    }
    c.className += " user-sort-direction-" + sortOption.direction;
    tooltip.innerHTML = gMsg("Click to toggle sort direction.");

    r = dom.insertRow(rows.length);
    r.className = "user-sort-option";

    var hierarchy = sortOption.hierarchy;
    c = r.insertCell(0);
    c.innerHTML = hierarchy.HIERARCHY_CAPTION;

    c.className = "user-sort-hierarchy dimensiontype" + hierarchy.DIMENSION_TYPE;

    var memberInfo = sortOption.memberInfo;
    var metadata = memberInfo.metadata;
    c = r.insertCell(1);
    c.innerHTML = memberInfo.caption;

    var classes = ["user-sort-member", memberInfo.type];
    if (iDef(metadata.MEASURE_AGGREGATOR)){
      classes.push("aggregator" + metadata.MEASURE_AGGREGATOR);
    }
    if (iDef(metadata.LEVEL_TYPE)){
      classes.push("leveltype" + metadata.LEVEL_TYPE);
    }
    if (iDef(metadata.LEVEL_UNIQUE_SETTINGS)){
      classes.push("levelunicity" + metadata.LEVEL_UNIQUE_SETTINGS);
    }
    c.className = confCls(classes).join(" ");

  },
  updateDomHorizontal: function() {
    var conf = this.conf,
        hierarchies = this.hierarchies,
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
      var className = this.getHierarchyClassName(hierarchy);
      r.className = className;
      c = r.insertCell(0);
      c.id = hierarchyName;
      c.innerHTML = this.getHierarchyCaption(hierarchy);
      c.className = className;

      c = r.insertCell(1);
      this.updateDomSetDefs(hierarchyName, c);
    }
    //show the sort options, but only if there is something to sort.
    if (!n || !this.isUserSortable()) {
      return;
    }
    this.updateSortOptionsDomHorizontal(dom);
  },
  getDom: function() {
    var el = gEl(this.getId());
    if (!el) {
      el = this.createDom();
    }
    return el;
  },
  hasHierarchy: function(hierarchy) {
    return this.getHierarchyIndex(hierarchy) !== -1;
  },
  hasMeasures: function(){
    return this.hasHierarchy(QueryDesigner.prototype.measuresHierarchyName);
  },
  isMeasureHierarchy: function(hierarchy){
    var hierarchyName = this.getHierarchyName(hierarchy);
    return hierarchyName === QueryDesigner.prototype.measuresHierarchyName;
  },
  getHierarchyIndex: function(name) {
    for (var h = this.hierarchies, i = 0, n = h.length; i < n; i++){
      if (this.getHierarchyName(h[i]) === name) {
        return i;
      }
    }
    return -1;
  },
  getMeasuresIndex: function(){
    return this.getHierarchyIndex(QueryDesigner.prototype.measuresHierarchyName);
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
  checkCardinalityTypes: function(typesSpecs, types){
    var typeName, type, typeStats;
    for (typeName in typesSpecs) {
      type = typesSpecs[typeName];
      typeStats = types[typeName];
      if (iUnd(typeStats)) {
        if (type.min === 0) {
          typeStats = 0;
        }
        else {
          return false;
        }
      }
      if (iDef(type.min) && typeStats < type.min) {
        return false;
      }
      if (iDef(type.max) && typeStats > type.max) {
        return false;
      }
    }
    return true;
  },
  checkValid: function(stats){
    if (iUnd(stats)) {
      stats = this.getStats();
    }

    var conf = this.conf || {};
    var cardinalities = conf.cardinalities;
    
    if (conf.allowMultipleLevels === false) {
      if (iDef(stats.hierarchiesStats)){
        var hierarchy;
        for (hierarchy in stats.hierarchiesStats) {
          hierarchy = stats.hierarchiesStats[hierarchy];
          if (hierarchy.minLevel !== hierarchy.maxLevel) {
            return false;
          }
        }
      }
    }

    if (iUnd(cardinalities)) {
      return true;
    }
    
    //check itemCount
    if (iDef(cardinalities.items)) {
      //axis has less than min required number of items
      if (iDef(cardinalities.items.min) && stats.itemCount < cardinalities.items.min) {
        return false;
      }
      //axis has more than max allowed number of items
      if (iDef(cardinalities.items.max) && stats.itemCount > cardinalities.items.max) {
        return false;
      }
    }
    
    //check hierarchyCount
    if (iDef(cardinalities.hierarchies)) {
      //axis has less than min required number of items
      if (iDef(cardinalities.hierarchies.min) && stats.hierarchyCount < cardinalities.hierarchies.min) {
        return false;
      }
      //axis has more than max allowed number of items
      if (iDef(cardinalities.hierarchies.max) && stats.hierarchyCount > cardinalities.hierarchies.max) {
        return false;
      }
      
      if (iDef(cardinalities.hierarchies.types) && iDef(stats.hierarchiesStats)){
        var hierarchy;
        for (hierarchy in stats.hierarchiesStats) {
          hierarchy = stats.hierarchiesStats[hierarchy];
          if (!this.checkCardinalityTypes(cardinalities.hierarchies.types, hierarchy.types)) {
            return false;
          }
        }
      }
    }
        
    //check types
    if (iDef(cardinalities.types)){
      if (!this.checkCardinalityTypes(cardinalities.types, stats.types)) {
        return false;
      }
    }
    
    return true;
  },
  getStats: function(){ //override to check specific requirements.
    var stats = {
      hierarchyCount: 0,
      itemCount: 0,
      hierarchiesStats: {},
      types: {}
    };
    
    this.eachSetDef(function(setDef, i, hierarchy, hierarchyIndex){
      stats.itemCount += 1;

      //update global type count
      var setDefType = setDef.type;
      var statsTypes = stats.types;
      if (iUnd(statsTypes[setDefType])) {
        statsTypes[setDefType] = 0;
      }
      statsTypes[setDefType] += 1;

      //update hierarchy stats.
      var hierarchyName = this.getHierarchyName(hierarchy);
      var hierarchiesStats = stats.hierarchiesStats;
      if (iUnd(hierarchiesStats[hierarchyName])) {
        hierarchiesStats[hierarchyName] = {
          itemCount: 0,
          types: {}
        };
        stats.hierarchyCount += 1;
      }
      
      var hierarchyStats = hierarchiesStats[hierarchyName];
      hierarchyStats.itemCount += 1;

      var levelNumber = setDef.metadata.LEVEL_NUMBER;
      if (iDef(levelNumber)) {
        if (iUnd(hierarchyStats.minLevel) || hierarchyStats.minLevel > levelNumber) {
          hierarchyStats.minLevel = levelNumber;
        }
        if (iUnd(hierarchyStats.maxLevel) || hierarchyStats.maxLevel < levelNumber) {
          hierarchyStats.maxLevel = levelNumber;
        }
      }
      
      var hierarchyStatsTypes = hierarchyStats.types;      
      if (iUnd(hierarchyStatsTypes[setDefType])) {
        hierarchyStatsTypes[setDefType] = 0;
      }
      hierarchyStatsTypes[setDefType] += 1;
    }, this);
    
    return stats;
  },
  _canDropItem: function(target, dragInfo) {
    var conf = this.conf,
        requestType = dragInfo.className,
        metadata = dragInfo.metadata
    ;

    if (target.tagName === "TD") {
      var classes = target.parentNode.className.split(" ");
      if (classes[0] === "user-sort-option") {
        if (dragInfo.dragOrigin instanceof QueryDesigner) {
          return false;
        }
        else {
          return true;
        }
      }
    }
    
    //this check is too strict.
    //when we drag a hierarchy from a query axis, then requestType will be "hierarchy"
    //whereas we are in fact only dragging the items that are associated with that hierarchy, not the hierarchy itself.
    if (!this.dropIncludes(requestType)) {
      return false;
    }
    //the item is an entire axis.
    if (metadata === "query-designer-axis-header") {
      //dropping an axis unto an axis means: swap the two axes.
      //we can do this only if the two axes are not the same.
      return !hCls(this.getDom().parentNode, requestType);
    }

    //check the metadata
    if (iDef(conf.metadataFilter) && !eq(conf.metadataFilter, metadata)) {
      return false;
    }

    //if (target.tagName !== "TD") return;
    var dimensionName = this.getDimensionName(metadata),
        hierarchyName = this.getHierarchyName(metadata),
        axis,
        queryDesigner = this.getQueryDesigner()
    ;

    //if the max hierarchy count is equal to or increases the hierarchy count,
    //and the new item belongs to another hierarchy, then we have to reject the item
    //since we are not supposed to add yet another hierarchy
    var thisAxisHasHierarchy = this.hasHierarchy(hierarchyName);
    var queryDesignerHasHierarchy = thisAxisHasHierarchy || queryDesigner.hasHierarchy(hierarchyName);
    if (iDef(conf.maxHierarchyCount) && conf.maxHierarchyCount <= this.getHierarchyCount() && !thisAxisHasHierarchy) {
      return false;
    }

    var metadataFilter = conf.metadataFilter;
    if (iDef(metadataFilter)) {
      switch (typeof(metadataFilter)) {
        case "object":
          if (!eq(metadataFilter, metadata)){
            return false;
          }
          break;
        case "function":
          break;
      }
    }

    //if we are dragging from the tree to this axis, but we already have such an item then dissallow.
    if (dragInfo.dragOrigin !== queryDesigner && this.containsSetDef(requestType, metadata)) {
      return false;
    }

    //if this axis already has a hierarchy with this dimension, then we can't accept another.
    if (!queryDesigner.allowMultipleHierarchiesFromSameDimensionOnOneAxis && !thisAxisHasHierarchy && this.hasDimension(dimensionName)) {
      return false;
    }
    
    switch (requestType) {
      case "hierarchy":
      case "measures":
        //if this axis already has this hierarchy then we can't drop it again.
        if (thisAxisHasHierarchy) {
          return false;
        }
        if (queryDesignerHasHierarchy){
          //return false;
        }
      case "level":
      case "member":
        //fall through
      case "derived-measure":
      case "measure":
      case "property":
        if (queryDesignerHasHierarchy && !thisAxisHasHierarchy && !(dragInfo.dragOrigin instanceof QueryDesigner)) {
          return false;
        }
        
        //get the stats
        var stats = this.getStats();
        
        //modify them to reflect the situation if the new item would have been added
        stats.itemCount += 1;

        var typeStats = stats.types;
        if (iUnd(typeStats[requestType])) {
          typeStats[requestType] = 0
        }
        typeStats[requestType] += 1;

        if (!thisAxisHasHierarchy) {
          stats.hierarchyCount += 1;
          stats.hierarchiesStats[hierarchyName] = {
            types: {},
            itemCount: 0
          };
        }
        stats.hierarchiesStats[hierarchyName].itemCount += 1;
        if (iUnd(stats.hierarchiesStats[hierarchyName].types[requestType])) {
          stats.hierarchiesStats[hierarchyName].types[requestType] = 0;
        }
        stats.hierarchiesStats[hierarchyName].types[requestType] += 1;
        if (iDef(metadata.LEVEL_NUMBER)) {
          if (iUnd(stats.hierarchiesStats[hierarchyName].minLevel)) {
            stats.hierarchiesStats[hierarchyName].minLevel = stats.hierarchiesStats[hierarchyName].maxLevel = metadata.LEVEL_NUMBER;
          }
          if (stats.hierarchiesStats[hierarchyName].minLevel > metadata.LEVEL_NUMBER) {
            stats.hierarchiesStats[hierarchyName].minLevel = metadata.LEVEL_NUMBER;
          }
          if (stats.hierarchiesStats[hierarchyName].maxLevel < metadata.LEVEL_NUMBER) {
            stats.hierarchiesStats[hierarchyName].maxLevel = metadata.LEVEL_NUMBER;
          }
        }
                
        //check if the modified stats would still consitute a valid axis.
        if (!QueryDesignerAxis.prototype.checkValid.call(this, stats)){
          return false;
        }
        break;
      default:
        return false;
    }
    return true;
  },
  canDropItem: function(target, dragInfo) {
    var conf = this.conf;
    if (iFun(conf.canDropItem)){
      return conf.canDropItem.call(this, target, dragInfo);
    }
    return this._canDropItem(target, dragInfo);
  },
  getLastMemberCellsVertical: function(){
    var lastMemberCells = [];
    var dom = this.getDom();
    var rows = dom.rows;
    var row = rows[2];
    var cells = row.cells;
    var i, n = cells.length, cell;
    for (i = 0; i < n; i++){
      cell = cells[i];
      lastMemberCells.push(cell.lastChild);
    }
    return lastMemberCells;
  },
  getLastMemberCellsHorizontal: function(){
    var lastMemberCells = [];
    var dom = this.getDom();
    var rows = dom.rows;
    var i, row, cell;
    //last row is sort option, don't include that.
    var n = rows.length - 1;
    for (i = 1; i < n; i++) {
      row = rows[i];
      cell = row.cells[1];
      lastMemberCells.push(cell.lastChild);
    }
    return lastMemberCells;
  },
  getLastMemberCells: function(){
    var lastMemberCells;
    switch (this.getLayout()) {
      case QueryDesignerAxis.layouts.vertical:
        lastMemberCells = this.getLastMemberCellsVertical();
        break;
      case QueryDesignerAxis.layouts.horizontal:
        lastMemberCells = this.getLastMemberCellsHorizontal();
        break;
    }
    return lastMemberCells;
  },
  findDropTarget: function(dragInfo){
    var memberCells = this.getLastMemberCells();
    var n = memberCells.length;
    if (n) {
      var i, lastMemberCell;
      for (i = n - 1; i >= 0; i--) {
        lastMemberCell = memberCells[i];
        if (this.canDropItem(lastMemberCell, dragInfo)) {
          return lastMemberCell;
        }
      }
    }
    else {
      var dom = this.getDom();
      dom = dom.rows[0].cells[0];
      if (this.canDropItem(dom, dragInfo)) {
        return dom;
      }
    }
    return null;
  },
  getMemberUniqueName: function(metadata) {
    var expression;
    if (iStr(metadata)) {
      expression = metadata;
    }
    else
    if (metadata.PROPERTY_NAME) {
      expression = metadata.LEVEL_UNIQUE_NAME + ".[" + metadata.PROPERTY_NAME + "]";
    }
    else
    if (metadata.MEMBER_UNIQUE_NAME) {
      expression = metadata.MEMBER_UNIQUE_NAME;
    }
    else
    if (metadata.MEASURE_UNIQUE_NAME) {
      expression = metadata.MEASURE_UNIQUE_NAME;
    }
    else
    if (metadata.DEFAULT_MEMBER) {
      expression = metadata.DEFAULT_MEMBER;
    }
    else
    if (metadata.DEFAULT_MEASURE) {
      expression = metadata.DEFAULT_MEASURE;
    }
    else {
      expression = null;
    }
    return expression;
  },
  getMemberExpression: function(metadata, className) {
    var expression = this.getMemberUniqueName(metadata);
    if (expression === null && metadata.LEVEL_UNIQUE_NAME) {
      expression = metadata.LEVEL_UNIQUE_NAME + ".Members";
    }
    else
    if (className === "member-drilldown") {
      expression += ".Children";
    }
    return expression;
  },
  isIdentifierBraced: function(identifier) {
    return identifier.charAt(0) === "[" && identifier.charAt(identifier.length-1) === "]";
  },
  braceIdentifier: function(identifier) {
    if (!QueryDesignerAxis.prototype.isIdentifierBraced(identifier)) {
      identifier = "[" + identifier + "]";
    }
    return identifier;
  },
  stripBracesFromIdentifier: function(identifier){
    if (QueryDesignerAxis.prototype.isIdentifierBraced(identifier)) {
      identifier = identifier.substr(1, identifier.length-2);
    }
    return identifier;
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
      caption = this.stripBracesFromIdentifier(caption);
      return caption;
    }
    return null;
  },
  getHierarchyCaption: function(hierarchy) {
    if (iStr(hierarchy)) {
      hierarchy = this.getHierarchyByName(hierarchy);
    }
    var caption = hierarchy.HIERARCHY_CAPTION;
    if (this.isMeasureHierarchy(hierarchy)) {
      if (iDef(caption) && caption === "Measures"){
        caption = gMsg(caption);
      }
    }
    if (caption) {
      return caption;
    }
    var name = this.getHierarchyName(hierarchy);
    name = this.stripBracesFromIdentifier(name);
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
      hierarchyName = QueryDesigner.prototype.measuresHierarchyName;
    }
    else
    if (hierarchy.HIERARCHY_UNIQUE_NAME) {
      hierarchyName = hierarchy.HIERARCHY_UNIQUE_NAME;
    }
    else {
      hierarchyName = QueryDesigner.prototype.measuresHierarchyName;
    }
    return hierarchyName;
  },
  getDimensionName: function(hierarchy) {
    if (iStr(hierarchy)) {
      return hierarchy;
    }
    var dimensionName;
    if (hierarchy.DIMENSION_UNIQUE_NAME) {
      dimensionName = hierarchy.DIMENSION_UNIQUE_NAME;
    }
    else
    if (hierarchy.HIERARCHY_UNIQUE_NAME) {
      dimensionName = hierarchy.HIERARCHY_UNIQUE_NAME;
    }
    else
    if (hierarchy.DIMENSION_TYPE && hierarchy.DIMENSION_TYPE === Xmla.Rowset.MD_DIMTYPE_MEASURE) {
      dimensionName = QueryDesigner.prototype.measuresHierarchyName;
    }
    else {
      dimensionName = QueryDesigner.prototype.measuresHierarchyName;
    }
    return dimensionName;
  },
  hasDimension: function(dimension){
    var dimensionName = this.getDimensionName(dimension);
    if (this.eachHierarchy(function(hierarchy, i){
      if (this.getDimensionName(hierarchy) === dimensionName) {
        return false;
      }
    }, this) === false) {
      return true;
    }
    return false;
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
  isPopulated: function(){
    return this.getHierarchyCount() !== 0;
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
    //dont sent events for partial actions.
    this.fireEvents(false);
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
    //start firing events again.
    this.fireEvents(true);
    //if some changes were made, send an event (so listener can re-execute the query)
    if (change) {
      this.fireEvent("changed");
    }
    return change;
  },
  getMemberInfo: function(requestType, metadata){
    //TODO: query member
    var expression = this.getMemberExpression(metadata, requestType), caption;
    var memberInfo = {
      expression: expression,
      metadata: metadata,
      type: requestType
    };
    var captionNeedsUpdate = false;
    switch (requestType) {
      case "measures":
        caption = this.getMemberCaption(metadata);
        captionNeedsUpdate = true;
        break;
      case "hierarchy":
        caption = this.getMemberCaption(metadata);
        captionNeedsUpdate = true;
        break;
      case "level":
        caption = metadata.LEVEL_CAPTION;
        break;
      case "property":
        caption = metadata.PROPERTY_CAPTION;
        break;
      case "member":
      case "member-drilldown":
        caption = metadata.MEMBER_CAPTION;
        break;
      case "measure":
      case "derived-measure":
        caption = metadata.MEASURE_CAPTION;
        break;
      case "calculated-member":
        caption = metadata.CAPTION;
        break;
    }
    memberInfo.caption = caption;
    memberInfo.captionNeedsUpdate = captionNeedsUpdate;

    var treeView = this.getQueryDesigner().getXmlaTreeView();
    var levelMetadata, levelname;
    switch (requestType) {
      case "hierarchy":
        levelname = metadata.DEFAULT_MEMBER;
        levelname = levelname.split("].[");
        levelname.pop();
        levelname = levelname.join("].[") + "]";
        break;
      case "property":
      case "member":
      case "member-drilldown":
        levelname = metadata.LEVEL_UNIQUE_NAME;
        break;
    }
    if (levelname) {
      var levelMetadata = treeView.getLevelMetadata(levelname);
      if (levelMetadata) {
        memberInfo.levelMetadata = levelMetadata;
      }
      else {
        //debugger;
      }
    }
    return memberInfo;
  },
  containsSetDef: function(requestType, metadata){
    var memberInfo = this.getMemberInfo(requestType, metadata);
    if (this.eachSetDef(function(setDef){
      if (
        setDef.type === memberInfo.type &&
        setDef.expression === memberInfo.expression
      ){
        return false;
      }
    }, this) === false) {
      contains = true;
    }
    else {
      contains = false;
    }
    return contains;
  },
  _addMember: function(memberIndex, requestType, metadata) {
    var hierarchyName = this.getHierarchyName(metadata),
        hierarchyIndex = this.getHierarchyIndex(hierarchyName)
    ;
    if (hierarchyIndex === -1) {
      //throw "Hierarchy not present in this axis";
      //this._addHierarchy(this.getHierarchyCount(), metadata);
      this._addHierarchy(memberIndex, metadata);
    }
    var memberInfo = this.getMemberInfo(requestType, metadata);
    var setDefs = this.getSetDefs(hierarchyName);
    if (memberIndex === -1) {
      memberIndex = setDefs.length - 1;
    }
    setDefs.splice(memberIndex + 1, 0, memberInfo);
    this.updateDom();
  },
  addMember: function(memberIndex, requestType, metadata) {
    this._addMember(memberIndex, requestType, metadata);
    this.fireEvent("changed");
  },
  addMembers: function(members){
    var i, n = members.length, member, requestType, metadata;
    for (i = 0; i < n; i++) {
      member = members[i];
      if (member.requestType) {
        requestType = member.requestType;
      }
      if (member.metadata) {
        metadata = member.metadata;
      }
      if (metadata && requestType) {
        this.addMember(-1, requestType, member);
      }
      else {
        console.log("Warning: could not add member " + i + "( " + String(member) + " )");
      }
    }
  },
  _addHierarchy: function(hierarchyIndex, metadata) {
    var hierarchyName = this.getHierarchyName(metadata), layout = this.getLayout(), hierarchy;
    var treeView = this.getQueryDesigner().getXmlaTreeView();
    hierarchy = treeView.getHierarchyMetadata(hierarchyName);

    if (hierarchyIndex === -1) {
      hierarchyIndex = 0;
    }
    this.hierarchies.splice(hierarchyIndex, 0, hierarchy);
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
        metadata = dragInfo.defaultMember || dragInfo.metadata,
        hierarchyName = this.getHierarchyName(metadata),
        hierarchyIndex = this.getHierarchyIndex(hierarchyName),
        dropIndexes
    ;
    switch (requestType) {
      case "hierarchy":
        requestType = "member";
        break;
      case "measures":
        requestType = "measure";
        break;
    }
    if (hCls(target, "show-empty")) {
      target = gAnc(target, "TD");
    }
    if (hCls(target.parentNode, "user-sort-option")) {
      this.setSortOption(dragInfo);
      return;
    }
    dropIndexes = this.getDropIndexes(target);
    if (typeof(dropIndexes.dropHierarchyIndex)==="undefined") {
      debugger;
      return;
    }
    //TODO: do we really need to check for the hierarchy and call addHierarchy?
    //the else branch calls addMember and that already does all that work.
//    if (hierarchyIndex === -1) {
//      //if the hierarchy was not already in this axis, add it.
//      this.addHierarchy(dropIndexes.dropHierarchyIndex+1, requestType, metadata);
//    }
//    else {
      //if the hierarchy is already present, add the member expression to the member list.
      var member = this.getMember(metadata);
      if (!member) {
        this.addMember(dropIndexes.dropMemberIndex, requestType, metadata);
      }
      else {
        this.moveMember(metadata, requestType, dropIndexes.dropMemberIndex);
      }
//    }
  },
  getDimensionPropertiesMdx: function(){
    var mdx = "";
    this.eachSetDef(function(setDef, setDefIndex){
      var type = setDef.type;
      if (type !== "property") {
        return;
      }
      if (mdx.length) {
        mdx += ", ";
      }
      mdx += setDef.expression;
    }, this);
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
      if (mdx.length) {
        mdx += "\n, ";
      }
      mdx += intrinsicProperties;
    }
    if (mdx.length) {
      mdx = "\nDIMENSION PROPERTIES " + mdx;
    }
    return mdx;
  },
  getNonEmptyClauseMdx: function(){
    var conf = this.conf, nonEmpty = false;
    if (conf.canBeEmpty === true) {
      var emptyCheckBox = gEl(this.getId() + "-empty-checkbox");
      if (emptyCheckBox) {
        nonEmpty = emptyCheckBox && !emptyCheckBox.checked;
      }
    }
    else {
      nonEmpty = true;
    }
    var mdx;
    if (nonEmpty) {
      mdx = "NON EMPTY ";
    }
    else {
      mdx = "";
    }
    return mdx;
  },
  getOnAxisClauseMdx: function(){
    //please don't bother with named axes like COLUMNS, ROWS etc. 
    //different MDX implementations have different opinions on what to call the axes beyond the pages axis.
    //see for example https://msdn.microsoft.com/en-us/library/windows/desktop/ms713616(v=vs.85).aspx
    //and https://docs.oracle.com/cloud/farel9/financialscs_gs/FADAG/dmaxldml.html#dmaxldml_22
    //and http://mondrian.pentaho.com/api/mondrian/olap/AxisOrdinal.StandardAxisOrdinal.html
    //Also, the Axis(x) syntax might not be supported.
    var conf = this.conf;
    return "\nON " + conf.id;
  },
  getSlicerAxisAsTupleMdx: function(){
    var mdx = "";
    this.eachHierarchy(function(hierarchy, hierarchyIndex){
      if (mdx) {
        mdx += ", ";
      }
      mdx +=  hierarchy.HIERARCHY_UNIQUE_NAME + ".[Slicer]";
    }, this);
    if (mdx) {
      mdx = "(" + mdx + ")";
    }
    return mdx;
  },
  getSlicerAxisAsTupleCalculatedMembersMdx: function(){
    var mdx = "";
    this.eachHierarchy(function(hierarchy, hierarchyIndex){
      var members = "";
      this.eachSetDef(function(setDef, setDefIndex){
        var type = setDef.type;
        if (members.length) {
          members += ", ";
        }
        members += setDef.expression;
      }, this, hierarchy);
      mdx +=  "\nMEMBER " + hierarchy.HIERARCHY_UNIQUE_NAME + ".[Slicer]" + 
              "\nAS Aggregate({" + members + "})"
      ;
    }, this);
    return mdx;
  },
  getNonSlicerAxisCalculatedMembersMdx: function(){
    var mdx = "";
    this.eachSetDef(function(setDef, setDefIndex, hierarchy, hierarchyIndex){
      var metadata = setDef.metadata;
      switch (setDef.type) {
        case "calculated-member":
          mdx += "\nMEMBER " + metadata.MEMBER_UNIQUE_NAME + " AS " + metadata.calculation;
          break;
        case "derived-measure":
          var queryDesigner = this.getQueryDesigner();
          mdx += "\n" + metadata.calculation.call(null, metadata, queryDesigner) + " ";
          break;
        default:
      }
    }, this);    
    return mdx;
  },
  getCalculatedMembersMdx: function(){
    if (this.generateSlicerAsTuple()) {
      mdx = this.getSlicerAxisAsTupleCalculatedMembersMdx();
    }
    else {
      mdx = this.getNonSlicerAxisCalculatedMembersMdx();
    }    
    return mdx;
  },
  getOrderMdx: function(mdx){
    var sortOption = this.sortOption;
    if (sortOption) {
      var direction = sortOption.direction.toUpperCase();
      if (this.getUserSortBreaksHierarchy()) {
        direction = "B" + direction;
      }
      var args = [mdx, sortOption.memberInfo.expression, direction];
      mdx = "Order(" + args.join(",") + ")";
    }
    return mdx;
  },
  getMemberSetMdx: function(){
    var conf = this.conf;
    var mdx = "";
    var indent = "";
    this.eachHierarchy(function(hierarchy, hierarchyIndex){
      var members = "";
      this.eachSetDef(function(setDef, setDefIndex){
        var type = setDef.type;
        if (type === "property") {
          return;
        }
        if (members.length) {
          members += ", ";
        }
        members += setDef.expression;
      }, this, hierarchy);
      members = "{" + members + "}";
      if (this.hierarchized === true && !this.isMeasureHierarchy(hierarchy) && !this.isSlicerAxis()) {
        members = "Hierarchize(" + members + ")";
      }
      indent += "  ";
      mdx = mdx ? "\n" + indent + "CrossJoin(" + mdx + "\n," + indent + members + ")" : members;
    }, this);

    if (mdx && conf.isDistinct) {
      mdx = "Distinct(" + mdx + ")";
    }

    mdx = this.getOrderMdx(mdx);
    return mdx;
  },
  getNonSlicerAxisMdx: function(defaultSet){
    var mdx = this.getMemberSetMdx();
    if (!mdx.length && defaultSet) {
      mdx = defaultSet;
    }
    if (!this.isSlicerAxis() && mdx.length) {
      mdx = this.getNonEmptyClauseMdx() + mdx;
      mdx += this.getDimensionPropertiesMdx();
      mdx += this.getOnAxisClauseMdx();
    }
    return mdx;
  },
  getMdx: function(defaultSet) {
    var mdx;
    if (this.generateSlicerAsTuple()) {
      mdx = this.getSlicerAxisAsTupleMdx();
    }
    else {
      mdx = this.getNonSlicerAxisMdx(defaultSet);
    }
    return mdx;
  },
  generateSlicerAsTuple: function(){
    var conf = this.getQueryDesigner().conf || {};
    var generateSlicerAsTuple = this.isSlicerAxis() && (conf.generateTupleForSlicer === true);
    return generateSlicerAsTuple;
  },
  highlight: function(classToAdd, classToRemove) {
    var dom = this.getDom();
    rCls(dom, classToRemove);
    aCls(dom, classToAdd);
  },
  highlightSortOptionsValid: function(){
    var dom = this.getUserSortOptionsDom();
    rCls(dom, "invalid-sort-options");
    aCls(dom, "valid-sort-options")
  },
  highlightSortOptionsInvalid: function(){
    var dom = this.getUserSortOptionsDom();
    rCls(dom, "valid-sort-options");
    aCls(dom, "invalid-sort-options")
  },
  highlightValid: function() {
    this.highlight("valid-drop-axis", "invalid-drop-axis");
  },
  highlightInvalid: function() {
    this.highlight("invalid-drop-axis", "valid-drop-axis");
  },
  removeHighlight: function(){
    rCls(this.getDom(), ["valid-drop-axis", "invalid-drop-axis"]);
    var sortDom = this.getUserSortOptionsDom();
    if (!sortDom) {
      return;
    }
    rCls(sortDom, ["invalid-sort-options", "valid-sort-options"]);
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

linkCss(cssDir + "mdquerydesigner.css");
