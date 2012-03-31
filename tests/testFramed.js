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

var gTab, gListener, gEventListener, gFrame;

function init_test() {
  ConfigManager.webappList = TESTAPPS;
  ConfigManager.updatePrefs();

  let app1 = document.getElementById("Test_1");
  ok(app1, "Should have the first webapp");

  waitForNewTab(function(aTab) {
    gTab = aTab;
    is(gTab.browser.currentURI.spec, "http://localhost:8080/webapp2/framed.html",
       "Should have loaded the right url");

    gFrame = gTab.browser.contentDocument.getElementById("frame");

    gListener = new TabListener();

    run_next_test();
  });

  clickElement(app1);
}

function finish_test() {
  gListener.destroy();
  closeTab(gTab);
}

function click_internal_link(aLink) {
  is(gFrame.contentDocument.documentURIObject.spec,
     "http://localhost:8080/webapp1/",
     "Should have the right inner url");

  info("Testing link " + aLink);
  let link = gFrame.contentDocument.getElementById(aLink);
  ok(link, "Link should exist");
  let expected = link.href;

  waitForTabLoad(gTab, function(aURL) {
    is(gFrame.contentDocument.documentURIObject.spec,
       expected, "Should have loaded the link in the frame");

    waitForTabLoad(gTab, run_next_test);
    gTab.browser.goBack();
  });
  clickElement(link);
}

function click_external_link(aLink) {
  is(gFrame.contentDocument.documentURIObject.spec,
     "http://localhost:8080/webapp1/",
     "Should have the right inner url");

  info("Testing link " + aLink);
  let link = gFrame.contentDocument.getElementById(aLink);
  ok(link, "Link should exist");

  waitForExternalLoad(function(aURL) {
    is(aURL.spec, "http://www.google.com/", "Should have loaded the link externally");
    run_next_test();
  });
  clickElement(link);
}

let links = ["test2-1"]; //test3-1 should work
links.forEach(function(aLink) {
  add_test(click_internal_link.bind(null, aLink));
});

let links = ["test3-2", "test3-3", "test3-4", "test3-5"];
links.forEach(function(aLink) {
  add_test(click_external_link.bind(null, aLink));
});
