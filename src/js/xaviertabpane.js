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
var XavierTabPane;

(function(){

/**
*  tab pane
*/
(XavierTabPane = function(conf){
  if (!conf) {
    conf = {};
  }
  if (!conf.classes) {
    conf.classes = ["xavier-tabpane"];
  }
  if (!conf.tabs) {
    this.welcomeTab = new XavierDocumentTab({
      tabPane: this,
      closeable: false
    });
    conf.tabs = [this.welcomeTab];
  }
  arguments.callee._super.apply(this, [conf]);
}).prototype = {
  getWelcomeTab: function(){
    return this.welcomeTab;
  },
  closeTab: function(index) {
    var tab = this.getTab(index);
    tab.destroy();
    TabPane.prototype.closeTab.call(this, index);
  },
  getAutoRunEnabled: function(){
    return this.conf.autorun;
  },
  setAutoRunEnabled: function(autorun){
    this.conf.autorun = autorun;
  },
  getQueryDesigner: function(){
    var selectedTab = this.getSelectedTab();
    if (!selectedTab) {
      return null;
    }
    return selectedTab.getQueryDesigner();
  },
  getDnd: function(){
    return this.conf.dnd;
  },
  getXlsxExporter: function(){
    var excelExporter = this.conf.excelExporter;
    if (!excelExporter) {
      excelExporter = new XlsxExporter();
      this.conf.excelExporter = excelExporter;
    }
    return excelExporter;
  },
  getXmla: function(){
    return this.conf.xmla;
  },
  getXmlaTreeView: function(){
    return this.conf.xmlaTreeView;
  },
  getXmlaMetadataFilter: function(){
    return this.conf.xmlaMetadataFilter;
  },
  newTab: function(component){
    this.addTab(component);
    if (!component.getQueryDesigner) {
      return;
    }
    var queryDesigner = component.getQueryDesigner();
    if (!queryDesigner) {
      return;
    }
    queryDesigner.render();
  },
  newInfoTab: function(conf){
    var infoTab = new XavierDocumentTab({
      tabPane: this,
      text: conf.title,
      url: conf.url,
      forCube: true
    });
    this.newTab(infoTab);
    return infoTab;
  },
  getMetadata: function(){
    return {
      datasource: this.getDatasource(),
      catalog: this.getCatalog(),
      cube: this.getCube()
    };
  },
  setMetadata: function(metadata){
    this.setDatasource(metadata.datasource);
    this.setCatalog(metadata.catalog);
    this.setCube(metadata.cube);
  },
  setCube: function(metadata){
    if (metadata.cube && metadata.catalog && metadata.datasource) {
      this.setMetadata(metadata);
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
  doLayout: function(){
    this.eachTab(function(tab, index){
      tab.doLayout();
    });
  },
  clear: function(){
    var selectedTab = this.getSelectedTab();
    if (!selectedTab) {
      return null;
    }
    selectedTab.clear();
  },
  executeQuery: function(){
    var selectedTab = this.getSelectedTab();
    if (!selectedTab) {
      return null;
    }
    selectedTab.executeQuery();
  },
  exportToExcel: function(){
    var selectedTab = this.getSelectedTab();
    if (!selectedTab) {
      return null;
    }
    selectedTab.exportToExcel();
  },
  getTabsForCube: function(cube){
    if (iUnd(cube)){
      cube = this.getMetadata()
    }
    var i, n, tabsForCube = [];
    this.eachTab(function(tab, index){
      if (tab.isForCube(cube) === true) {
        tabsForCube.push(index);
      }
    });
    return tabsForCube;
  },
  closeTabsForCube: function(cube){
    var tabsToClose = this.getTabsForCube(cube);
    for (i = tabsToClose.length - 1; i >= 0; i--){
      this.closeTab(tabsToClose[i]);
    }
  },
  hasTabsForCube: function(cube){
    var tabsForCube = this.getTabsForCube(cube);
    return tabsForCube.length !== 0;
  }
};
adopt(XavierTabPane, TabPane);
linkCss(cssDir + "xaviertabpane.css");

})();