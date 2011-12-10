/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/
 */

Components.utils.import("resource://gre/modules/AddonManager.jsm");

function getAddon(aCallback) {
  waitForExplicitFinish();
  AddonManager.getAddonByID("webapptabs@fractalbrew.com", function(aAddon) {
    safeCall(aCallback.bind(null, aAddon));
    finish();
  });
}

function enableAddon(aCallback) {
  getAddon(function(aAddon) {
    aAddon.userDisabled = false;
    executeSoon(aCallback);
  });
}

function disableAddon(aCallback) {
  getAddon(function(aAddon) {
    aAddon.userDisabled = true;
    executeSoon(aCallback);
  });
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
    if ("onTabOpened" in this.callbacks)
      waitForTabLoad(aTab, this.callbacks.onTabOpened);
    else
      unexpected("Wasn't expecting a new tab to open: " + aTab.browser.currentURI.spec);
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
      safeCall(aCallback.bind(null, aTab));
      finish();
    }
  });
}

function waitForTabLoad(aTab, aCallback) {
  waitForExplicitFinish();
  aTab.browser.addEventListener("load", function() {
    aTab.browser.removeEventListener("load", arguments.callee, true);
    waitForFocus(aTab.browser.contentWindow, aCallback.bind(null, aTab));
    finish();
  }, true);
}

function closeTab(aTab, aCallback) {
  document.getElementById("tabmail").closeTab(aTab);
  if (aCallback)
    safeCall(aCallback);
}

function waitForEvent(aElement, aEvent, aCallback, aCapture) {
  waitForExplicitFinish();
  aElement.addEventListener(aEvent, function(aEv) {
    aElement.removeEventListener(aEvent, arguments.callee, aCapture);
    safeCall(aCallback.bind(null, aEv));
    finish();
  }, aCapture);
}
