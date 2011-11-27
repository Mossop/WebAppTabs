/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/
 */

// Basic tests that starting and stopping the extension builds the right UI
importScript("startup-tests.js");

function test() {
  getAddon(function(aAddon) {
    ok(!aAddon.userDisabled, "Add-on should be enabled");

    testBasicState();
  });
}
