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
function showAlert(title, text){
  var parent = top, fun;
  if (parent) {
    fun = parent.mantle_showAlert || parent.mantle_showMessage;
  }
  if (typeof(fun) === "function") {
    fun(title, text);
  }
  else
  if (typeof(Dialog) === "function") {
    Dialog.alert(title, text);
  }
  else {
    alert(title + "\n\n" + text);
  }
}

function showConfirm(message, title, onOk, onCancel, scope, acceptLabel, cancelLabel){
  if (!(message)) {
    message = "Please confirm";
  }
  message = gMsg(message);
  if (!(scope)) {
    scope = null;
  }
  if (top.gwtConfirm) {
    if (!(title)) {
      title = "Confirm";
    }
    title = gMsg(title);
    if (!(cancelLabel)) {
      cancelLabel = "Cancel";
    }
    cancelLabel = gMsg(cancelLabel);
    if (!(acceptLabel)) {
      acceptLabel = "Ok";
    }
    acceptLabel = gMsg(acceptLabel);
    top.gwtConfirm(message, {
      onOk: function(){
        if (onOk) {
          onOk.call(scope);
        }
      },
      okOk: function(){
        if (onOk) {
          onOk.call(scope);
        }
      },
      onCancel: function(){
        if (onCancel) {
          onCancel.call(scope);
        }
      }
    }, {
      title: title,
      acceptLabel: acceptLabel,
      cancelLabel: cancelLabel
    });
  }
  else {
    if (confirm(message)) {
      onOk.call(scope);
    }
    else {
      onCancel.call(scope);
    }
  }
}
