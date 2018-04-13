/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

const EXPORTED_SYMBOLS = ["ConfigManager"];

Components.utils.import("resource://gre/modules/Services.jsm");
Components.utils.import("resource://gre/modules/NetUtil.jsm");
Components.utils.import("resource://webapptabs/modules/LogManager.jsm");
LogManager.createLogger(this, "ConfigManager");

const Cc = Components.classes;
const Ci = Components.interfaces;
const Ce = Components.Exception;
const Cr = Components.results;

const EXTPREFNAME = "extensions.webapptabs.webapps";

const WEBAPP_SCHEMA = 1;
const DEFAULT_WEBAPPS = [{
  'name': 'Outlook',
  'href': 'https://outlook.live.com/',
  'icon': 'https://outlook.live.com/owa/favicon.ico',
}, {
  'name': 'Gmail',
  'href': 'https://mail.google.com/',
  'icon': 'https://www.google.com/gmail/about/images/favicon.ico',
}, {
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
  'href': 'https://twitter.com',
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
    let descURL = NetUtil.newURI(aDesc.href);

    function schemeMatches() {
      // Allow http and https to mean the same thing for now
      if (descURL.scheme == aURL.scheme)
        return true;
      if (descURL.scheme == "https" && aURL.scheme == "http")
        return true;
      if (descURL.scheme == "http" && aURL.scheme == "https")
        return true;
      return false;
    }

    function hostMatches() {
      // Trim off any leading "www." before comparing hostnames
      let descHost = descURL.hostPort;
      if (descHost.substring(0, 4) == "www.")
        descHost = descHost.substring(4);
      let urlHost = aURL.hostPort;
      if (urlHost.substring(0, 4) == "www.")
        urlHost = urlHost.substring(4);

      return urlHost == descHost;
    }

    if (!schemeMatches() || !hostMatches())
      return false;

    return aURL.path.substring(0, descURL.path.length) == descURL.path;
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
