/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/
 */

Components.utils.import("resource://gre/modules/AddonManager.jsm");

function getAddon(aCallback) {
  waitForExplicitFinish();
  AddonManager.getAddonByID("webapptabs@fractalbrew.com", function(aAddon) {
    try {
      aCallback(aAddon);
    }
    catch (e) {
      unexpected("getAddon callback threw an exception", e);
    }
    finish();
  });
}

function enableAddon(aCallback) {
  getAddon(function(aAddon) {
    aAddon.userDisabled = false;
    aCallback();
  });
}

function clickElement(aTarget) {
  var utils = aTarget.ownerDocument.defaultView
                     .QueryInterface(Ci.nsIInterfaceRequestor)
                     .getInterface(Components.interfaces.nsIDOMWindowUtils);

  var rect = aTarget.getBoundingClientRect();

  var left = rect.left + rect.width / 2;
  var top = rect.top + rect.height / 2;
  utils.sendMouseEvent("mousedown", left, top, 0, 1, 0);
  utils.sendMouseEvent("mouseup", left, top, 0, 1, 0);
}

function TabListener(aCallbacks) {
  this.callbacks = aCallbacks || {};
  document.getElementById("tabmail").registerTabMonitor(this);
}

TabListener.prototype = {
  monitorName: "TestTabListener",
  callbacks: null,

  destroy: function() {
    document.getElementById("tabmail").unregisterTabMonitor(this);
  },

  onTabTitleChanged: function(aTab) {
  },

  onTabSwitched: function(aTab, aOldTab) {
  },

  onTabOpened: function(aTab, aIsFirstTab, aWasCurrentTab) {
    let self = this;
    aTab.browser.addEventListener("load", function() {
      if ("onTabOpened" in self.callbacks)
        self.callbacks.onTabOpened(aTab, aIsFirstTab, aWasCurrentTab);
      else
        unexpected("Wasn't expecting a new tab to open: " + aTab.browser.currentURI.spec);
    }, true);
  },

  onTabClosing: function(aTab) {
    unexpected("Wasn't expecting a tab to close");
  },

  onTabPersist: function(aTab) {
    return null;
  },

  onTabRestored: function(aTab, aState, aIsFirstTab) {
    this.onTabOpened(aTab, aIsFirstTab, false);
  }
}

function waitForNewTab(aCallback) {
  waitForExplicitFinish();

  let listener = new TabListener({
    onTabOpened: function(aTab) {
      listener.destroy();
      aCallback(aTab);
      finish();
    }
  });
}

function closeTab(aTab, aCallback) {
  document.getElementById("tabmail").closeTab(aTab);
  aCallback();
}
