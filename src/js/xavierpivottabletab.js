/*

Copyright 2014 - 2016 Roland Bouman (roland.bouman@gmail.com)

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
/**
*   Pivot table tab
*/
var XavierPivotTableTab;
(XavierPivotTableTab = function(conf){
  conf = conf || {};
  conf.showHorizontalHierarchyHeaders = Boolean(conf.showHorizontalHierarchyHeaders);
  conf.showVerticalHierarchyHeaders = Boolean(conf.showVerticalHierarchyHeaders);
  this.classes = ["pivot-table"];
  arguments.callee._super.apply(this, [conf]);
}).prototype = {
  text: gMsg("Pivot Table"),
  initToolbar: function(dom){
    var conf = this.conf;
    var toolbar = this.toolbar = new Toolbar({
      container: dom
    });
    toolbar.addButton([
      {"class": "show-column-hierarchy-headers",
        tooltip: gMsg("Show column hierarchy headers"),
        toggleGroup: "show-column-hierarchy-headers",
        depressed: conf.showHorizontalHierarchyHeaders
      },
      {"class": "show-row-hierarchy-headers",
        tooltip: gMsg("Show row hierarchy headers"),
        toggleGroup: "show-row-hierarchy-headers",
        depressed: conf.showVerticalHierarchyHeaders
      }
    ]);
    toolbar.listen({
      scope: this,
      buttonPressed: function(toolbar, event, button){
        var conf = button.conf;
        var className = conf["class"];
        switch (className) {
          default:
            throw "Not implemented";
        }
      },
      afterToggleGroupStateChanged: function(toolbar, event, data){
        var depressedButton = toolbar.getDepressedButtonInToggleGroup(data.group);
        switch (data.group) {
          case "show-column-hierarchy-headers":
            this.visualizer.showHorizontalHierarchyHeaders(depressedButton ? true : false);
            break;
          case "show-row-hierarchy-headers":
            this.visualizer.showVerticalHierarchyHeaders(depressedButton ? true : false);
            break;
        }
      }
    });
  },
  createQueryDesigner: function(dom){
    var intrinsicProperties = ["PARENT_UNIQUE_NAME"];
    var queryDesigner = this.queryDesigner = new QueryDesigner({
      container: cEl("DIV", {}, null, dom),
      dnd: this.getDnd(),
      xmla: this.getXmla(),
      xmlaTreeView: this.getXmlaTreeView(),
      axes: [
        {
          id: Xmla.Dataset.AXIS_COLUMNS,
          label: gMsg("Columns"),
          tooltip: gMsg("Items on this axis are used to generate columns for the pivot table"),
          hint: gMsg("Drag any levels, members or measures unto the columns axis to create columns in the pivot table."),
          "class": "columns",
          //isDistinct: true,
          isDistinct: false,
          mandatory: true,
          intrinsicProperties: intrinsicProperties,
          userSortBreaksHierarchy: false
        },
        {
          id: Xmla.Dataset.AXIS_ROWS,
          label: gMsg("Rows"),
          tooltip: gMsg("Items on this axis are used to generate rows for the pivot table"),
          hint: gMsg("Optionally, drag any levels, members or measures unto the row axis to create rows in the pivot table."),
          "class": "rows",
          //isDistinct: true,
          isDistinct: false,
          intrinsicProperties: intrinsicProperties,
          userSortBreaksHierarchy: false
        },
        {
          id: Xmla.Dataset.AXIS_SLICER
        }
      ]
    });
    return queryDesigner;
  },
  showHorizontalHierarchyHeaders: function(setting){
    var toolbar = this.toolbar;
    if (iDef(setting)) {
      toolbar.getButtonWithClass("show-column-hierarchy-headers").setDepressed(setting);
      this.visualizer.showHorizontalHierarchyHeaders(setting)
    }
    else {
      return toolbar.getDepressedButtonInToggleGroup("show-column-hierarchy-headers") ? true : false;
    }
  },
  showVerticalHierarchyHeaders: function(setting){
    var toolbar = this.toolbar;
    if (iDef(setting)) {
      toolbar.getButtonWithClass("show-row-hierarchy-headers").setDepressed(setting);
      this.visualizer.showVerticalHierarchyHeaders(setting);
    }
    else {
      return toolbar.getDepressedButtonInToggleGroup("show-row-hierarchy-headers") ? true : false;
    }
  },
  initPivotTable: function(dom){
    var pivotTable = this.visualizer = new PivotTable({
      showHorizontalHierarchyHeaders: this.showHorizontalHierarchyHeaders(),
      showVerticalHierarchyHeaders: this.showVerticalHierarchyHeaders()
    });
    dom.appendChild(pivotTable.getDom());
    pivotTable.listen({
      scope: this,
      collapse: function(pivotTable, event, data){
        this.collapseMember(data);
      },
      expand: function(pivotTable, event, data){
        this.expandMember(data);
      }
    });
    return pivotTable;
  },
  drillMember: function (drillEventData, drillDirection){
    var queryDesigner = this.getQueryDesigner();
    var xmla = this.getXmla();
    var axisId = queryDesigner.getAxisId(drillEventData.axis);
    var axis = queryDesigner.getAxis(axisId);
    if (!axis) {
      throw "Invalid axis " + drillEventData.axis;
    }
    //first, fetch the metadata for this member
    var datasource = this.getDatasource();
    var catalogName = this.getCatalog().CATALOG_NAME;
    var cubeName = this.getCube().CUBE_NAME;
    var properties = {
      DataSourceInfo: datasource.DataSourceInfo,
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
    busy(true);
    xmla.discoverMDMembers({
      url: datasource.URL,
      properties: properties,
      restrictions: restrictions,
      success: drillAction,
      error: function(xmla, options, exception){
        busy(false);
        throw exception;
      }
    });
  },
  collapseMember: function(data){
    this.drillMember(data, "up");
  },
  expandMember: function(data) {
    this.drillMember(data, "down");
  },
  createDom: function(){
    var me = this;

    var dom = cEl("DIV", {
      id: this.getId()
    });
    this.initToolbar(dom);
    this.initQueryDesigner(dom);
    this.visualizer = this.initPivotTable(dom);
    return dom;
  }
};
XavierPivotTableTab.newInstance = function(conf){
  return new XavierPivotTableTab(conf);
}
adopt(XavierPivotTableTab, XavierTab);
