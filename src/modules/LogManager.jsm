/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

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
