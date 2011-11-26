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

var Cc = Components.classes;
var Ci = Components.interfaces;
var Ce = Components.Exception;
var Cr = Components.results;

const webtabs = {
  // The UI element that contains the webapp buttons
  buttonContainer: null,
  // The back context menu item
  backButton: null,
  // The forward context menu item
  forwardButton: null,
  // The Thunderbird onBeforeLinkTraversal function
  oldOnBeforeLinkTraversal: null,
  // The Thunderbird browserDOMWindow
  oldBrowserDOMWindow: null,

  onLoad: function() {
    this.buttonContainer = document.getElementById("webapptabs-buttons");

    ConfigManager.webappList.forEach(function(aDesc) {
      this.createWebAppButton(aDesc);
    }, this);

    ConfigManager.addChangeListener(this.configChanged);

    let container = document.getElementById("tabpanelcontainer");
    container.addEventListener("click", this, true);

    document.getElementById("mailContext").addEventListener("popupshowing", this, false);

    this.backButton = document.getElementById("webapptabs-context-back")
    this.backButton.addEventListener("command", this, false);
    this.forwardButton = document.getElementById("webapptabs-context-forward")
    this.forwardButton.addEventListener("command", this, false);

    this.oldOnBeforeLinkTraversal = MsgStatusFeedback.onBeforeLinkTraversal;
    MsgStatusFeedback.onBeforeLinkTraversal = this.onBeforeLinkTraversal.bind(this);

    this.oldBrowserDOMWindow = window.browserDOMWindow;
    window.browserDOMWindow = this;
  },

  onUnload: function() {
    var browsers = document.querySelectorAll("browser.webapptab-browser");
    if (browsers.length > 0)
      WARN("Found unexpected browsers left in the document");

    for (let i = 0; i < browsers.length; i++)
    browsers[i].parentNode.removeChild(browsers[i]);

    window.browserDOMWidnow = this.oldBrowserDOMWindow;

    MsgStatusFeedback.onBeforeLinkTraversal = this.oldOnBeforeLinkTraversal;

    this.backButton.removeEventListener("command", this, false);
    this.forwardButton.removeEventListener("command", this, false);
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

      // Webapp doesn't exist, create it and put it in the right place
      let button = this.createWebAppButton(aDesc, before);
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
        webtabs.openWebApp(aDesc);
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

  getTabInfoForWebApp: function(aDesc) {
    let tabmail = document.getElementById('tabmail');

    let tabs = tabmail.tabInfo.filter(function(aTabInfo) {
      if (!("browser" in aTabInfo))
        return false;

      return ConfigManager.isURLForWebApp(aTabInfo.browser.currentURI, aDesc);
    }, this);

    if (tabs.length > 0)
      return tabs[0];

    return null;
  },

  openWebApp: function(aDesc, aURL) {
    let tabmail = document.getElementById('tabmail');

    let info = this.getTabInfoForWebApp(aDesc);
    if (info) {
      tabmail.switchToTab(info);
      if (aURL)
        info.browser.loadURI(aURL, null, null);
      return;
    }

    info = tabmail.openTab("contentTab", {
      contentPage: aURL ? aURL : aDesc.href,
      clickHandler: "return true;"
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
    let info = document.getElementById('tabmail').currentTabInfo;
    if (!info || !("browser" in info)) {
      this.backButton.hidden = true;
      this.forwardButton.hidden = true;
      return;
    }

    this.backButton.hidden = false;
    this.forwardButton.hidden = false;
    this.backButton.disabled = !info.browser.webNavigation.canGoBack;
    this.forwardButton.disabled = !info.browser.webNavigation.canGoForward;

    // If the context menu already detected the area as editable then bail out
    if (gContextMenu.onEditableArea)
      return;

    function initSpellchecking(aEditor) {
      gContextMenu.onTextInput = true;
      gContextMenu.onEditableArea = true;
      gSpellChecker.init(aEditor);
      gSpellChecker.initFromEvent(document.popupRangeParent, document.popupRangeOffset);
      gContextMenu.initSpellingItems();
    }

    let target = document.popupNode;

    // If the target is a text input with the spellcheck attribute then set it
    // up for spellchecking
    if (gContextMenu.onTextInput && target.getAttribute("spellcheck") == "true") {
      initSpellchecking(target.QueryInterface(Ci.nsIDOMNSEditableElement).editor);
      return;
    }

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

    initSpellchecking(editingSession.getEditorForWindow(win));
  },

  onContentClick: function(aEvent) {
    let info = document.getElementById('tabmail').currentTabInfo;
    if (!info)
      return;

    // Don't handle events that: a) aren't trusted, b) have already been
    // handled or c) aren't left-click.
    if (!aEvent.isTrusted || aEvent.getPreventDefault() || aEvent.button)
      return;

    // If this is a click in a webapp then ignore it, onBeforeLinkTraversal and
    // the content policy will handle it
    if (("browser" in info) && ConfigManager.getWebAppForURL(info.browser.currentURI)) {
      // If the load is for the same webapp that the tab is already displaying
      // then just allow the event to proceed as normal.
      return;
    }

    let href = hRefForClickEvent(aEvent, true);
    if (!href)
      return;

    // If this URL isn't for a webapp then continue as normal
    let newDesc = ConfigManager.getWebAppForURL(NetUtil.newURI(href));
    if (!newDesc)
      return;

    LOG("Clicked on URL in content: " + href);

    // Open this link as a webapp
    aEvent.preventDefault();
    aEvent.stopPropagation();
    this.openWebApp(newDesc, href);
  },

  onBackClick: function(aEvent) {
    let info = document.getElementById('tabmail').currentTabInfo;
    if (!info || !("browser" in info))
      return;

    info.browser.goBack();
  },

  onForwardClick: function(aEvent) {
    let info = document.getElementById('tabmail').currentTabInfo;
    if (!info || !("browser" in info))
      return;

    info.browser.goForward();
  },

  // nsIXULBrowserWindow bits
  onBeforeLinkTraversal: function(aOriginalTarget, aLinkURI, aLinkNode, aIsAppTab) {
    let newTarget = this.oldOnBeforeLinkTraversal.call(MsgStatusFeedback, aOriginalTarget, aLinkURI, aLinkNode, aIsAppTab);

    function logResult(aTarget, aReason) {
      LOG("onBeforeLinkTraversal " + aLinkURI.spec + " targetted at " +
          "'" + newTarget + "': new target '" + aTarget + "' - " + aReason);
    }

    let originalWin = aLinkNode.ownerDocument.defaultView;
    let targetWin = originalWin;
    let docShell = originalWin.QueryInterface(Ci.nsIInterfaceRequestor)
                              .getInterface(Ci.nsIWebNavigation)
                              .QueryInterface(Ci.nsIDocShellTreeItem);

    let targetDocShell = docShell.findItemWithName(newTarget, docShell, docShell);
    if (targetDocShell) {
      targetWin = docShell.QueryInterface(Ci.nsIInterfaceRequestor)
                          .getInterface(Ci.nsIDOMWindow);
    }

    // If this is attempting to load an inner frame then just continue
    if (targetWin.top != targetWin) {
      logResult(newTarget, "Inner frame load");
      return newTarget;
    }

    originDesc = ConfigManager.getWebAppForURL(targetWin.document.documentURIObject);
    // If the target window isn't a webapp then allow the load as normal
    if (!originDesc) {
      logResult(newTarget, "Non-webapp origin");
      return newTarget;
    }

    let targetDesc = ConfigManager.getWebAppForURL(aLinkURI);

    // If this is a load of the same webapp then allow it to continue
    if (originDesc == targetDesc) {
      if (!targetDocShell) {
        logResult("_top", "Same-webapp load to an unknown docshell");
        return "_top";
      }
      logResult(newTarget, "Same-webapp load");
      return newTarget;
    }

    // If this isn't the load of a webapp then, the content policy will redirect
    // the load.
    if (!targetDesc) {
      logResult(newTarget, "Non-webapp load");
      return newTarget;
    }

    logResult("_top", "Different webapp load, retargetted");
    this.openWebApp(targetDesc, aLinkURI.spec);

    // Make sure the content policy will abort this by not opening a new tab
    // and doing a full document load
    return "_top";
  },

  // nsIBrowserDOMWindow implementation
  openURI: function(aURI, aOpener, aWhere, aContext) {
    function logResult(aReason) {
      LOG("openURI from " + (aOpener ? aOpener.location.toString() : null) +
          " - " + aReason);
    }

    // We don't know what the target URL is at this point. If the opener is a
    // webapp then open the link in a new browser, wait for it to be taken over
    // by the content policy
    let desc = ConfigManager.getWebAppForURL(aOpener.document.documentURIObject);
    if (desc) {
      let browser = document.createElementNS("http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul",
                                             "browser");
      browser.setAttribute("type", "content");
      browser.setAttribute("style", "width: 0px; height: 0px");
      browser.setAttribute("class", "webapptab-browser");
      document.documentElement.appendChild(browser);

      logResult("Opener is a webapp, redirecting to hidden browser");
      return browser.contentWindow;
    }

    logResult("Opener is not a webapp, continuing as normal");
    return this.oldBrowserDOMWindow.openURI(aURI, aOpener, aWhere, aContext);
  },

  isTabContentWindow: function(aWindow) {
    return this.oldBrowserDOMWindow.isTabContentWindow(aWindow);
  },

  // nsIEventHandler implementation
  handleEvent: function(aEvent) {
    try {
      switch (aEvent.type) {
      case "popupshowing":
        this.onPopupShowing(aEvent);
        break;
      case "click":
        this.onContentClick(aEvent);
        break;
      case "command":
        if (aEvent.target == this.backButton)
          this.onBackClick(aEvent);
        else
          this.onForwardClick(aEvent);
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
