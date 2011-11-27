/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/
 */

// Tests that clicking links in a webapp that are meant to be for the same
// webapp will simply load them in the same tab

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

function test() {
  ConfigManager.webappList = TESTAPPS;
  ConfigManager.updatePrefs();

  let app1 = document.getElementById("Test_1");
  ok(app1, "Should have the first webapp");

  waitForNewTab(function(aTab) {
    is(aTab.browser.currentURI.spec, "http://localhost:8080/webapp1/",
       "Should have loaded the right url");
    let links = ["test1-1", "test1-2", "test1-3", "test1-4"];

    function clickNextLink() {
      if (links.length == 0) {
        closeTab(aTab);
        return;
      }

      waitForTabLoad(aTab, function() {
        is(aTab.browser.currentURI.spec, "http://localhost:8080/webapp1/",
           "Should have loaded the right url");
        clickNextLink();
      });

      let id = links.shift();
      info("Testing link " + id);
      let link = aTab.browser.contentDocument.getElementById(id);
      ok(link, "Link should exist");

      clickElement(link);
    }

    clickNextLink();
  });

  clickElement(app1);
}
