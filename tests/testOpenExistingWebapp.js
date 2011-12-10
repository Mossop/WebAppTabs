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

function prepTest(aFirstTab, aSecondTab, aCallback) {
  function selectTab() {
    document.getElementById("tabmail").switchToTab(aFirstTab);
    aCallback();
  }

  if (aSecondTab.browser.currentURI.spec != "http://localhost:8080/webapp2/subpage.html") {
    waitForTabLoad(aSecondTab, selectTab);
    clickElement(aSecondTab.browser.contentDocument.getElementById("sublink"));
  }
  else {
    selectTab();
  }
}

function test() {
  ConfigManager.webappList = TESTAPPS;
  ConfigManager.updatePrefs();

  let app1 = document.getElementById("Test_1");
  ok(app1, "Should have the first webapp");

  waitForNewTab(function(aFirstTab) {
    is(aFirstTab.browser.currentURI.spec, "http://localhost:8080/webapp1/",
       "Should have loaded the right url");

    let app2 = document.getElementById("Test_2");
    ok(app2, "Should have the second webapp");

    waitForNewTab(function(aSecondTab) {
      is(aSecondTab.browser.currentURI.spec, "http://localhost:8080/webapp2/",
         "Should have loaded the right url");

      prepTest(aFirstTab, aSecondTab, function() {
        clickElement(app2);

        is(document.getElementById("tabmail").selectedTab, aSecondTab,
           "Should have selected the right tab");
        is(aSecondTab.browser.currentURI.spec, "http://localhost:8080/webapp2/subpage.html",
           "Should have not have altered the url");

        var links = ["test2-1", "test2-2", "test2-3", "test2-4", "test2-5"];

        function clickNextLink() {
          if (links.length == 0) {
            closeTab(aFirstTab);
            closeTab(aSecondTab);
            return;
          }

          prepTest(aFirstTab, aSecondTab, function() {
            waitForTabLoad(aSecondTab, function(aNewTab) {
              is(aNewTab.browser.currentURI.spec, "http://localhost:8080/webapp2/",
                 "Should have loaded the right url");
              is(document.getElementById("tabmail").selectedTab, aSecondTab,
                 "Should have selected the right tab");
              clickNextLink();
            });

            let id = links.shift();
            info("Testing link " + id);
            let link = aFirstTab.browser.contentDocument.getElementById(id);
            ok(link, "Link should exist");
  
            clickElement(link);
          });
        }

        clickNextLink();
      });
    });

    clickElement(app2);
  });

  clickElement(app1);
}
