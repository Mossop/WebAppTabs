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

// This serves as a proxy between the content policy service and the normal
// nsMsgContentPolicy that allows javascript protocol links for webapp tabs

Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");
Components.utils.import("resource://webapptabs/modules/LogManager.jsm");
LogManager.createLogger(this, "nsMsgContentPolicy");
Components.utils.import("resource://webapptabs/modules/ConfigManager.jsm");

const Cc = Components.classes;
const Ci = Components.interfaces;
const Ce = Components.Exception;
const Cr = Components.results;

function nsMsgContentPolicy() {
  this.msgContentPolicy = Components.classesByID["{DBFCFDF0-4489-4faa-8122-190FD1EFA16C}"].
                          getService(Ci.nsIContentPolicy);
}

nsMsgContentPolicy.prototype = {
  shouldLoad: function(aContentType, aContentLocation, aRequestOrigin, aContext, aMimeTypeGuess, aExtra) {
    let originalResult = this.msgContentPolicy.shouldLoad(aContentType, aContentLocation, aRequestOrigin, aContext, aMimeTypeGuess, aExtra);
    // If the default content policy says to accept the load then accept it
    if (originalResult == Ci.nsIContentPolicy.ACCEPT)
      return originalResult;

    // Otherwise we want to accept if the page loading is in a webapp tab and
    // the protocol is javascript
    if (!aContentLocation.schemeIs("javascript"))
      return originalResult;

    // Find the outermost window through the node that triggered the load
    if (!(aContext instanceof Ci.nsIDOMNode))
      return originalResult;

    let win = aContext.ownerDocument.defaultView.top;

    // If the window isn't for a webapp then return the default policy's result
    let desc = ConfigManager.getWebAppForURL(win.document.documentURIObject);
    if (!desc)
      return originalResult;

    return Ci.nsIContentPolicy.ACCEPT;
  },

  shouldProcess: function(aContentType, aContentLocation, aRequestOrigin, aContext, aMimeType, aExtra) {
    return this.msgContentPolicy.shouldProcess(aContentType, aContentLocation, aRequestOrigin, aContext, aMimeType, aExtra);
  },

  classID: Components.ID("{4aef66b9-3afb-464c-ae14-7718481cbb72}"),
  QueryInterface: XPCOMUtils.generateQI([Components.interfaces.nsIContentPolicy])
};

var NSGetFactory = XPCOMUtils.generateNSGetFactory([nsMsgContentPolicy]);
