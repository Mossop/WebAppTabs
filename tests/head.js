/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/
 */

Components.utils.import("resource://gre/modules/AddonManager.jsm");

function getAddon(aCallback) {
  waitForExplicitFinish();
  AddonManager.getAddonByID("webapptabs@fractalbrew.com", function(aAddon) {
    try {
      aCallback(aAddon);
    }
    catch (e) {
      unexpected("getAddon callback threw an exception", e);
    }
    finish();
  });
}

function enableAddon(aCallback) {
  getAddon(function(aAddon) {
    aAddon.userDisabled = false;
    aCallback();
  });
}
