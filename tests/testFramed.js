/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/
 */

// Tests that clicking links in a webapp that are meant to be opened externally
// are opened externally

const TESTAPPS = [{
  'name': 'Test 1',
  'href': 'http://localhost:8080/webapp2/framed.html',
  'icon': 'about:blank',
}];

Components.utils.import("resource://webapptabs/modules/ConfigManager.jsm");

var gTab, gListener, gEventListener, gDoc;

function init_test() {
  ConfigManager.webappList = TESTAPPS;
  ConfigManager.updatePrefs();

  let app1 = document.getElementById("Test_1");
  ok(app1, "Should have the first webapp");

  waitForNewTab(function(aTab) {
    gTab = aTab;
    is(gTab.browser.currentURI.spec, "http://localhost:8080/webapp2/framed.html",
       "Should have loaded the right url");

    let frame = gTab.browser.contentDocument.getElementById("frame");
    is(frame.src, "http://localhost:8080/webapp1/",
       "Should have loaded the right inner url");
    gDoc = frame.contentDocument;

    gListener = new TabListener();
    gEventListener = function() {
      unexpected("Should not have seen the webapp tab reload");
    }
    gTab.browser.addEventListener("load", gEventListener, true);

    run_next_test();
  });

  clickElement(app1);
}

function finish_test() {
  gListener.destroy();
  gTab.browser.removeEventListener("load", gEventListener, true);
  closeTab(gTab);
}

function click_link(aLink) {
  info("Testing link " + aLink);
  let link = gDoc.getElementById(aLink);
  ok(link, "Link should exist");

  waitForExternalLoad(function(aURL) {
    is(aURL.spec, "http://www.google.com/", "Should have loaded the link externally");
    run_next_test();
  });
  clickElement(link);
}

let links = ["test3-2", "test3-3", "test3-4"];
links.forEach(function(aLink) {
  add_test(click_link.bind(null, aLink));
});
