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

const EXPORTED_SYMBOLS = ["ConfigManager"];

Components.utils.import("resource://gre/modules/Services.jsm");
Components.utils.import("resource://webapptabs/modules/LogManager.jsm");
LogManager.createLogger(this, "ConfigManager");

const Cc = Components.classes;
const Ci = Components.interfaces;
const Ce = Components.Exception;
const Cr = Components.results;

const EXTPREFNAME = "extensions.webapptabs.webapps";

const WEBAPP_SCHEMA = 1;
const DEFAULT_WEBAPPS = [{
  'name': 'Google Calendar',
  'href': 'https://calendar.google.com/',
  'icon': 'https://calendar.google.com/googlecalendar/images/favicon.ico',
}, {
  'name': 'Facebook',
  'href': 'https://www.facebook.com/',
  'icon': 'https://www.facebook.com/favicon.ico',
}, {
  'name': 'Google+',
  'href': 'https://plus.google.com/',
  'icon': 'https://ssl.gstatic.com/s2/oz/images/favicon.ico',
}, {
  'name': 'Twitter',
  'href': 'https://www.twitter.com',
  'icon': 'https://www.twitter.com/favicon.ico',
}];

const ConfigManager = {
  webappList: null,
  changeListeners: [],

  addChangeListener: function(aListener) {
    this.changeListeners.push(aListener);
  },

  removeChangeListener: function(aListener) {
    let pos = this.changeListeners.indexOf(aListener);
    this.changeListeners.splice(pos, 1);
  },

  isURLForWebApp: function(aURL, aDesc) {
    return aURL.substring(0, aDesc.href.length) == aDesc.href;
  },

  getWebAppForURL: function(aURL) {
    let descs = this.webappList.filter(this.isURLForWebApp.bind(this, aURL));
    if (descs.length > 0)
      return descs[0];
    return null;
  },

  updatePrefs: function() {
    this.webappList.forEach(function(aDesc) {
      if (!aDesc.id)
        aDesc.id = aDesc.name.replace(' ', '_', 'g');
    });

    this.changeListeners.forEach(function(aListener) {
      try {
        aListener();
      }
      catch (e) {
        ERROR("Exception calling config change listener", e);
      }
    }, this);
  },

  persistPrefs: function() {
    let jsondata = JSON.stringify({
      schema: WEBAPP_SCHEMA,
      webapps: this.webappList,
    })
    Services.prefs.setCharPref(EXTPREFNAME, jsondata);
    Services.prefs.savePrefFile(null);
  },

  loadPrefs: function() {
    try {
      let data = JSON.parse(Services.prefs.getCharPref(EXTPREFNAME));
      let schema = 0;
      if ("schema" in data)
        schema = data.schema;

      switch (schema) {
      case WEBAPP_SCHEMA:
        this.webappList = data.webapps;
        break;
      default:
        throw new Ce("Unknown webapps data schema " + schema);
      }

      return;
    }
    catch (e) {
      ERROR("Failed to read webapps from config", e);
    }

    this.webappList = DEFAULT_WEBAPPS;
    this.webappList.forEach(function(aDesc) {
      if (!aDesc.id)
        aDesc.id = aDesc.name.replace(' ', '_', 'g');
    });
    this.persistPrefs();
  }
};

ConfigManager.loadPrefs();
