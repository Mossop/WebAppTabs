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
 *   Dave Townsend <dtownsend@oxymoronical.com>
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

Components.utils.import("resource://gre/modules/NetUtil.jsm");
Components.utils.import("resource://webapptabs/modules/LogManager.jsm");
LogManager.createLogger(this, "webtab");

const Cc = Components.classes;
const Ci = Components.interfaces;
const Ce = Components.Exception;

var EXTPREFNAME = "extension.webapptabs.data";

const WEBAPP_SCHEMA = 1;
const DEFAULT_WEBAPPS = [{
  'name': 'Google Calendar',
  'href': 'https://calendar.google.com/',
  'icon': 'https://calendar.google.com/googlecalendar/images/favicon.ico',
}, {
  'name': 'Facebook',
  'href': 'https://www.facebook.com/',
  'icon': 'https://www.facebook.com/favicon.ico',
}, {
  'name': 'Google+',
  'href': 'https://plus.google.com/',
  'icon': 'https://ssl.gstatic.com/s2/oz/images/favicon.ico',
}, {
  'name': 'Twitter',
  'href': 'https://www.twitter.com',
  'icon': 'https://www.twitter.com/favicon.ico',
}];

var webtabs = {
  // A map from webapp ID to webapp descriptor
  tabDescsMap: null,
  // A list of webapp descriptors
  tabDescsList: null,

  // A reference to the default window content area click handler
  _origContentAreaClick: null,

  onLoad: function() {
    this.tabDescsMap = {};
    this.loadPrefs();
    this.tabDescsList.forEach(function(aDesc) {
      this.createWebAppButton(aDesc);
    }, this);

    this._origContentAreaClick = contentAreaClick;
    window.contentAreaClick = this.newContentAreaClick;
  },

  onUnload: function() {
    window.contentAreaClick = this._origContentAreaClick;

    this.tabDescsList.forEach(function(aDesc) {
      this.removeWebAppButton(aDesc);
    }, this);
  },

  newContentAreaClick: function(aEvent) {
    // If you click in a link to a website we have a shortcut for, we load it in a tab
    let href = hRefForClickEvent(aEvent);
    for (let [, tabDesc] in Iterator(webtabs.tabDescsList)) {
      if (href.indexOf(tabDesc['options']['contentPage']) == 0) {
        tabDesc.options.contentPage = href;
        let tabmail = document.getElementById('tabmail');
        let info = tabmail.openTab("contentTab", tabDesc.options);
        info.tabNode.image=tabDesc.icon;
        aEvent.preventDefault()
        return;
      }
    }
    this._origContentAreaClick(aEvent);
  },

  createWebAppButton: function(aDesc) {
    if (!aDesc.id) {
      aDesc.id = aDesc.name.replace(' ', '_', 'g');
    }

    if (!webtabs.tabDescsMap[aDesc.id]) {
      this.tabDescsMap[aDesc.id] = aDesc;
    }

    let tabmailButtons = document.getElementById("tabmail-buttons");
    let button = document.createElement("toolbarbutton");
    button.setAttribute("id", aDesc.id);
    button.setAttribute("class", "webtab");
    button.setAttribute("style", "list-style-image: url('" + aDesc.icon + "')");
    tabmailButtons.appendChild(button);

    button.addEventListener("command", function() {
      webtabs.openTab(aDesc);
    }, false);
  },

  removeWebAppButton: function(aDesc) {
    let button = document.getElementById(aDesc.id);
    if (button)
      button.parentNode.removeChild(button);
    else
      ERROR("Missing webapp button for " + aDesc.name);
  },

  openTab: function(aDesc) {
    let url = NetUtil.newURI(aDesc.href);
    let regex = new RegExp("^http[s]?://" + url.hostname + "/");

    let tabmail = document.getElementById('tabmail');
    let info = tabmail.openTab("contentTab", {
      contentPage: aDesc.href,
      clickHandler: "return true;"
    });

    info.tabNode.image = aDesc.icon;

    info.browser.addEventListener("click", function(aEvent) {
      specialTabs.siteClickHandler(aEvent, regex);
    }, false);
  },

  siteClickHandler: function(aEvent) {
  },

  persistPrefs: function() {
    let jsondata = JSON.stringify({
      schema: WEBAPP_SCHEMA,
      webapps: this.tabDescsList,
    })
    Application.prefs.setValue(EXTPREFNAME, jsondata);
  },

  loadPrefs: function() {
    try {
      if (Application.prefs.has(EXTPREFNAME)) {
        let data = JSON.parse(Application.prefs.get(EXTPREFNAME).value);
        let schema = 0;
        if ("schema" in data)
          schema = data.schema;

        switch (schema) {
        case WEBAPP_SCHEMA:
          this.tabDescsList = data.webapps;
          break;
        default:
          throw new Ce("Unknown webapps data schema " + schema);
        }

        return;
      }
    }
    catch (e) {
      ERROR("Failed to read webapps from config", e);
    }

    this.tabDescsList = DEFAULT_WEBAPPS;
    this.persistPrefs();
  }
};

var OverlayListener = {
  load: function() {
    webtabs.onLoad();
  },

  unload: function() {
    webtabs.onUnload();
  }
};
