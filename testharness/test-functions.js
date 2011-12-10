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

var Cc = Components.classes;
var Ci = Components.interfaces;

function info(aMessage) {
  _log("TEST-INFO " + aMessage);
}

function ok(aCondition, aMessage) {
  if (aCondition)
    _logPass(aMessage + ", " + aCondition + " == " + true);
  else
    _logFail(aMessage + ", " + aCondition + " == " + true);
}

function is(aFound, aExpected, aMessage) {
  if (aFound == aExpected)
    _logPass(aMessage + ", " + aFound + " == " + aExpected);
  else
    _logFail(aMessage + ", " + aFound + " == " + aExpected);
}

function isnot(aFound, aNotExpected, aMessage) {
  if (aFound != aNotExpected)
    _logPass(aMessage + ", " + aFound + " != " + aExpected);
  else
    _logFail(aMessage + ", " + aFound + " != " + aExpected);
}

function unexpected(aMessage, aException) {
  _logFail(aMessage, aException);
}

function safeCall(aCallback) {
  try {
    aCallback();
  }
  catch (e) {
    unexpected("Failed calling a callback", e);
  }
}

function synthesizeMouse(aTarget, aOffsetX, aOffsetY, aEvent)
{
  var utils = aTarget.ownerDocument.defaultView
                     .QueryInterface(Ci.nsIInterfaceRequestor)
                     .getInterface(Ci.nsIDOMWindowUtils);

  var button = aEvent.button || 0;
  var clickCount = aEvent.clickCount || 1;
  var modifiers = 0;

  var rect = aTarget.getBoundingClientRect();

  var left = rect.left + aOffsetX;
  var top = rect.top + aOffsetY;

  if (aEvent.type) {
    utils.sendMouseEvent(aEvent.type, left, top, button, clickCount, modifiers);
  }
  else {
    utils.sendMouseEvent("mousedown", left, top, button, clickCount, modifiers);
    utils.sendMouseEvent("mouseup", left, top, button, clickCount, modifiers);
  }
}

function clickElement(aTarget) {
  var utils = aTarget.ownerDocument.defaultView
                     .QueryInterface(Ci.nsIInterfaceRequestor)
                     .getInterface(Ci.nsIDOMWindowUtils);

  var rect = aTarget.getBoundingClientRect();

  var left = rect.left + rect.width / 2;
  var top = rect.top + rect.height / 2;
  utils.sendMouseEvent("mousedown", left, top, 0, 1, 0);
  utils.sendMouseEvent("mouseup", left, top, 0, 1, 0);
}

function executeSoon(aCallback) {
  waitForExplicitFinish();
  let tm = Cc["@mozilla.org/thread-manager;1"].
           getService(Ci.nsIThreadManager);
  tm.currentThread.dispatch(function() {
    safeCall(aCallback);
    finish();
  }, Ci.nsIEventTarget.DISPATCH_NORMAL);
}

function wait(aTime, aCallback) {
  waitForExplicitFinish();
  setTimeout(function() {
    safeCall(aCallback);
    finish();
  }, aTime);
}

function waitForFocus(aWindow, aCallback, aExpectBlankPage, aWaitVars) {
  waitForExplicitFinish();

  if (!aWindow)
    aWindow = window;

  aExpectBlankPage = !!aExpectBlankPage;

  var waitVars = {
    started: false
  };

  let focusManager = Cc["@mozilla.org/focus-manager;1"].
                     getService(Ci.nsIFocusManager);

  let childTargetWindow = {};
  focusManager.getFocusedElementForWindow(aWindow, true, childTargetWindow);
  childTargetWindow = childTargetWindow.value;

  function maybeRunTests() {
    if (waitVars.loaded && waitVars.focused && !waitVars.started) {
      waitVars.started = true;
      executeSoon(aCallback);
      finish();
    }
  }

  function waitForEvent(aEvent) {
    try {
      // Check to make sure that this isn't a load event for a blank or
      // non-blank page that wasn't desired.
      if (aEvent.type == "load" && (aExpectBlankPage != (aEvent.target.location == "about:blank")))
        return;

      info("Got " + aEvent.type);
      waitVars[aEvent.type + "ed"] = true;
      var win = (aEvent.type == "load") ? aWindow : childTargetWindow;
      win.removeEventListener(aEvent.type, waitForEvent, true);
      maybeRunTests();
    } catch (e) {
      unexpected("Exception caught in waitForEvent", e);
    }
  }

  // If the current document is about:blank and we are not expecting a blank
  // page (or vice versa), and the document has not yet loaded, wait for the
  // page to load. A common situation is to wait for a newly opened window
  // to load its content, and we want to skip over any intermediate blank
  // pages that load. This issue is described in bug 554873.
  waitVars.loaded = (aExpectBlankPage == (aWindow.location.href == "about:blank")) &&
                    aWindow.document.readyState == "complete";
  if (!waitVars.loaded) {
    info("Must wait for load");
    aWindow.addEventListener("load", waitForEvent, true);
  }

  // Check if the desired window is already focused.
  var focusedChildWindow = { };
  if (focusManager.activeWindow) {
    focusManager.getFocusedElementForWindow(focusManager.activeWindow, true, focusedChildWindow);
    focusedChildWindow = focusedChildWindow.value;
  }

  // If this is a child frame, ensure that the frame is focused.
  waitVars.focused = (focusedChildWindow == childTargetWindow);
  if (waitVars.focused) {
    // If the frame is already focused and loaded, call the callback directly.
    maybeRunTests();
  }
  else {
    info("Must wait for focus");
    childTargetWindow.addEventListener("focus", waitForEvent, true);
    childTargetWindow.focus();
  }
};

var TESTS = [];

function run_next_test() {
  if (TESTS.length == 0) {
    if ("finish_test" in this)
      finish_test();
    return;
  }

  let test = TESTS.shift();
  info("Running test " + test.name);
  test();
}

function add_test(aTest) {
  TESTS.push(aTest);
}

function test() {
  if ("init_test" in this)
    init_test();
  else
    run_next_test();
}
