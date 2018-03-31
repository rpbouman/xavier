/*

Copyright 2014 - 2018 Roland Bouman (roland.bouman@gmail.com)

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
if (typeof(messages) === "undefined") {
  var messages = {};
}
else {
  console.error("There is already a global variable called \"messages\".");
}

function aMsg(key, message){
  if (arguments.length === 2 && typeof(key) === "string" && iStr(message)) {
    messages[key] = message;
  }
  else
  if (arguments.length === 1 && typeof(key) === "object"){
    var p;
    for (p in key) {
      aMsg(p, key[p]);
    }
  }
}

function gMsg(key, args){
  if (!key) {
    throw "No message key specified";
    debugger;
  }
  var msg = messages[key] || key;
  var n = arguments.length, msgArgs;
  if (n > 2) {
    msgArgs = {};
    for (i = 1; i < n; i++){
      msgArgs[i] = arguments[i];
    }
  }
  else
  if (n === 2) {
    msgArgs = args;
    if (typeof(msgArgs) !== "object") {
      msgArgs = {"1": msgArgs}
    }
  }
  var msgArg;
  for (msgArg in msgArgs) {
    var re = new RegExp("\\$\\{" + msgArg + "\\}", "ig");
    msg = msg.replace(re, msgArgs[msgArg]);
  }
  return msg;
}