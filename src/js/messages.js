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