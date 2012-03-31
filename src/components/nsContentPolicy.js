/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");
Components.utils.import("resource://webapptabs/modules/LogManager.jsm");
LogManager.createLogger(this, "nsContentPolicy");
Components.utils.import("resource://webapptabs/modules/ConfigManager.jsm");
Components.utils.import("resource://webapptabs/modules/OverlayManager.jsm");

const Cc = Components.classes;
const Ci = Components.interfaces;
const Ce = Components.Exception;
const Cr = Components.results;

function nsContentPolicy() {
}

nsContentPolicy.prototype = {
  shouldLoad: function(aContentType, aContentLocation, aRequestOrigin, aContext, aMimeTypeGuess, aExtra) {
    // We only care about full document loads
    if (aContentType != Ci.nsIContentPolicy.TYPE_DOCUMENT)
      return Ci.nsIContentPolicy.ACCEPT;

    // Allow all non-web protocols to load
    let scheme = aContentLocation.scheme;
    if (scheme != "http" && scheme != "https" && scheme != "ftp")
      return Ci.nsIContentPolicy.ACCEPT;

    // If this isn't a load from a node/window then allow it to continue
    if (!aRequestOrigin)
      return Ci.nsIContentPolicy.ACCEPT;

    function logResult(aResult, aReason) {
      LOG("Load of " + aContentLocation.spec + " by " + aRequestOrigin.spec +
          ": " + aResult + " - " + aReason);
    }

    let originDesc = ConfigManager.getWebAppForURL(aRequestOrigin);
    let desc = ConfigManager.getWebAppForURL(aContentLocation);

    if (aContext instanceof Ci.nsIDOMNode && aContext.localName == "browser" &&
        aContext.className == "webapptab-browser") {
      // This is definitely from a webapp and we must load it somewhere
      aContext.parentNode.removeChild(aContext);

      // If this is for a webapp then load it in a tab
      if (desc) {
        let messengerWin = aContext.ownerDocument.defaultView;
        let webtab = OverlayManager.getScriptContext(messengerWin, "chrome://webapptabs/content/webtab.js");
        webtab.webtabs.openWebApp(desc, aContentLocation.spec);

        logResult("REJECT", "Webapp load redirected to a tab");
        return Ci.nsIContentPolicy.REJECT_SERVER;
      }
    }
    else {
      // If this isn't a load from a webapp then allow it to continue
      if (!originDesc) {
        logResult("ACCEPT", "Non-webapp load");
        return Ci.nsIContentPolicy.ACCEPT;
      }

      // If it's the same webapp then allow the load
      if (desc == originDesc) {
        logResult("ACCEPT", "Same webapp load");
        return Ci.nsIContentPolicy.ACCEPT;
      }

      // If it's for another webapp then onBeforeLinkTraversal will have loaded
      // the page so just block this load
      if (desc) {
        logResult("REJECT", "Different webapp load");
        return Ci.nsIContentPolicy.REJECT_SERVER;
      }
    }

    // Otherwise load it externally
    Cc["@mozilla.org/uriloader/external-protocol-service;1"].
    getService(Components.interfaces.nsIExternalProtocolService).
    loadUrl(aContentLocation);

    logResult("REJECT", "Loaded externally");
    return Ci.nsIContentPolicy.REJECT_SERVER;
  },

  shouldProcess: function(aContentType, aContentLocation, aRequestOrigin, aContext, aMimeType, aExtra) {
    return Ci.nsIContentPolicy.ACCEPT;
  },

  classID: Components.ID("{bd71af62-1b21-4f3a-829e-5254ec7da7f6}"),
  QueryInterface: XPCOMUtils.generateQI([Components.interfaces.nsIContentPolicy])
};

var NSGetFactory = XPCOMUtils.generateNSGetFactory([nsContentPolicy]);
