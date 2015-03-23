var messages = {};

function aMsg(key, message){
  if (arguments.length === 2 && iStr(key) && iStr(message)) {
    messages[key] = message;
  }
  else
  if (arguments.length === 1 && iObj(key)){
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
  else {
    msgArgs = args;
    if (!iObj(msgArgs)) {
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