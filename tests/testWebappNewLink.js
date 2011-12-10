/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/
 */

// Tests that clicking links in a webapp that are meant to be for a new webapp
// will load them in a new tab

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

  let app1 = document.getElementById("Test_1");
  ok(app1, "Should have the first webapp");

  waitForNewTab(function(aTab) {
    gTab = aTab;
    is(gTab.browser.currentURI.spec, "http://localhost:8080/webapp1/",
       "Should have loaded the right url");

    run_next_test();
  });

  clickElement(app1);
}

function finish_test() {
  closeTab(gTab);
}

function click_link(aLink) {
  waitForNewTab(function(aNewTab) {
    is(aNewTab.browser.currentURI.spec, "http://localhost:8080/webapp2/",
       "Should have loaded the right url");
    closeTab(aNewTab, run_next_test);
  });

  info("Testing link " + aLink);
  let link = gTab.browser.contentDocument.getElementById(aLink);
  ok(link, "Link should exist");

  clickElement(link);
}

let links = ["test2-1", "test2-2", "test2-3", "test2-4", "test2-5"];
links.forEach(function(aLink) {
  add_test(click_link.bind(null, aLink));
});
