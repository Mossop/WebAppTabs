/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/
 */

// Tests that clicking links to a webapp that is already open will switch to
// that tab

const TESTAPPS = [{
  'name': 'Test 1',
  'href': 'http://localhost:8080/webapp1/',
  'icon': 'about:blank',
}, {
  'name': 'Test 2',
  'href': 'http://localhost:8080/webapp2/',
  'icon': 'about:blank',
}];

Components.utils.import("resource://webapptabs/modules/ConfigManager.jsm");

var gTab;

function init_test() {
  ConfigManager.webappList = TESTAPPS;
  ConfigManager.updatePrefs();

  let app = document.getElementById("Test_2");
  ok(app, "Should have the webapp");

  waitForNewTab(function(aTab) {
    gTab = aTab;
    is(gTab.browser.currentURI.spec, "http://localhost:8080/webapp2/",
       "Should have loaded the right url");

    let link = gTab.browser.contentDocument.getElementById("sublink");

    waitForTabLoad(gTab, function() {
      is(gTab.browser.currentURI.spec, "http://localhost:8080/webapp2/subpage.html",
         "Should have loaded the right url");

      run_next_test();
    });

    clickElement(link);
  });

  clickElement(app);
}

function finish_test() {
  closeTab(gTab);
}

add_test(function test_click_link() {
  let link = gTab.browser.contentDocument.getElementById("javascript");

  clickElement(link);

  // LAME
  wait(100, function() {
    is(gTab.browser.contentDocument.getElementById("javascript-result").textContent,
       "SUCCESS", "Should have run the javascript");

    run_next_test();
  });
});
