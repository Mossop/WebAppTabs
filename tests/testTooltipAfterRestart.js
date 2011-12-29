/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/
 */

// Tests that tooltips work from webpages after restarting

Components.utils.import("resource://webapptabs/modules/ConfigManager.jsm");

var gTab;

function init_test() {
  gTab = document.getElementById("tabmail").tabInfo[1];
  waitForTabLoad(gTab, run_next_test);
}

add_test(function test_existing_tab() {
  is(gTab.browser.currentURI.spec, "http://localhost:8080/webapp2/",
     "Should have loaded the right url");

  let tooltip = document.getElementById("aHTMLTooltip");
  waitForEvent(tooltip, "popupshown", function() {
    is(tooltip.label, "This title has a tooltip", "Tooltip label should be correct");

    closeTab(gTab, run_next_test);
  });

  let title = gTab.browser.contentDocument.getElementById("title");
  synthesizeMouse(title, 2, 2, { type: "mouseover" });
  synthesizeMouse(title, 4, 4, { type: "mousemove" });
});
