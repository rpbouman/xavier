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
var showLoadingIndicator, hideLoadingIndicator;

if (iFun(window.top.showLoadingIndicator)) {
  showLoadingIndicator = function(){
    win.top.showLoadingIndicator();
  }

  hideLoadingIndicator = function(){
    win.top.hideLoadingIndicator();
  }
}
else {
  var spinner = new Spinner({
    delayHide: 125,
    useTransitions: typeof(useTransitions)==="undefined" ? true : Boolean(useTransitions)
  });
  showLoadingIndicator = function(){
    spinner.show();
  };
  hideLoadingIndicator = function(){
    spinner.hide();
  };
}

function busy(yes){
  if (yes) {
    showLoadingIndicator();
  }
  else {
    hideLoadingIndicator();
  }
}
linkCss(cssDir + "loadingindicator.css");
busy(true);