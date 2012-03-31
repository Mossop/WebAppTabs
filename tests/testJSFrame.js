/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/
 */

// Tests that an inner frame with a javascript protocol source works correctly

const TESTAPPS = [{
  'name': 'Test 2',
  'href': 'http://localhost:8080/webapp2/',
  'icon': 'about:blank',
}];

Components.utils.import("resource://webapptabs/modules/ConfigManager.jsm");

var gTab;

function init_test() {
  ConfigManager.webappList = TESTAPPS;
  ConfigManager.updatePrefs();

  let app2 = document.getElementById("Test_2");
  ok(app2, "Should have the first webapp");

  waitForNewTab(function(aTab) {
    gTab = aTab;
    is(gTab.browser.currentURI.spec, "http://localhost:8080/webapp2/",
       "Should have loaded the right url");

    run_next_test();
  });

  clickElement(app2);
}

function finish_test() {
  closeTab(gTab);
}

add_test(function() {
  let frame = gTab.browser.contentDocument.getElementById("frame");
  let result = frame.contentDocument.getElementById("result");
  ok(result, "Should have a result element");
  is(result.textContent, "PASS", "Should be the correct result");

  run_next_test();
});
