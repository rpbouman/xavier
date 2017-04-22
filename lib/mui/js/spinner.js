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
var Spinner;
(function(){

(Spinner = function(conf){
  conf = this.conf = conf || {};

  this.hideTimer = new Timer({
    id: "hideTimer",
    delay: conf.delay || Spinner.prototype.delay,
    listeners: {
      expired: this._hide,
      scope: this
    }
  });

  this.showTimer = new Timer({
    id: "showTimer",
    delay: conf.delay || Spinner.prototype.delay,
    listeners: {
      expired: this._show,
      scope: this
    }
  });

  this.id = conf.id ? conf.id : ++Spinner.id;
  this.useTransitions = iDef(conf.useTransitions) ? conf.useTransitions : Spinner.prototype.useTransitions;
  Spinner.instances[this.getId()] = this;
}).prototype = {
  delay: 125,
  useTransitions: true,
  getId: function(){
    return Spinner.prefix + this.id;
  },
  getContainer: function(){
    return gEl(this.conf.container) || body;
  },
  createDom: function(){
    var conf = this.conf;
    var classes = confCls(
      Spinner.prefix,
      conf
    );
    var container = this.getContainer();
    var dom = cEl("div", {
      "class": classes,
      "id": this.getId()
    }, null, container);
    if (!this.showTimer.isStarted()) {
      this._hideOrFadeOut();
    }
    return dom;
  },
  getDom: function() {
    var el = gEl(this.getId());
    if (!el) {
      el = this.createDom();
    }
    return el;
  },
  fadeIn: function(){
    var dom = this.getDom();
    if (hCls(dom, "spinner-fade-in")) {
      return;
    }
    rCls(dom, "spinner-fade-out", "");
    aCls(dom, "spinner-fade-in");
  },
  fadeOut: function(){
    var dom = this.getDom();
    if (hCls(dom, "spinner-fade-out")) {
      return;
    }
    rCls(dom, "spinner-fade-in", "");
    aCls(dom, "spinner-fade-out");
  },
  _showImmediate: function(){
    Displayed.prototype.show.call(this);    
  },
  _show: function(){
    if (this.hideTimer.isStarted()) {
      return;
    }
    this._showOrFadeIn();
  },
  _showOrFadeIn: function(){
    if (this.useTransitions) {
      this.fadeIn();
    }
    else {
      this._showImmediate();
    }
    
  },
  _hideImmediate: function(){
    Displayed.prototype.hide.call(this);
  },
  _hide: function(){
    if (this.showTimer.isStarted()) {
      return;
    }
    this._hideOrFadeOut();
  },
  _hideOrFadeOut: function(){
    if (this.useTransitions) {
      this.fadeOut();
    }
    else {
      this._hideImmediate();
    }
    
  },
  getDelay: function(delay){
    if (typeof(delay) && iInt(delay)) {
      return delay;
    }
    delay = this.conf.delay || Spinner.prototype.delay;
    return delay;
  },
  show: function(delay) {
    if (this.showTimer.isStarted()) {
      return;
    }
    if (this.hideTimer.isStarted()){
      this.hideTimer.cancel();
    }
    this.showTimer.start(this.getDelay(delay));
  },
  hide: function(delay){
    if (this.hideTimer.isStarted()) {
      return;
    }
    if (this.showTimer.isStarted()){
      this.showTimer.cancel();
    }
    this.hideTimer.start(this.getDelay(delay));
  }
};
Spinner.id = 0;
Spinner.prefix = "spinner";
Spinner.instances = {};
Spinner.getInstance = function(id){
    if (iInt(id)) id = Spinner.prefix + id;
    return Spinner.instances[id];
};
Spinner.lookup = function(el){
  var re = new RegExp("^" + Spinner.prefix + "\\d+$", "g");
  while (el && !re.test(el.id)) {
      if ((el = el.parentNode) === doc) return null;
  }
  return Spinner.getInstance(el.id);
};

adopt(Spinner, Displayed);

linkCss(muiCssDir + "spinner.css");

})();
