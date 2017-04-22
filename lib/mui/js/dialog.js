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
var Dialog;
(function(){

(Dialog = function(conf){
  this.conf = conf;
  this.createDom();
}).prototype = {
  yesLabel: "Yes",
  noLabel: "No",
  cancelLabel: "Cancel",
  createDom: function(){
    this.yesButton = cEl("button", {
      "class": Dialog.prefix + "-button-yes"
    });
    listen(this.yesButton, "click", this.yesHandler, this);

    this.noButton = cEl("button", {
      "class": Dialog.prefix + "-button-no"
    });
    listen(this.noButton, "click", this.noHandler, this);

    this.cancelButton = cEl("button", {
      "class": Dialog.prefix + "-button-cancel"
    });
    listen(this.cancelButton, "click", this.cancelHandler, this);

    this.title = cEl("div", {
      "class": Dialog.prefix + "-title"
    });
    this.body = cEl("div", {
      "class": Dialog.prefix + "-body"
    });

    this.dom = cEl("div", {
      "class": Dialog.prefix
    }, [
      this.title,
      this.body,
      cEl("div", {
        "class": Dialog.prefix + "-buttons"
      }, [this.yesButton, this.noButton, this.cancelButton])
    ], body);
    this.hide();
  },
  getDom: function(){
    if (!this.dom) {
      this.createDom();
    }
    return this.dom;
  },
  yesHandler: function(){
    if (this._conf.yes && this._conf.yes.handler) {
      this._conf.yes.handler.call(this._conf.scope);
    }
    this.hide();
  },
  noHandler: function(){
    if (this._conf.no && this._conf.no.handler) {
      this._conf.no.handler.call(this._conf.scope);
    }
    this.hide();
  },
  cancelHandler: function(){
    if (this._conf.cancel && this._conf.cancel.handler) {
      this._conf.cancel.handler.call(this._conf.scope);
    }
    this.hide();
  },
  show: function(conf){
    if (!conf) {
      conf = this.conf;
    }
    var dom = this.getDom();

    this.title.innerHTML = conf.title;
    this.body.innerHTML = conf.message;
    Dialog._super.prototype.show.call(this, conf);

    this._conf = conf;
    var yes = conf.yes;
    if (yes) {
      this.yesButton.innerHTML = yes.label || this.yesLabel;
      if (yes.focus) {
        this.yesButton.focus();
      }
    }
    Displayed.setDisplayed(this.yesButton, Boolean(yes));

    var no = conf.no;
    if (no) {
      this.noButton.innerHTML = no.label || this.noLabel;
      if (no.focus) {
        this.noButton.focus();
      }
    }
    Displayed.setDisplayed(this.noButton, Boolean(no));

    var cancel = conf.cancel;
    if (cancel) {
      this.cancelButton.innerHTML = cancel.label || this.cancelLabel;
      if (cancel.focus) {
        this.cancelButton.focus();
      }
    }
    Displayed.setDisplayed(this.cancelButton, Boolean(cancel));

    var innerWidth = window.innerWidth || doc.clientWidth;
    var left = pDec((innerWidth - dom.clientWidth)/2);
    dom.style.left = left + "px";

    var innerHeight = window.innerHeight || doc.clientHeight;
    var top = pDec((window.innerHeight - dom.clientHeight)/2);
    dom.style.top = top + "px";
  }
};

Dialog.alert = function(title, message, handler, scope){
  if (!Dialog.alertDialog) {
    (Dialog.alertDialog = new Dialog({
      yes: {
        label: "Ok",
        focus: true
      }
    })).createDom();
  }
  Dialog.alertDialog.show({
    title: title,
    message: message,
    scope: scope,
    yes: {
      label: "Ok",
      focus: true,
      handler: handler
    }
  });
};

Dialog.confirm = function(title, message, yesHandler, cancelHandler, scope){
  if (!Dialog.confirmDialog) {
    (Dialog.confirmDialog = new Dialog({
    })).createDom();
  }
  Dialog.confirmDialog.show({
    title: title,
    message: message,
    scope: scope,
    yes: {
      label: "Ok",
      handler: yesHandler
    },
    cancel: {
      label: "Cancel",
      handler: cancelHandler
    }
  });
};

adopt(Dialog, Displayed);
Dialog.prefix = "dialog";

linkCss(muiCssDir + "dialog.css");

})();