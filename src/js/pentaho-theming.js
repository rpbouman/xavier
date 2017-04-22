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
