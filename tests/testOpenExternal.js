/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/
 */

// Tests that clicking links in a webapp that are meant to be opened externally
// are opened externally

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
    let links = ["test3-1", "test3-2", "test3-3", "test3-4", "test3-5"];

    let listener = new TabListener();
    let eventListener = function() {
      unexpected("Should not have seen the webapp tab reload");
    }
    aTab.browser.addEventListener("load", eventListener, true);

    function clickNextLink() {
      if (links.length == 0) {
        listener.destroy();
        aTab.browser.removeEventListener("load", eventListener, true);
        closeTab(aTab);
        return;
      }

      let id = links.shift();
      info("Testing link " + id);
      let link = aTab.browser.contentDocument.getElementById(id);
      ok(link, "Link should exist");

      clickElement(link);

      executeSoon(clickNextLink);
    }

    clickNextLink();
  });

  clickElement(app1);
}
