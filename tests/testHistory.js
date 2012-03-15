/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/
 */

// Tests that the back and forward items in the context menu work correctly

const TESTAPPS = [{
  'name': 'Test 2',
  'href': 'http://localhost:8080/webapp2/',
  'icon': 'about:blank',
}];

Components.utils.import("resource://webapptabs/modules/ConfigManager.jsm");

var gTab, gListener, gEventListener, gBack, gForward;

function init_test() {
  ConfigManager.webappList = TESTAPPS;
  ConfigManager.updatePrefs();

  gBack = document.getElementById("webapptabs-context-back");
  gForward = document.getElementById("webapptabs-context-forward");

  let app1 = document.getElementById("Test_2");
  ok(app1, "Should have the webapp");

  waitForNewTab(function(aTab) {
    gTab = aTab;

    gListener = new TabListener();

    run_next_test();
  });

  clickElement(app1);
}

function finish_test() {
  gListener.destroy();
  closeTab(gTab);
}

add_test(function no_history() {
  is(gTab.browser.currentURI.spec, "http://localhost:8080/webapp2/",
     "Should have loaded the right url");

  openContextMenu(gTab.browser.contentDocument.documentElement, function() {
    ok(gBack.disabled, "Back should be disabled");
    ok(gForward.disabled, "Forward should be disabled");

    closeContextMenu(function() {
      run_next_test();
    });
  });
});

add_test(function new_page() {
  waitForTabLoad(gTab, function() {
    is(gTab.browser.currentURI.spec, "http://localhost:8080/webapp2/subpage.html",
       "Should have loaded the right url");

    openContextMenu(gTab.browser.contentDocument.documentElement, function() {
      ok(!gBack.disabled, "Back should be enabled");
      ok(gForward.disabled, "Forward should be disabled");

      run_next_test();
    });
  });

  clickElement(gTab.browser.contentDocument.getElementById("sublink"));
});

add_test(function back() {
  waitForTabLoad(gTab, function() {
    is(gTab.browser.currentURI.spec, "http://localhost:8080/webapp2/",
       "Should have loaded the right url");

    openContextMenu(gTab.browser.contentDocument.documentElement, function() {
      ok(gBack.disabled, "Back should be disabled");
      ok(!gForward.disabled, "Forward should be enabled");

      run_next_test();
    });
  });

  clickElement(gBack);
});

add_test(function forward() {
  waitForTabLoad(gTab, function() {
    is(gTab.browser.currentURI.spec, "http://localhost:8080/webapp2/subpage.html",
       "Should have loaded the right url");

    openContextMenu(gTab.browser.contentDocument.documentElement, function() {
      ok(!gBack.disabled, "Back should be enabled");
      ok(gForward.disabled, "Forward should be disabled");

      closeContextMenu(run_next_test);
    });
  });

  clickElement(gForward);
});
