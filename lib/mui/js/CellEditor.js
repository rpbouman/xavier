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
var CellEditor, CellTextEditor, CellListEditor;

(function() {

(CellEditor = function(conf){
  var me = this;
  conf = conf || {};
  me.conf = conf;
  me.id = conf.id ? conf.id : ++CellEditor.id;
  arguments.callee._super.apply(this, arguments);
  CellEditor.instances[me.getId()] = me;
}).prototype = {
  getId: function() {
    return CellEditor.prefix + this.id;
  },
  getContainer: function() {
    //return gEl(this.conf.containerId);
    return this.getDom().parentNode;
  },
  getDom: function() {
    var dom = this.inputEl;
    if (!dom) {
      dom = this.createDom();
    }
    return dom;
  },
  setInputValue: function(value){
    throw "Not implemented";
  },
  getInputValue: function(){
    throw "Not implemented";
  },
  createInputElement: function(){
    throw "Not implemented";
  },
  inputElementCreated: function(){
    //noop
  },
  createDom: function() {
    var conf = this.conf;
    var input = conf.input;
    var el;
    if (iEmt(input)) {
      el = input;
    }
    else {
      el = this.createInputElement();
    }
    this.inputEl = el;
    el.id = this.getId();
    el.className = CellEditor.prefix + " " + el.className;
    listen(el, "blur", this.changeHandler, this);
    listen(el, "keydown", this.keydownHandler, this);
    this.inputElementCreated();
    return el;
  },
  changeHandler: function() {
    if (this.handlingChange) {
      return;
    }
    this.handlingChange = true;
    //var cellEditor = CellEditor.lookup(this);
    this.handleChange();
    this.handlingChange = false;
  },
  keydownHandler: function(event){
    this.fireEvent("keydown", event);
  },
  handleChange:  function() {
    var me = this, dom = me.getDom();
    if (!dom.parentNode) return;
    if (dom.value === me.oldValue) {
      me.stopEditing();
      return;
    }
    var oldValue = this.oldValue;
    var data = {
      oldValue: oldValue,
      newValue: dom.value
    };
    if (me.doCallback("beforeCellChange", data) === false) {
      return;
    }
    if (me.doCallback("cellChanged", data) !== false) {
      //this.oldValue = dom.value;
      me.stopEditing();
    }
  },
  doCallback: function(eventType, eventData) {
    if (!this.callback) return;
    return this.callback.call(this.scope || this, this, eventType, eventData);
  },
  stopEditing: function() {
    var me = this;
    var dom = me.getDom();
    var container = dom.parentNode;
    if (!container) {
      return;
    }

    var value = this.getInputValue();
    if (this.fireEvent("stopEditing", {
      container: container,
      oldValue: this.oldValue,
      newValue: value
    })===false) {
      return false;
    }
    if (this.doCallback("stopEditing", null) === false) {
      return false;
    }
    this.callback = null;
    dom.disabled = true;
    if (container.firstChild === dom) {
      try {
        container.removeChild(dom);
        container.innerHTML = value;
      }
      catch (e) {
        //debugger;
      }
    }
    this.fireEvent("editingStopped", {
      container: container,
      oldValue: this.oldValue,
      newValue: value
    });
  },
  startEditing: function(container, callback, scope) {
    var me = this;
    if (me.stopEditing() === false) {
      return false;
    }
    var dom = me.getDom();
    this.oldValue = container.innerText || container.textContent;
    if (this.fireEvent("startEditing", {
      container: container,
      oldValue: this.oldValue
    }) === false) {
      return false;
    }
    this.callback = callback;
    this.scope = scope;
    dom.disabled = false;
    var computedStyle = getComputedStyle(container);
    dom.style.width = (container.scrollWidth - (
        pDec(computedStyle.borderLeftWidth) +
        pDec(computedStyle.borderRightWidth) +
        pDec(computedStyle.paddingLeft) +
        pDec(computedStyle.paddingRight)
      )
    ) + "px";
    dom.style.height = (container.scrollHeight - (
        pDec(computedStyle.borderTopWidth) +
        pDec(computedStyle.borderBottomWidth) +
        pDec(computedStyle.paddingTop) +
        pDec(computedStyle.paddingBottom)
      )
    ) + "px";
    container.innerHTML = "";
    container.appendChild(dom);
    this.setInputValue(this.oldValue);
    if (dom.select) {
      dom.select();
    }
    dom.focus();
    this.fireEvent("editingStarted", {
      container: container,
      oldValue: this.oldValue
    });
    return true;
  }
};
CellEditor.id = 0;
CellEditor.prefix = "celleditor";
CellEditor.instances = {};
CellEditor.getInstance = function(id){
  if (iInt(id)) id = CellEditor.prefix + id;
  return CellEditor.instances[id];
};
CellEditor.lookup = function(el){
  var re = new RegExp("^" + CellEditor.prefix + "\\d+$", "g");
  while (el && !re.test(el.id)) {
    if ((el = el.parentNode) === doc) return null;
  }
  return CellEditor.getInstance(el.id);
};

adopt(CellEditor, Observable);
linkCss(muiCssDir + "celleditor.css");

(CellTextEditor = function(conf) {
  arguments.callee._super.apply(this, arguments);
}).prototype = {
  setInputValue: function(value){
    var dom = this.getDom();
    dom.value = value;
  },
  getInputValue: function(){
    var dom = this.getDom();
    var value = dom.value;
    return value;
  },
  createInputElement: function(){
    var el = cEl("input", {
      type: "text",
      size: 0,
      "class": "celltexteditor"
    });
    return el;
  }
};
adopt(CellTextEditor, CellEditor);

(CellListEditor = function(conf) {
  arguments.callee._super.apply(this, arguments);
}).prototype = {
  setInputValue: function(value){
    var dom = this.getDom();
    var i, n = dom.options.length, option;
    for (i = 0 ; i < n; i++) {
      option = dom.options[i];
      if (option.value !== value) {
        continue;
      }
      break;
    }
    dom.selectedIndex = i;
  },
  getInputValue: function(){
    var dom = this.getDom();
    var i, n = dom.options.length, option, value;
    for (i = 0 ; i < n; i++) {
      option = dom.options[i];
      if (!option.selected) {
        continue;
      }
      value = option.value;
      break;
    }
    return value;
  },
  createInputElement: function(){
    var input = this.conf.input;
    var el = cEl("select", {
      "class": "celllisteditor"
    });
    if (input.options) {
      var i, n = input.options.length, option, childNodes = [];
      for (i = 0; i < n; i++) {
        option = input.options[i];
        childNodes.push(cEl("option", {
          value: option,
          label: option
        }, option));
      }
      aCh(el, childNodes);
    }
    return el;
  }
};
adopt(CellListEditor, CellEditor);


})();