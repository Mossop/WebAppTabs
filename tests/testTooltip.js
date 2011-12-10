/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/
 */

// Tests that tooltips work from webpages

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

function init_test() {
  ConfigManager.webappList = TESTAPPS;
  ConfigManager.updatePrefs();
}

add_test(function test_created_tab() {
  let app2 = document.getElementById("Test_2");
  ok(app2, "Should have the second webapp");

  waitForNewTab(function(aTab) {
    is(aTab.browser.currentURI.spec, "http://localhost:8080/webapp2/",
       "Should have loaded the right url");

    let tooltip = document.getElementById("aHTMLTooltip");
    waitForEvent(tooltip, "popupshown", function() {
      is(tooltip.label, "This title has a tooltip", "Tooltip label should be correct");

      closeTab(aTab);
    });

    let title = aTab.browser.contentDocument.getElementById("title");
    synthesizeMouse(title, 2, 2, { type: "mouseover" });
    synthesizeMouse(title, 4, 4, { type: "mousemove" });
  });

  clickElement(app2);
});
