var mantle_win;
if (parent) {
  mantle_win = parent;
}
if (window.opener) {
  if (window.opener.parent) {
    mantle_win = window.opener.parent;
  } 
  else {
    mantle_win = window.opener;
  }
}

if (mantle_win) {
  var active_theme = mantle_win.active_theme;
  var core_theme_tree = mantle_win.core_theme_tree;
  var module_theme_tree = mantle_win.module_theme_tree;
  var CONTEXT_PATH = mantle_win.CONTEXT_PATH;
}
