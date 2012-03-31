/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

const Cc = Components.classes;
const Ci = Components.interfaces;
const Ce = Components.Exception;
const Cr = Components.results;

const OVERLAYS = {
  "chrome://messenger/content/messenger.xul": {
    documents: [
      "chrome://webapptabs/content/overlay.xul"
    ],
    scripts: [
      "chrome://webapptabs/content/webtab.js"
    ],
    styles: [
      "chrome://webapptabs/skin/overlay.css"
    ]
  }
};

var HttpObserver = {
  getWindowFromChannel: function(aChannel) {
    try {
      var notificationCallbacks = aChannel.notificationCallbacks ?
                                  aChannel.notificationCallbacks :
                                  aChannel.loadGroup.notificationCallbacks;

      if (!notificationCallbacks)
        return null;

      var domWin = notificationCallbacks.getInterface(Ci.nsIDOMWindow);
      if (domWin)
        return null;
      return domWin.top;
    }
    catch (e) {
      return null;
    }
  },

  observe: function (aSubject, aTopic, aData) {
    if (!(aSubject instanceof Ci.nsIHttpChannel))
      return;

    let desc = ConfigManager.getWebAppForURL(aSubject.URI);
    if (!desc) {
      let win = this.getWindowFromChannel(aSubject);
      if (win)
        desc = ConfigManager.getWebAppForURL(win.document.documentURIObject);
    }

    // If this isn't a load of a webapp tab then ignore it
    if (!desc)
      return;

    let ua = aSubject.getRequestHeader("User-Agent");
    ua = ua.replace("Thunderbird", "Firefox");
    aSubject.setRequestHeader("User-Agent", ua, false);
  }
};

function flushContentPolicy() {
  // Evil, but the content policy cache seems to be broken somehow
  let oldEntries = [];
  let cm = Cc["@mozilla.org/categorymanager;1"].
           getService(Ci.nsICategoryManager);
  let entries = cm.enumerateCategory("content-policy");
  while (entries.hasMoreElements()) {
    let entry = entries.getNext().QueryInterface(Ci.nsISupportsCString).data;
    let value = cm.getCategoryEntry("content-policy", entry);
    oldEntries.push([entry, value]);
  }

  cm.deleteCategory("content-policy");
  oldEntries.forEach(function([aEntry, aValue]) {
    cm.addCategoryEntry("content-policy", aEntry, aValue, false, true);
  });
}

function install(aParams, aReason) {
}

function startup(aParams, aReason) {
  // Register the resource://webapptabs/ mapping
  Components.utils.import("resource://gre/modules/Services.jsm");
  let res = Services.io.getProtocolHandler("resource").QueryInterface(Ci.nsIResProtocolHandler);
  res.setSubstitution("webapptabs", aParams.resourceURI);

  // Add our chrome registration
  Components.manager.addBootstrappedManifestLocation(aParams.installPath);

  // Load the overlay manager
  Components.utils.import("resource://webapptabs/modules/OverlayManager.jsm");

  // Replace the default Thunderbird content policy with our own forwarding policy
  OverlayManager.addComponent("{6d9bc3f8-16fb-413b-a925-2197d8b24ae8}",
                              "resource://webapptabs/components/nsMsgContentPolicy.js",
                              "@fractalbrew.com/webapptabs/msg-content-policy;1");
  OverlayManager.addCategory("content-policy", "@mozilla.org/messenger/content-policy;1",
                             "@fractalbrew.com/webapptabs/msg-content-policy;1");

  // Add a policy to handle redirecting webapp loads
  OverlayManager.addComponent("{bd71af62-1b21-4f3a-829e-5254ec7da7f6}",
                              "resource://webapptabs/components/nsContentPolicy.js",
                              "@fractalbrew.com/webapptabs/content-policy;1");
  OverlayManager.addCategory("content-policy", "webapptabs-content-policy",
                             "@fractalbrew.com/webapptabs/content-policy;1");

  // Allow javascript: protocol links to work
  OverlayManager.addPreference("network.protocol-handler.expose.javascript", true);

  OverlayManager.addOverlays(OVERLAYS);

  // Force changes to the content policy list to take effect
  flushContentPolicy();

  Components.utils.import("resource://webapptabs/modules/ConfigManager.jsm");
  Services.obs.addObserver(HttpObserver, "http-on-modify-request", false);
}

function shutdown(aParams, aReason) {
  // Don't need to clean anything up if the application is shutting down
  if (aReason == APP_SHUTDOWN)
    return;

  Services.obs.removeObserver(HttpObserver, "http-on-modify-request");

  // Close any of our UI windows
  let windows = Services.wm.getEnumerator(null);
  while (windows.hasMoreElements()) {
    let domWindow = windows.getNext().QueryInterface(Ci.nsIDOMWindow);
    let spec = domWindow.location.toString();
    if (spec.substring(0, 20) == "chrome://webapptabs/")
      domWindow.close();
  }

  // Unload and remove the overlay manager
  OverlayManager.unload();
  Components.utils.unload("resource://webapptabs/modules/OverlayManager.jsm");
  Components.utils.unload("resource://webapptabs/modules/ConfigManager.jsm");
  Components.utils.unload("resource://webapptabs/modules/LogManager.jsm");

  // Force changes to the content policy list to take effect
  flushContentPolicy();

  // Remove our chrome registration
  Components.manager.removeBootstrappedManifestLocation(aParams.installPath)

  // Clear our resource registration
  let res = Services.io.getProtocolHandler("resource").QueryInterface(Ci.nsIResProtocolHandler);
  res.setSubstitution("webapptabs", null);

  try {
    if (!Services.prefs.getBoolPref("extensions.webapptabs.debug"))
      return;

    // For testing invalidate the startup cache
    Services.obs.notifyObservers(null, "startupcache-invalidate", null);
  }
  catch (e) {
  }
}

function uninstall(aParams, aReason) {
}
