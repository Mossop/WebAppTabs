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

Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");
Components.utils.import("resource://gre/modules/NetUtil.jsm");
Components.utils.import("resource://webapptabs/modules/LogManager.jsm");
LogManager.createLogger(this, "webtab");
Components.utils.import("resource://webapptabs/modules/ConfigManager.jsm");

const Cc = Components.classes;
const Ci = Components.interfaces;
const Ce = Components.Exception;
const Cr = Components.results;

const webtabs = {
  // A WeakMap from webapp to tab
  webappTabMap: null,
  // The UI element that contains the webapp buttons
  buttonContainer: null,

  // A reference to the default window content area click handler
  _origContentAreaClick: null,

  onLoad: function() {
    this.webappTabMap = new WeakMap();
    this.buttonContainer = document.createElement("hbox");
    this.buttonContainer.setAttribute("id", "webapptabs-buttons");
    document.getElementById("tabmail-buttons").appendChild(this.buttonContainer);

    ConfigManager.webappList.forEach(function(aDesc) {
      this.createWebAppButton(aDesc);
    }, this);

    ConfigManager.addChangeListener(this.configChanged);

    this._origContentAreaClick = contentAreaClick;
    window.contentAreaClick = this.newContentAreaClick;
  },

  onUnload: function() {
    window.contentAreaClick = this._origContentAreaClick;

    ConfigManager.removeChangeListener(this.configChanged);

    ConfigManager.webappList.forEach(function(aDesc) {
      this.removeWebAppButton(aDesc);
    }, this);

    this.buttonContainer.parentNode.removeChild(this.buttonContainer);
  },

  // Called without a proper this
  configChanged: function() {
    webtabs.updateWebAppButtons();
  },

  updateWebAppButtons: function() {
    let before = this.buttonContainer.firstChild;

    // Loop through all webapps, for each either move it to the current position
    // or create it
    ConfigManager.webappList.forEach(function(aDesc) {
      if (before) {
        // Common case is the button will be the next in the list
        if (aDesc.id == before.id) {
          before = before.nextSibling;
          return;
        }

        let found = before.nextSibling;
        while (found && found.id != aDesc.id)
          found = found.nextSibling;
        if (found) {
          found.parentNode.insertBefore(found, before);
          return;
        }
      }

      // Webapp doesn't exist, create it
      this.createWebAppButton(aDesc);
    }, this);

    // Remove any remaining buttons
    while (before) {
      let next = before.nextSibling;
      this.removeWebAppButton(before.desc);
      before = next;
    }
  },

  newContentAreaClick: function(aEvent) {
    // If you click in a link to a website we have a shortcut for, we load it in a tab
    let href = hRefForClickEvent(aEvent);
    for (let [, tabDesc] in Iterator(ConfigManager.webappList)) {
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

  createWebAppButton: function(aDesc, aBefore) {
    let button = document.createElement("toolbarbutton");
    button.setAttribute("id", aDesc.id);
    button.setAttribute("class", "webtab");
    button.setAttribute("image", aDesc.icon);
    button.setAttribute("tooltiptext", aDesc.name);
    this.buttonContainer.insertBefore(button, aBefore);
    button.desc = aDesc;

    button.addEventListener("command", function() {
      try {
        webtabs.openTab(aDesc);
      }
      catch (e) {
        ERROR("Failed to open webapp", e);
      }
    }, false);
  },

  removeWebAppButton: function(aDesc) {
    let info = this.getTabInfoForWebApp(aDesc);
    if (info)
      document.getElementById('tabmail').closeTab(info, true);

    let button = document.getElementById(aDesc.id);
    if (button)
      button.parentNode.removeChild(button);
    else
      ERROR("Missing webapp button for " + aDesc.name);
  },

  getTabInfoForWebApp: function(aDesc) {
    if (!this.webappTabMap.has(aDesc))
      return null;

    let info = this.webappTabMap.get(aDesc);
    if (!info)
      return null;

    // Check that this tabinfo is still in the UI
    let node = info.browser;
    while (node && node != node.ownerDocument.documentElement)
      node = node.parentNode;

    if (node)
      return info;
    return null;
  },

  openTab: function(aDesc) {
    let tabmail = document.getElementById('tabmail');

    let info = this.getTabInfoForWebApp(aDesc);
    if (info) {
      tabmail.switchToTab(info);
      return;
    }

    let url = NetUtil.newURI(aDesc.href);
    let regex = new RegExp("^http[s]?://" + url.hostname + "/");

    info = tabmail.openTab("contentTab", {
      contentPage: aDesc.href,
      clickHandler: "return true;"
    });

    this.webappTabMap.set(aDesc, info);

    info.browser.addEventListener("click", function(aEvent) {
      specialTabs.siteClickHandler(aEvent, regex);
    }, false);

    let listener = {
      onStateChange: function(aWebProgress, aRequest, aState, aStatus) {
        if ((aState & Ci.nsIWebProgressListener.STATE_IS_REQUEST) &&
            (aState & Ci.nsIWebProgressListener.STATE_STOP)) {
          let icon = info.tabNode.getAttribute("image");
          if (!icon)
            return;

          info.browser.removeProgressListener(listener);

          aDesc.icon = icon;
          ConfigManager.persistPrefs();

          let button = document.getElementById(aDesc.id);
          button.setAttribute("image", aDesc.icon);
        }
      },

      onLocationChange: function() { },
      onProgressChange: function() { },
      onSecurityChange: function() { },
      onStatusChange: function() { },
      QueryInterface: XPCOMUtils.generateQI([Ci.nsIWebProgressListener,
                                             Ci.nsISupportsWeakReference])
    };

    info.browser.addProgressListener(listener);
  },
};

var OverlayListener = {
  load: function() {
    webtabs.onLoad();
  },

  unload: function() {
    webtabs.onUnload();
  }
};
