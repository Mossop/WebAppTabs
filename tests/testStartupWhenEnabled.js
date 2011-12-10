/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/
 */

// Basic tests that starting and stopping the extension builds the right UI
importScript("startup-tests.js");

function init_test() {
  getAddon(function(aAddon) {
    ok(!aAddon.userDisabled, "Add-on should be enabled");

    run_next_test();
  });
}

add_test(testBasicState);
add_test(testWebappClick);
add_test(testShutdown);
