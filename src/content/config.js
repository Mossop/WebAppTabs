/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

Components.utils.import("resource://webapptabs/modules/LogManager.jsm");
LogManager.createLogger(this, "config");
Components.utils.import("resource://webapptabs/modules/ConfigManager.jsm");

const Cc = Components.classes;
const Ci = Components.interfaces;
const Ce = Components.Exception;

const config = {
  list: null,

  load: function() {
    this.list = document.getElementById("list_webapps");

    while (this.list.itemCount > 0)
      this.list.removeItemAt(0);
    ConfigManager.webappList.forEach(function(aDesc) {
      this.addWebAppItem(aDesc);
    }, this);

    this.input();
    this.select();
  },

  unload: function() {
    ConfigManager.persistPrefs();
  },

  add: function() {
    let href = document.getElementById("txt_href").value;
    let icon = document.getElementById("txt_icon").value;

    let URIFixup = Cc["@mozilla.org/docshell/urifixup;1"].
                   getService(Ci.nsIURIFixup);
    href = URIFixup.createFixupURI(href, Ci.nsIURIFixup.FIXUP_FLAG_NONE).spec;
    icon = icon
      ? URIFixup.createFixupURI(icon, Ci.nsIURIFixup.FIXUP_FLAG_NONE).spec
      : "https://www.google.com/s2/favicons?domain=" + encodeURIComponent(href)
      ;

    let desc = {
      name: document.getElementById("txt_name").value,
      href: href,
      icon: icon
    };

    document.getElementById("txt_name").value = "";
    document.getElementById("txt_href").value = "";
    document.getElementById("txt_icon").value = "";
    this.input();

    ConfigManager.webappList.push(desc);
    ConfigManager.updatePrefs();
    this.addWebAppItem(desc);
  },

  remove: function() {
    let item = this.list.selectedItem;
    let pos = ConfigManager.webappList.indexOf(item.desc);
    ConfigManager.webappList.splice(pos, 1);
    this.list.removeChild(item);
    ConfigManager.updatePrefs();
    this.list.clearSelection();
  },

  reset: function() {
    ConfigManager.loadDefaultPrefs();
    ConfigManager.updatePrefs();
    this.load();
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
    ConfigManager.updatePrefs();

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
