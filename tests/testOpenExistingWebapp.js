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

var gFirstTab, secontTab;

function prepTest(gFirstTab, gSecondTab, aCallback) {
  function selectTab() {
    document.getElementById("tabmail").switchToTab(gFirstTab);
    aCallback();
  }

  if (gSecondTab.browser.currentURI.spec != "http://localhost:8080/webapp2/subpage.html") {
    waitForTabLoad(gSecondTab, selectTab);
    clickElement(gSecondTab.browser.contentDocument.getElementById("sublink"));
  }
  else {
    selectTab();
  }
}

function init_test() {
  ConfigManager.webappList = TESTAPPS;
  ConfigManager.updatePrefs();

  let app1 = document.getElementById("Test_1");
  ok(app1, "Should have the first webapp");

  waitForNewTab(function(aTab) {
    gFirstTab = aTab;
    is(gFirstTab.browser.currentURI.spec, "http://localhost:8080/webapp1/",
       "Should have loaded the right url");

    let app2 = document.getElementById("Test_2");
    ok(app2, "Should have the second webapp");

    waitForNewTab(function(aTab) {
      gSecondTab = aTab;
      is(gSecondTab.browser.currentURI.spec, "http://localhost:8080/webapp2/",
         "Should have loaded the right url");

      prepTest(gFirstTab, gSecondTab, function() {
        clickElement(app2);

        is(document.getElementById("tabmail").selectedTab, gSecondTab,
           "Should have selected the right tab");
        is(gSecondTab.browser.currentURI.spec, "http://localhost:8080/webapp2/subpage.html",
           "Should have not have altered the url");

        run_next_test();
      });
    });

    clickElement(app2);
  });

  clickElement(app1);
}

function finish_test() {
  closeTab(gFirstTab);
  closeTab(gSecondTab);
}

function click_link(aLink) {
  prepTest(gFirstTab, gSecondTab, function() {
    waitForTabLoad(gSecondTab, function(aNewTab) {
      is(aNewTab.browser.currentURI.spec, "http://localhost:8080/webapp2/",
         "Should have loaded the right url");
      is(document.getElementById("tabmail").selectedTab, gSecondTab,
         "Should have selected the right tab");

      run_next_test();
    });

    info("Testing link " + aLink);
    let link = gFirstTab.browser.contentDocument.getElementById(aLink);
    ok(link, "Link should exist");

    clickElement(link);
  });
}

let links = ["test2-1", "test2-2", "test2-3", "test2-4", "test2-5"];
links.forEach(function(aLink) {
  add_test(click_link.bind(null, aLink));
});
