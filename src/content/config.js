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

    ConfigManager.webappList.push(desc);
    ConfigManager.persistPrefs();
    this.addWebAppItem(desc);
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

  findTargetForDrop: function(aEvent) {
    let target = aEvent.target;
    let source = aEvent.dataTransfer.mozSourceNode;

    // If dropping on the list then we want to drop at the end of the list
    if (target == this.list)
      return null;

    let rect = target.getBoundingClientRect();
    // If dropping closer to the top of the element then drop before the element
    if ((aEvent.clientY - rect.top) < (rect.bottom - aEvent.clientY))
      return target;
    // Otherwise drop after
    return target.nextSibling;
  },

  dragStart: function(aEvent) {
    let item = aEvent.target;
    if (item.localName != "richlistitem")
      return;
    let desc = item.desc;

    let dt = aEvent.dataTransfer;
    dt.setData("application/x-webapptab", desc.id);
    dt.addElement(item);

    let rect = item.getBoundingClientRect();
    dt.setDragImage(item, (rect.right - rect.left) / 2, (rect.bottom - rect.top) / 2);

    dt.effectAllowed = "move";
  },

  dragEnter: function(aEvent) {
    let dt = aEvent.dataTransfer;

    if (this.lastDragTarget)
      this.lastDragTarget.removeAttribute("dragpos");

    // Don't allow drops from anywhere else
    if (!dt.types.contains("application/x-webapptab"))
      return;

    let sourceItem = dt.mozSourceNode;
    // Dropping an item onto itself does nothing
    if (sourceItem == aEvent.target)
      return;

    let targetItem = this.findTargetForDrop(aEvent);

    // Can't drop before or after the original item
    if (targetItem == sourceItem || targetItem == sourceItem.nextSibling)
      return;

    this.list.setAttribute("dragging", "true");
    if (targetItem) {
      targetItem.setAttribute("dragpos", "before");
      this.lastDragTarget = targetItem;
    }
    else {
      this.list.lastChild.setAttribute("dragpos", "after");
      this.lastDragTarget = this.list.lastChild;
    }

    aEvent.preventDefault();
  },

  dragOver: function(aEvent) {
    this.dragEnter(aEvent);
  },

  drop: function(aEvent) {
    let dt = aEvent.dataTransfer;

    // Don't allow drops from anywhere else
    if (!dt.types.contains("application/x-webapptab"))
      return;

    let sourceItem = dt.mozSourceNode;
    // Dropping an item onto itself does nothing
    if (sourceItem == aEvent.target)
      return;

    let targetItem = this.findTargetForDrop(aEvent);

    // Can't drop before or after the original item
    if (targetItem == sourceItem || targetItem == sourceItem.nextSibling)
      return;

    this.list.insertBefore(sourceItem, targetItem);

    let sourcePos = ConfigManager.webappList.indexOf(sourceItem.desc);
    ConfigManager.webappList.splice(sourcePos, 1);

    if (targetItem) {
      let targetPos = ConfigManager.webappList.indexOf(targetItem.desc);
      ConfigManager.webappList.splice(targetPos, 0, sourceItem.desc);
    }
    else {
      ConfigManager.webappList.push(sourceItem.desc);
    }
    ConfigManager.persistPrefs();

    aEvent.preventDefault();
  },

  dragEnd: function(aEvent) {
    if (this.lastDragTarget)
      this.lastDragTarget.removeAttribute("dragpos");
    this.lastDragTarget = null;

    this.list.removeAttribute("dragging");
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
