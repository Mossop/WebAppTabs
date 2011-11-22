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
Components.utils.import("resource://gre/modules/Services.jsm");
Components.utils.import("resource://gre/modules/NetUtil.jsm");
Components.utils.import("resource://gre/modules/FileUtils.jsm");
Components.utils.import("resource://gre/modules/AddonManager.jsm");

const Cc = Components.classes;
const Ci = Components.interfaces;
const Ce = Components.Exception;
const Cr = Components.results;

const ADDONID = "webapptabs@fractalbrew.com";

function TestFunctions(aHarness, aScriptURL) {
  this.harness = aHarness;
  this.script = aScriptURL;
}

TestFunctions.prototype = {
  harness: null,
  script: null,

  info: function(aMessage) {
    this.harness.log("TEST-INFO " + aMessage);
  },

  ok: function(aCondition, aMessage) {
    if (aCondition)
      this.harness.logPass(aMessage);
    else
      this.harness.logFail(aMessage);
  },

  is: function(aFound, aExpected, aMessage) {
    if (aFound == aExpected)
      this.harness.logPass(aMessage);
    else
      this.harness.logFail(aMessage);
  },

  isnot: function(aFound, aNotExpected, aMessage) {
    if (aFound != aNotExpected)
      this.harness.logPass(aMessage);
    else
      this.harness.logFail(aMessage);
  }
};

function TestHarness() {
}

TestHarness.prototype = {
  window: null,
  commandList: null,

  log: function(aStr) {
    dump("!!!INFO: " + aStr + "\n");
  },

  logPass: function(aStr) {
    dump("!!!PASS: " + aStr + "\n");
  },

  logFail: function(aStr, aException) {
    dump("!!!FAIL: " + aStr + "\n");
    if (aException)
      dump("!!!INFO:           Exception: " + aException + "\n");
  },

  // All of these are run as if they are members of TestHarness
  commands: {
    disableAddon: function() {
      let self = this;
      AddonManager.getAddonByID(ADDONID, function(aAddon) {
        if (!aAddon)
          self.logFail("Add-on is missing");
        else
          aAddon.userDisabled = true;

        self.runNextCommand();
      });
    },

    runTest: function(aTestPath, aHeadFiles) {
      this.log("TEST-START " + aTestPath);

      let file = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsILocalFile);
      file.initWithPath(aTestPath);
      let url = NetUtil.newURI(file);

      let self = this;
      let sandbox = this.createTestSandbox(url, function() {
        self.log("TEST-END " + aTestPath);
        self.runNextCommand();
      });

      if (aHeadFiles) {
        aHeadFiles.forEach(function(aHeadPath) {
          let file = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsILocalFile);
          file.initWithPath(aHeadPath);
          let url = NetUtil.newURI(file);
          this.loadSandboxScript(sandbox, url);
        }, this);
      }

      this.loadSandboxScript(sandbox, url);

      try {
        sandbox.waitForExplicitFinish();
        sandbox.test();
      }
      catch (e) {
        this.logFail("Exception running test", e);
      }
      finally {
        sandbox.finish();
      }
    }
  },

  createTestSandbox: function(aScriptURL, aFinishedCallback) {
    let args = {
      sandboxName: aScriptURL,
      sandboxPrototype: this.window
    };

    let sandbox = Components.utils.Sandbox(this.window, args);

    let functions = new TestFunctions(this, aScriptURL);
    ["info", "ok", "is", "isnot"].forEach(function(aFunc) {
      sandbox[aFunc] = functions[aFunc].bind(functions);
    });

    let self = this;
    let pending = 0;
    sandbox.waitForExplicitFinish = function() {
      pending++;
    }
    sandbox.finish = function() {
      if (--pending == 0)
        aFinishedCallback();
    }

    return sandbox;
  },

  loadSandboxScript: function(aSandbox, aScriptURL) {
    try {
      Components.utils.evalInSandbox(
        "Components.classes['@mozilla.org/moz/jssubscript-loader;1']" +
                  ".createInstance(Components.interfaces.mozIJSSubScriptLoader)" +
                  ".loadSubScript('" + aScriptURL.spec + "');", aSandbox, "ECMAv5");
    }
    catch (e) {
      this.logFail("Exception loading script " + aScriptURL.spec, e);
    }
  },

  loadCommands: function() {
    let fis = Cc["@mozilla.org/network/file-input-stream;1"].
              createInstance(Ci.nsIFileInputStream);
    let json = Cc["@mozilla.org/dom/json;1"].
               createInstance(Ci.nsIJSON);

    try {
      let file = FileUtils.getFile("ProfD", ["commands.json"], false);
      fis.init(file, -1, 0, 0);
      this.commandList = json.decodeFromStream(fis, file.fileSize);
    }
    catch (e) {
      this.logFail("Failed to read commands", e);
      this.commandList = [];
    }
    finally {
      fis.close();
    }
  },

  runCommands: function() {
    this.loadCommands();
    this.runNextCommand();
  },

  runNextCommand: function() {
    if (this.commandList.length == 0) {
      this.log("TEST-QUIT");
      Cc["@mozilla.org/toolkit/app-startup;1"].getService(Ci.nsIAppStartup)
                                              .quit(Ci.nsIAppStartup.eAttemptQuit);
      return;
    }

    let command = this.commandList.shift();
    if (!(command.command in this.commands)) {
      this.logFail("Unsupported harness command " + command.command);
      this.runNextCommand();
      return;
    }

    try {
      this.commands[command.command].apply(this, command.args);
    }
    catch (e) {
      this.logFail("Exception running command " + command.command, e);
      this.runNextCommand();
    }
  },

  observe: function(aSubject, aTopic, aData) {
    switch (aTopic) {
    case "profile-after-change":
      Services.obs.addObserver(this, "mail-startup-done", false);
      break;
    case "mail-startup-done":
      Services.obs.removeObserver(this, "mail-startup-done");
      this.window = aSubject.QueryInterface(Ci.nsIDOMWindowInternal);
      // Hacky but does the job
      this.window.setTimeout(this.runCommands.bind(this), 100);
      break;
    }
  },

  classID: Components.ID("{ff8e5752-07f1-40c9-9491-064d23f2edcd}"),
  QueryInterface: XPCOMUtils.generateQI([Ci.nsIObserver])
};

var NSGetFactory = XPCOMUtils.generateNSGetFactory([TestHarness]);
