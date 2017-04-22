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
var TreeSelection;

(function() {

(TreeSelection = function(conf) {
  this.conf = conf;
  this.treeListener = conf.treeListener || new TreeListener(conf);
  this.treeListener.listen("nodeClicked", this.clickHandler, this);
  if (conf.listeners) {
    this.listen(conf.listeners);
  }
  this.selection = [];
  this.multiple = Boolean(conf.multiple) || false;
}).prototype = {
  clickHandler: function(treeListener, type, data){
    var newSelection = [];
    var treeNode = data.treeNode;
    var event = data.event;
    if (this.multiple) {
    }
    else {
      newSelection[0] = treeNode;
    }
    this.setSelection(newSelection, data);
  },
  isNodeSelected: function(treeNode) {
    return hCls(getDom(treeNode), "selected");
  },
  updateSelection: function(selection, selected) {
    if (!selection) {
      return;
    }
    var i, n = selection.length, node, nodeDom;
    for (i = 0; i < n; i++){
      node = selection[0];
      nodeDom = getDom(node);
      if (selected && !this.isNodeSelected(node)) {
        aCls(nodeDom, "selected");
      }
      else
      if (!selected && this.isNodeSelected(node)) {
        rCls(nodeDom, "selected");
      }
    }
  },
  _setSelection: function(eventData) {
    this.updateSelection(eventData.oldSelection, false);
    this.updateSelection(eventData.newSelection, true);
    this.selection = eventData.newSelection;
  },
  selectionsEquals: function(oldSelection, newSelection) {
    if (oldSelection && !newSelection) {
      return false;
    }
    else
    if (!oldSelection && newSelection) {
      return false;
    }
    else
    if (oldSelection.length < newSelection.length) {
      return false;
    }
    else
    if (oldSelection.length > newSelection.length) {
      return false;
    }
    else {
      var i, l = oldSelection.length, o, n;
      for (i = 0; i < l; i++){
        o = oldSelection[i];
        n = newSelection[i];
        if (o !== n) {
          return false;
        }
      }
    }
    return true;
  },
  setSelection: function(selection, data) {
    var oldSelection = this.selection;
    var newSelection = selection;
    if (this.selectionsEquals(oldSelection, newSelection)) {
      return;
    }
    var eventData = {
      oldSelection: oldSelection,
      newSelection: newSelection,
      data: data
    };

    if (this.fireEvent("beforeChangeSelection", eventData) === false) {
      return;
    }
    this._setSelection(eventData);
    this.fireEvent("selectionChanged", eventData);
  },
  getSelection: function(){
    return this.selection;
  }
};

adopt(TreeSelection, Observable);

})();
