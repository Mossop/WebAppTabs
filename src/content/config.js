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
 * The Initial Developer of the Original Code is WebApp Tabs.
 * Dave Townsend <dtownsend@oxymoronical.com>
 * Portions created by the Initial Developer are Copyright (C) 2011
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   David Ascher.
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

Components.utils.import("resource://webapptabs/modules/LogManager.jsm");
LogManager.createLogger(this, "config");
Components.utils.import("resource://webapptabs/modules/ConfigManager.jsm");

const Cc = Components.classes;
const Ci = Components.interfaces;
const Ce = Components.Exception;

const EXTPREFNAME = "extension.webapptabs.webapps";

const config = {
  list: null,

  load: function() {
    this.list = document.getElementById("list_webapps");

    ConfigManager.webappList.forEach(function(aDesc) {
      this.addWebAppItem(aDesc);
    }, this);

    this.input();
    this.select();
  },

  add: function() {
    let href = document.getElementById("txt_href").value;
    let URIFixup = Cc["@mozilla.org/docshell/urifixup;1"].
                   getService(Ci.nsIURIFixup);
    href = URIFixup.createFixupURI(href, Ci.nsIURIFixup.FIXUP_FLAG_NONE).spec;

    let desc = {
      name: document.getElementById("txt_name").value,
      href: href,
      icon: "http://getfavicon.appspot.com/" + href
    };

    document.getElementById("txt_name").value = "";
    document.getElementById("txt_href").value = "";

    this.addWebAppItem(desc);
    ConfigManager.webappList.push(desc);
    ConfigManager.persistPrefs();
  },

  remove: function() {
    let item = this.list.selectedItem;
    let pos = ConfigManager.webappList.indexOf(item.desc);
    ConfigManager.webappList.splice(pos, 1);
    this.list.removeChild(item);
    ConfigManager.persistPrefs();
  },

  input: function() {
    let enabled = document.getElementById("txt_name").value != "" &&
                  document.getElementById("txt_href").value != "";
    document.getElementById("btn_add").disabled = !enabled;
  },

  select: function() {
    document.getElementById("btn_remove").disabled = !this.list.selectedItem;
  },

  addWebAppItem: function(aDesc) {
    let item = document.createElement("richlistitem");
    item.setAttribute("id", aDesc.id);
    item.setAttribute("icon", aDesc.icon);
    item.setAttribute("name", aDesc.name);
    item.setAttribute("href", aDesc.href);
    this.list.appendChild(item);
    item.desc = aDesc;
  },
};
