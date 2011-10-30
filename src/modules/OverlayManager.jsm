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

const EXPORTED_SYMBOLS = ["OverlayManager"];

Components.utils.import("resource://gre/modules/Services.jsm");
Components.utils.import("resource://webapptabs/modules/LogManager.jsm");
LogManager.createLogger(this, "OverlayManager");

const Cc = Components.classes;
const Ci = Components.interfaces;
const Ce = Components.Exception;
const Cr = Components.results;

const OverlayManager = {
  addOverlays: function(aOverlayList) {
    OverlayManagerInternal.addOverlays(aOverlayList);
  },

  unload: function() {
    OverlayManagerInternal.unload();
  }
};

const OverlayManagerInternal = {
  windowEntryMap: new WeakMap(),
  windowEntries: {},
  styles: {},
  scripts: {},

  init: function() {
    LOG("init");
    try {
      let windows = Services.wm.getEnumerator(null);
      while (windows.hasMoreElements()) {
        let domWindow = windows.getNext().QueryInterface(Ci.nsIDOMWindow);
        this.createWindowEntry(domWindow);
      }

      Services.wm.addListener(this);
    }
    catch (e) {
      ERROR("Exception during init", e);
    }
  },

  unload: function() {
    LOG("unload");
    try {
      Services.wm.removeListener(this);
  
      let windows = Services.wm.getEnumerator(null);
      while (windows.hasMoreElements()) {
        let domWindow = windows.getNext().QueryInterface(Ci.nsIDOMWindow);
        this.destroyWindowEntry(domWindow);
      }
    }
    catch (e) {
      ERROR("Exception during unload", e);
    }
  },

  createWindowEntry: function(aDOMWindow) {
    aDOMWindow.addEventListener("unload", this, false);

    let spec = aDOMWindow.location.toString();
    LOG("Creating window entry for " + spec);
    if (this.windowEntryMap.has(aDOMWindow))
      throw new Ce("Already registered window entry for " + spec);

    if (!(spec in this.windowEntries))
      this.windowEntries[spec] = [];

    let newEntry = {
      window: aDOMWindow,
      scripts: [],
      styles: [],
    };

    this.windowEntries[spec].push(newEntry);
    this.windowEntryMap.set(aDOMWindow, newEntry);

    if (spec in this.styles) {
      this.styles[spec].forEach(function(aStyleURL) {
        this.loadStyleOverlay(newEntry, aStyleURL);
      }, this);
    }

    if (spec in this.scripts) {
      this.scripts[spec].forEach(function(aScriptURL) {
        this.loadScriptOverlay(newEntry, aScriptURL);
      }, this);
    }
  },

  destroyWindowEntry: function(aDOMWindow) {
    aDOMWindow.removeEventListener("unload", this, false);

    let spec = aDOMWindow.location.toString();
    LOG("Destroying window entry for " + spec);
    if (!(spec in this.windowEntries) || !this.windowEntryMap.has(aDOMWindow))
      throw new Ce("Missing window entry for " + spec);

    let windowEntry = this.windowEntryMap.get(aDOMWindow);
    this.windowEntryMap.delete(aDOMWindow);

    this.unloadStyleOverlays(windowEntry);
    this.unloadScriptOverlays(windowEntry);

    let pos = this.windowEntries[spec].indexOf(windowEntry);
    if (pos == -1)
      throw new Ce("Missing window entry for " + spec);

    this.windowEntries[spec].splice(pos, 1);
  },

  loadStyleOverlay: function(aWindowEntry, aStyleURL) {
    LOG("Loading style overlay " + aStyleURL);

    let styleNode = aWindowEntry.window.document.createElementNS("http://www.w3.org/1999/xhtml", "link");
    styleNode.setAttribute("rel", "stylesheet");
    styleNode.setAttribute("type", "text/css");
    styleNode.setAttribute("href", aStyleURL);
    styleNode.setAttribute("style", "display: none");
    aWindowEntry.window.document.documentElement.appendChild(styleNode);

    aWindowEntry.styles.push(styleNode);
  },

  unloadStyleOverlays: function(aWindowEntry) {
    aWindowEntry.styles.forEach(function(aStyleNode) {
      aStyleNode.parentNode.removeChild(aStyleNode);
    }, this);

    aWindowEntry.styles = [];
  },

  loadScriptOverlay: function(aWindowEntry, aScriptURL) {
    LOG("Loading script overlay " + aScriptURL);

    let sandbox = Components.utils.Sandbox(aWindowEntry.window, {
      sandboxName: aScriptURL,
      sandboxPrototype: aWindowEntry.window
    });

    try {
      Components.utils.evalInSandbox(
        "Components.classes['@mozilla.org/moz/jssubscript-loader;1']" +
                  ".createInstance(Components.interfaces.mozIJSSubScriptLoader)" +
                  ".loadSubScript('" + aScriptURL + "');", sandbox, "ECMAv5");

      if ("OverlayListener" in sandbox && "load" in sandbox.OverlayListener)
        sandbox.OverlayListener.load();
    }
    catch (e) {
      WARN("Exception loading script overlay " + aScriptURL, e);
    }

    aWindowEntry.scripts.push(sandbox);
  },

  unloadScriptOverlays: function(aWindowEntry) {
    aWindowEntry.scripts.forEach(function(aSandbox) {
      if ("OverlayListener" in aSandbox && "unload" in aSandbox.OverlayListener)
        aSandbox.OverlayListener.unload();
    }, this);

    aWindowEntry.scripts = [];
  },

  addOverlays: function(aOverlayList) {
    try {
      for (windowURL in aOverlayList) {
        let windows = [];
        if (windowURL in this.windowEntries)
          windows = this.windowEntries[windowURL];

        aOverlayList[windowURL].styles.forEach(function(aStyleURL) {
          if (!(windowURL in this.styles))
            this.styles[windowURL] = [];

          this.styles[windowURL].push(aStyleURL);

          windows.forEach(function(aWindowEntry) {
            this.loadStyleOverlay(aWindowEntry, aStyleURL);
          }, this);
        }, this);

        aOverlayList[windowURL].scripts.forEach(function(aScriptURL) {
          if (!(windowURL in this.scripts))
            this.scripts[windowURL] = [];

          this.scripts[windowURL].push(aScriptURL);

          windows.forEach(function(aWindowEntry) {
            this.loadScriptOverlay(aWindowEntry, aScriptURL);
          }, this);
        }, this);
      }
    }
    catch (e) {
      ERROR("Exception adding overlay list", e);
    }
  },

  // nsIEventListener implementation
  handleEvent: function(aEvent) {
    try {
      let domWindow = aEvent.currentTarget;

      switch (aEvent.type) {
      case "load":
        domWindow.removeEventListener("load", this, false);
        OverlayManagerInternal.createWindowEntry(domWindow);
        break;
      case "unload":
        OverlayManagerInternal.destroyWindowEntry(domWindow);
        break;
      }
    }
    catch (e) {
      ERROR("Error during window " + aEvent.type, e);
    }
  },

  // nsIWindowMediatorListener implementation
  onOpenWindow: function(aXULWindow) {
    let domWindow = aXULWindow.QueryInterface(Ci.nsIInterfaceRequestor)
                              .getInterface(Ci.nsIDOMWindowInternal);

    domWindow.addEventListener("load", this, false);
  },

  onWindowTitleChange: function() { },
  onCloseWindow: function() { },
};

OverlayManagerInternal.init();
