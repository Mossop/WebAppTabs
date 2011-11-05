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
Components.utils.import("resource://webapptabs/modules/LogManager.jsm");
LogManager.createLogger(this, "nsContentPolicy");
Components.utils.import("resource://webapptabs/modules/ConfigManager.jsm");

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

    // If it wasn't a webapp loading this then allow it
    if (!aRequestOrigin)
      return Ci.nsIContentPolicy.ACCEPT;

    let originDesc = ConfigManager.getWebAppForURL(aRequestOrigin.spec);
    if (!originDesc)
      return Ci.nsIContentPolicy.ACCEPT;

    LOG("Attempt to load document " + aContentLocation.spec);
    // If it's the same webapp then allow the load
    let desc = ConfigManager.getWebAppForURL(aContentLocation.spec);
    if (desc == originDesc)
      return Ci.nsIContentPolicy.ACCEPT;

    // If it's for another webapp then onBeforeLinkTraversal will have loaded
    // the page so just block this load
    if (desc)
      return Ci.nsIContentPolicy.REJECT_SERVER;

    // Otherwise load it externally
    Cc["@mozilla.org/uriloader/external-protocol-service;1"].
    getService(Components.interfaces.nsIExternalProtocolService).
    loadUrl(aContentLocation);

    return Ci.nsIContentPolicy.REJECT_SERVER;
  },

  shouldProcess: function(aContentType, aContentLocation, aRequestOrigin, aContext, aMimeType, aExtra) {
    return Ci.nsIContentPolicy.ACCEPT;
  },

  classID: Components.ID("{bd71af62-1b21-4f3a-829e-5254ec7da7f6}"),
  QueryInterface: XPCOMUtils.generateQI([Components.interfaces.nsIContentPolicy])
};

var NSGetFactory = XPCOMUtils.generateNSGetFactory([nsContentPolicy]);
