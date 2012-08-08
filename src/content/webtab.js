/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

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
    this.backButton.addEventListener("command", this.onBackClick.bind(this), false);
    this.forwardButton = document.getElementById("webapptabs-context-forward")
    this.forwardButton.addEventListener("command", this.onForwardClick.bind(this), false);

    this.oldOnBeforeLinkTraversal = MsgStatusFeedback.onBeforeLinkTraversal;
    MsgStatusFeedback.onBeforeLinkTraversal = this.onBeforeLinkTraversal.bind(this);

    this.oldBrowserDOMWindow = window.browserDOMWindow;
    window.browserDOMWindow = this;

    // Initialise all tabs that are webapps
    let tabmail = document.getElementById("tabmail");
    tabmail.tabInfo.forEach(this.onTabOpened.bind(this));

    tabmail.registerTabMonitor(this);
  },

  onUnload: function() {
    let tabmail = document.getElementById("tabmail");
    tabmail.unregisterTabMonitor(this);

    tabmail.tabInfo.forEach(this.onTabClosing.bind(this));

    var browsers = document.querySelectorAll("browser.webapptab-browser");
    if (browsers.length > 0)
      WARN("Found unexpected browsers left in the document");

    for (let i = 0; i < browsers.length; i++)
      browsers[i].parentNode.removeChild(browsers[i]);

    window.browserDOMWindow = this.oldBrowserDOMWindow;

    MsgStatusFeedback.onBeforeLinkTraversal = this.oldOnBeforeLinkTraversal;

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

  initWebAppTab: function(aTabInfo) {
    aTabInfo.browser.setAttribute("tooltip", "aHTMLTooltip");
  },

  destroyWebAppTab: function(aTabInfo) {
    aTabInfo.browser.removeAttribute("tooltip");
  },

  updateWebAppButtons: function() {
    while (this.buttonContainer.lastChild)
      this.buttonContainer.removeChild(this.buttonContainer.lastChild);

    ConfigManager.webappList.forEach(function(aDesc) {
      this.createWebAppButton(aDesc, null);
    }, this);
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

    let originDesc = ConfigManager.getWebAppForURL(targetWin.document.documentURIObject);
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
      LOG("openURI from " + (aOpener ? aOpener.top.document.documentURIObject.spec : null) +
          " - " + aReason);
    }

    // We don't know what the target URL is at this point. If the opener is a
    // webapp then open the link in a new browser, wait for it to be taken over
    // by the content policy
    let desc = ConfigManager.getWebAppForURL(aOpener.top.document.documentURIObject);
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
      }
    }
    catch (e) {
      ERROR("Exception during " + aEvent.type + " event", e);
    }
  },

  // Tab monitor implementation
  monitorName: "WebAppTabListener",

  onTabTitleChanged: function(aTabInfo) {
  },

  onTabSwitched: function(aTabInfo, aOldTabInfo) {
  },

  onTabOpened: function(aTabInfo, aIsFirstTab, aWasCurrentTab) {
    if (!aTabInfo.browser)
      return;

    // In some versions of Thunderbird we end up with a browser that has history
    // disabled, this code forcibly enables it
    if (aTabInfo.browser.hasAttribute("disablehistory")) {
      Services.obs.addObserver(aTabInfo.browser, "browser:purge-session-history", false);
      // wire up session history
      aTabInfo.browser.webNavigation.sessionHistory = Cc["@mozilla.org/browser/shistory;1"].
                                                      createInstance(Ci.nsISHistory);
      // enable global history
      if (aTabInfo.browser.docShell)
        aTabInfo.browser.docShell.QueryInterface(Ci.nsIDocShellHistory).useGlobalHistory = true;
      aTabInfo.browser.removeAttribute("disablehistory");
    }

    if (aTabInfo.pageLoading) {
      let listener = {
        onLocationChange: function(aWebProgress, aRequest, aLocation) {
          let webapp = ConfigManager.getWebAppForURL(aLocation);

          // Ignore tabs that aren't webapps
          if (!webapp) {
            aTabInfo.browser.removeProgressListener(this);
            return;
          }

          webtabs.initWebAppTab(aTabInfo);
        },

        onStateChange: function(aWebProgress, aRequest, aState, aStatus) {
          if (!(aState & Ci.nsIWebProgressListener.STATE_STOP))
            return;

          if (aState & Ci.nsIWebProgressListener.STATE_IS_NETWORK)
            aTabInfo.browser.removeProgressListener(listener);

          if (aState & Ci.nsIWebProgressListener.STATE_IS_REQUEST) {
            let icon = aTabInfo.tabNode.getAttribute("image");
            if (!icon)
              return;

            let webapp = ConfigManager.getWebAppForURL(aTabInfo.browser.contentDocument.documentURIObject);
            if (!webapp)
              return;

            webapp.icon = icon;
            ConfigManager.persistPrefs();

            let button = document.getElementById(webapp.id);
            button.setAttribute("image", webapp.icon);
          }
        },

        onProgressChange: function() { },
        onSecurityChange: function() { },
        onStatusChange: function() { },
        QueryInterface: XPCOMUtils.generateQI([Ci.nsIWebProgressListener,
                                               Ci.nsISupportsWeakReference])
      };

      aTabInfo.browser.addProgressListener(listener);
    }
    else {
      if (!ConfigManager.getWebAppForURL(aTabInfo.browser.contentDocument.documentURIObject))
        return;

      this.initWebAppTab(aTabInfo);
    }
  },

  onTabClosing: function(aTabInfo) {
    if (!aTabInfo.browser)
      return;

    if (!ConfigManager.getWebAppForURL(aTabInfo.browser.contentDocument.documentURIObject))
      return;

    this.destroyWebAppTab(aTabInfo);
  },

  onTabPersist: function(aTabInfo) {
    return null;
  },

  onTabRestored: function(aTabInfo, aState, aIsFirstTab) {
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
