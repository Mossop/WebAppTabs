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
