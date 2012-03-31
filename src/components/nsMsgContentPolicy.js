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
 * The Original Code is WebApp Tabs.
 *
 * The Initial Developer of the Original Code is
 * Dave Townsend <dtownsend@oxymoronical.com>
 * Portions created by the Initial Developer are Copyright (C) 2011
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
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
