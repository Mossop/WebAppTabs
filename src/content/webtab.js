/* ***** BEGIN LICENSE BLOCK *****
 *   Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 * 
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is WebTabs.
 *
 * The Initial Developer of the Original Code is
 * David Ascher.
 * Portions created by the Initial Developer are Copyright (C) 2010
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 * 
 * ***** END LICENSE BLOCK ***** */
Components.utils.import("resource:///modules/errUtils.js");
var EXTPREFNAME = "extension.webtabs.data";

var _initialTabData
 = [
  {'name': 'NYTimes',
    'icon': 'http://www.nytimes.com/favicon.ico',
    "regexp": new RegExp(""),
    'options': { "background" : false ,
    "contentPage" : "http://www.nytimes.com/",
    "clickHandler": "specialTabs.siteClickHandler(event, webtabs.tabDescs['regexp'])"
    }
  },
  {'name': 'Twitter',
    'icon': 'http://www.twitter.com/favicon.ico',
    "regexp": new RegExp(""),
    'options': { "background" : false ,
    "contentPage" : "http://www.twitter.com/",
    "clickHandler": "specialTabs.siteClickHandler(event, webtabs.tabDescs['regexp'])"
    }
  },
  {'name': 'BoingBoing',
    'icon': 'http://www.boingboing.net/favicon.ico',
    "regexp": new RegExp(""),
    'options': { "background" : false ,
    "contentPage" : "http://www.boingboing.net/",
    "clickHandler": "specialTabs.siteClickHandler(event, webtabs.tabDescs['regexp'])"
    }
  }
];

var webtabs = {
  onLoad: function(evt) {
    try {
      this.initialized = true;
      this.tabDescsMap = {};
      this.load();
      this.tabType = "contentTab";
    } catch (e) {
      logException(e);
    }
  },

  installTab: function(aDesc) {
    if (! webtabs.tabDescsMap[aDesc['id']])
      this.tabDescsMap[aDesc['id']] = aDesc;
    let tabmailButtons = document.getElementById("tabmail-buttons");
    let button = document.createElement("toolbarbutton");
    button.setAttribute("id", aDesc['id']);
    button.setAttribute("oncommand", "webtabs.openTab('" + aDesc['id']+ "')");
    button.setAttribute("class", "webtab");
    button.setAttribute("style", "list-style-image: url('" + aDesc["icon"] + "')");
    tabmailButtons.appendChild(button);
  },
  
  uninstallTab: function(id) {
    if (! webtabs.tabDescsMap[id])
      return;
    // remove button from tabuttons
    let button = document.getElementById(id);
    button.parentNode.removeChild(button);
    // remove from data structure
    delete this.tabDescsMap[id];
    webtabs.persist();
  },
  
  addWebTabToConfiguration: function(aDesc) {
    
  },

  removeWebTab: function(aDesc) {
    
  },
  
  clickHandlerInConfigurator: function(aEvent) {
    //event.preventDefault();
    return false;
  },
  OpenConfigurationTab: function() {
    document.getElementById('tabmail').openTab("chromeTab",
      { chromePage: "chrome://webtab/content/config.html",
        clickHandler: "webtabs.clickHandlerInConfigurator(event)",
        background: false });
  },
  openTab: function(aTabTypeName) {
    document.getElementById('tabmail').openTab(this.tabType,
        webtabs.tabDescsMap[aTabTypeName].options);
  },
  persist: function() {
    let jsondata = JSON.stringify(webtabs.tabDescsMap)
    Application.prefs.setValue(EXTPREFNAME, jsondata);
  },
  load: function() {
    let pref, configdata;
    if (! Application.prefs.has(EXTPREFNAME)) {
      configdata = _initialTabData
;
    } else {
      pref = Application.prefs.get(EXTPREFNAME);
      configdata = JSON.parse(pref.value);
    }
    for (let [,tabDesc] in Iterator(configdata)) {
      webtabs.installTab(tabDesc);
    }
  }
};
window.addEventListener("load", function(evt) { webtabs.onLoad(evt); }, false);
