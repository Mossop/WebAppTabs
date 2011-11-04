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
  // The UI element that contains the webapp buttons
  buttonContainer: null,

  onLoad: function() {
    this.buttonContainer = document.getElementById("webapptabs-buttons");

    ConfigManager.webappList.forEach(function(aDesc) {
      this.createWebAppButton(aDesc);
    }, this);

    ConfigManager.addChangeListener(this.configChanged);

    let container = document.getElementById("tabpanelcontainer");
    container.addEventListener("click", this, true);

    document.getElementById("mailContext").addEventListener("popupshowing", this, false);
  },

  onUnload: function() {
    document.getElementById("mailContext").removeEventListener("popupshowing", this, false);

    let container = document.getElementById("tabpanelcontainer");
    container.removeEventListener("click", this, true);

    ConfigManager.removeChangeListener(this.configChanged);

    ConfigManager.webappList.forEach(function(aDesc) {
      this.removeWebAppButton(aDesc);
    }, this);
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
    let button = document.getElementById(aDesc.id);
    if (button)
      button.parentNode.removeChild(button);
    else
      ERROR("Missing webapp button for " + aDesc.name);
  },

  isURLForWebApp: function(aURL, aDesc) {
    return aURL.substring(0, aDesc.href.length) == aDesc.href;
  },

  getWebAppForURL: function(aURL) {
    let descs = ConfigManager.webappList.filter(this.isURLForWebApp.bind(this, aURL));
    if (descs.length > 0)
      return descs[0];
    return null;
  },

  getTabInfoForWebApp: function(aDesc) {
    let tabmail = document.getElementById('tabmail');

    let tabs = tabmail.tabInfo.filter(function(aTabInfo) {
      if (!("browser" in aTabInfo))
        return false;

      return this.isURLForWebApp(aTabInfo.browser.currentURI.spec, aDesc);
    }, this);

    if (tabs.length > 0)
      return tabs[0];

    return null;
  },

  openTab: function(aDesc, aURL) {
    let tabmail = document.getElementById('tabmail');

    let info = this.getTabInfoForWebApp(aDesc);
    if (info) {
      tabmail.switchToTab(info);
      return;
    }

    info = tabmail.openTab("contentTab", {
      contentPage: aURL ? aURL : aDesc.href
    });

    // Only get new favicons when loading the normal webapp url
    if (aURL)
      return;

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

  onPopupShowing: function(aEvent) {
    let target = document.popupNode;

    // If the context menu already detected the area as editable then bail out
    if (gContextMenu.onEditableArea)
      return;

    let win = target.ownerDocument.defaultView;
    if (!win)
      return;

    try {
      var editingSession = win.QueryInterface(Ci.nsIInterfaceRequestor)
                              .getInterface(Ci.nsIWebNavigation)
                              .QueryInterface(Ci.nsIInterfaceRequestor)
                              .getInterface(Ci.nsIEditingSession);
      if (!editingSession.windowIsEditable(win))
        return;
      if (win.getComputedStyle(target, "").getPropertyValue("-moz-user-modify") != "read-write")
        return;
    }
    catch(ex) {
      // If someone built with composer disabled, we can't get an editing session.
      return;
    }

    gContextMenu.onTextInput = true;
    gContextMenu.onEditableArea = true;
    gSpellChecker.init(editingSession.getEditorForWindow(win));
    gSpellChecker.initFromEvent(document.popupRangeParent, document.popupRangeOffset);
    gContextMenu.initSpellingItems();
  },

  onContentClick: function(aEvent) {
    let info = document.getElementById('tabmail').currentTabInfo;
    if (!info)
      return;

    // Don't handle events that: a) aren't trusted, b) have already been
    // handled or c) aren't left-click.
    if (!aEvent.isTrusted || aEvent.getPreventDefault() || aEvent.button)
      return;

    let href = hRefForClickEvent(aEvent, true);
    if (!href)
      return;

    LOG("Saw url " + href);

    // If this URL matches a webapp then switch to or open that
    let newDesc = this.getWebAppForURL(href);
    if (newDesc) {
      aEvent.preventDefault();
      aEvent.stopPropagation();

      let newInfo = this.getTabInfoForWebApp(newDesc);
      if (newInfo) {
        let tabmail = document.getElementById('tabmail');
        tabmail.switchToTab(newInfo);
        newInfo.browser.loadURI(href, null, null);
      }
      else {
        this.openTab(newDesc, href);
      }
      return;
    }

    let protocolSvc = Cc["@mozilla.org/uriloader/external-protocol-service;1"].
                      getService(Ci.nsIExternalProtocolService);

    let uri = makeURI(href);
    if (!protocolSvc.isExposedProtocol(uri.scheme) ||
        uri.schemeIs("http") || uri.schemeIs("https") ||
        uri.schemeIs("about")) {
      aEvent.preventDefault();
      aEvent.stopPropagation();
      openLinkExternally(href);
    }
  },

  handleEvent: function(aEvent) {
    try {
      switch (aEvent.type) {
      case "popupshowing":
        this.onPopupShowing(aEvent);
        break;
      case "click":
        this.onContentClick(aEvent);
        break;
      }
    }
    catch (e) {
      ERROR("Exception during " + aEvent.type + " event", e);
    }
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
