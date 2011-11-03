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

const EXPORTED_SYMBOLS = ["LogManager"];

Components.utils.import("resource://gre/modules/Services.jsm");

const Cc = Components.classes;
const Ci = Components.interfaces;

const LOGLEVEL = "extensions.webapptabs.loglevel";

function Logger(aScope, aName) {
  this.name = aName;

  aScope.LOG = this.log.bind(this);
  aScope.WARN = this.warn.bind(this);
  aScope.ERROR = this.error.bind(this);
}

Logger.prototype = {
  name: null,

  log: function(aStr, aException) {
    if (LogManager.logLevel > LogManager.LEVEL_LOG)
      return;

    let message = this.formatLogMessage("error", this.name, aStr, aException);

    Services.console.logStringMessage(message)

    dump("***  LOG  *** " + message + "\n");
  },

  warn: function(aStr, aException) {
    if (LogManager.logLevel > LogManager.LEVEL_WARN)
      return;

    let message = this.formatLogMessage("error", this.name, aStr, aException);

    let stack = this.getStackDetails(aException);

    let consoleMessage = Cc["@mozilla.org/scripterror;1"].
                         createInstance(Ci.nsIScriptError);
    consoleMessage.init(message, stack.sourceName, null, stack.lineNumber, 0,
                        Ci.nsIScriptError.warningFlag, "component javascript");
    Services.console.logMessage(consoleMessage);

    dump("*** WARN  *** " + message + "\n");
  },

  error: function(aStr, aException) {
    if (LogManager.logLevel > LogManager.LEVEL_ERROR)
      return;

    let message = this.formatLogMessage("error", this.name, aStr, aException);

    let stack = this.getStackDetails(aException);

    let consoleMessage = Cc["@mozilla.org/scripterror;1"].
                         createInstance(Ci.nsIScriptError);
    consoleMessage.init(message, stack.sourceName, null, stack.lineNumber, 0,
                        Ci.nsIScriptError.errorFlag, "component javascript");
    Services.console.logMessage(consoleMessage);

    dump("*** ERROR *** " + message + "\n");
  },

  formatLogMessage: function(aType, aName, aStr, aException) {
    let message = aName + ": " + aStr;
    if (aException) {
      try {
        if ("message" in aException)
          return message + ": " + aException.message;
      } catch (e) { }
      return message + ": " + aException;
    }
    return message;
  },

  getStackDetails: function(aException) {
    // Defensively wrap all this to ensure that failing to get the message source
    // doesn't stop the message from being logged
    try {
      if (aException) {
        if (aException instanceof Ci.nsIException) {
          return {
            sourceName: aException.filename,
            lineNumber: aException.lineNumber
          };
        }

        return {
          sourceName: aException.fileName,
          lineNumber: aException.lineNumber
        };
      }

      let stackFrame = Components.stack.caller.caller.caller;
      return {
        sourceName: stackFrame.filename,
        lineNumber: stackFrame.lineNumber
      };
    }
    catch (e) {
      return {
        sourceName: null,
        lineNumber: 0
      };
    }
  },
};

var gLogLevel = null;

const LogManager = {
  LEVEL_DEBUG: 0,
  LEVEL_LOG: 1,
  LEVEL_WARN: 2,
  LEVEL_ERROR: 3,

  get logLevel() {
    if (gLogLevel)
      return gLogLevel;

    if (Services.prefs.getPrefType(LOGLEVEL) != Services.prefs.PREF_INT)
      gLogLevel = 2;
    else
      gLogLevel = Services.prefs.getIntPref(LOGLEVEL);

    return gLogLevel;
  },

  createLogger: function(aScope, aName) {
    new Logger(aScope, aName);
  }
}
