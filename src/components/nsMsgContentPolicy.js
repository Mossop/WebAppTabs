/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");
Components.utils.import("resource://webapptabs/modules/LogManager.jsm");
LogManager.createLogger(this, "nsMsgContentPolicy");
Components.utils.import("resource://webapptabs/modules/ConfigManager.jsm");

const Cc = Components.classes;
const Ci = Components.interfaces;
const Ce = Components.Exception;
const Cr = Components.results;

function nsMsgContentPolicy() {
  XPCOMUtils.defineLazyServiceGetter(this, "msgContentPolicy",
                                     "@mozilla.org/messenger/content-policy;1",
                                     Ci.nsIContentPolicy);
}

nsMsgContentPolicy.prototype = {
  shouldLoad: function(aContentType, aContentLocation, aRequestOrigin, aContext, aMimeTypeGuess, aExtra) {
    let result = this.msgContentPolicy.shouldLoad(aContentType, aContentLocation, aRequestOrigin, aContext, aMimeTypeGuess, aExtra);
    // Always allow loads that the default policy allows
    if (result == Ci.nsIContentPolicy.ACCEPT)
      return result;

    // We only care about changing the behaviour of javascript protocol loads
    if (!aContentLocation.schemeIs("javascript"))
      return result;

    try {
      // For javascript protocol loads attempt to find the top-level window for
      // the load
      let win = null;
      if (aContentType == Ci.nsIContentPolicy.TYPE_DOCUMENT)
        win = aContext.contentWindow;
      else if (aContentType == Ci.nsIContentPolicy.TYPE_SUBDOCUMENT)
        win = aContext.ownerDocument.defaultView.top;

      if (win) {
        let uri = win.document.documentURIObject;
        let desc = ConfigManager.getWebAppForURL(uri);
        if (desc) {
          // This is a load from a webapp, allow it
          LOG("Accepting javascript protocol load for " + uri.spec)
          return Ci.nsIContentPolicy.ACCEPT;
        }
      }

      LOG("Ignoring javascript protocol load for " + aRequestOrigin.spec);
    }
    catch (e) {
      ERROR("Failed checking javascript protocol load", e);
    }

    return result;
  },

  shouldProcess: function(aContentType, aContentLocation, aRequestOrigin, aContext, aMimeType, aExtra) {
    return this.msgContentPolicy.shouldProcess(aContentType, aContentLocation, aRequestOrigin, aContext, aMimeType, aExtra);
  },

  classID: Components.ID("{6d9bc3f8-16fb-413b-a925-2197d8b24ae8}"),
  QueryInterface: XPCOMUtils.generateQI([Components.interfaces.nsIContentPolicy])
};

var NSGetFactory = XPCOMUtils.generateNSGetFactory([nsMsgContentPolicy]);
