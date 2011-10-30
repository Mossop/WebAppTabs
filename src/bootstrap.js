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

const Cc = Components.classes;
const Ci = Components.interfaces;
const Ce = Components.Exception;
const Cr = Components.results;

const OVERLAYS = {
  "chrome://messenger/content/messenger.xul": {
    scripts: [
      "chrome://webapptabs/content/webtab.js"
    ],
    styles: [
      "chrome://webapptabs/skin/overlay.css"
    ]
  }
};

function install(aParams, aReason) {
}

function startup(aParams, aReason) {
  // Register the resource://webapptaps/ mapping
  Components.utils.import("resource://gre/modules/Services.jsm");
  let res = Services.io.getProtocolHandler("resource").QueryInterface(Ci.nsIResProtocolHandler);
  res.setSubstitution("webapptabs", aParams.resourceURI);

  // Add our chrome registration
  Components.manager.addBootstrappedManifestLocation(aParams.installPath);

  // Load the overlay manager
  Components.utils.import("resource://webapptabs/modules/OverlayManager.jsm");
  OverlayManager.addOverlays(OVERLAYS);
}

function shutdown(aParams, aReason) {
  // Don't need to clean anything up if the application is shutting down
  if (aReason == APP_SHUTDOWN)
    return;

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

  // Remove our chrome registration
  Components.manager.removeBootstrappedManifestLocation(aParams.installPath)

  // Clear our resource registration
  let res = Services.io.getProtocolHandler("resource").QueryInterface(Ci.nsIResProtocolHandler);
  res.setSubstitution("webapptabs", null);

  // For testing invalidate the startup cache
  Services.obs.notifyObservers(null, "startupcache-invalidate", null);
}

function uninstall(aParams, aReason) {
}
