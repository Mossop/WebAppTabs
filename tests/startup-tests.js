/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/
 */

const WEBAPPS = [{
  'id': 'Google_Calendar',
  'image': 'https://calendar.google.com/googlecalendar/images/favicon.ico',
}, {
  'id': 'Facebook',
  'image': 'https://www.facebook.com/favicon.ico',
}, {
  'id': 'Google+',
  'image': 'https://ssl.gstatic.com/s2/oz/images/favicon.ico',
}, {
  'id': 'Twitter',
}];

function testBasicState() {
  let hbox = document.getElementById("webapptabs-buttons");
  ok(hbox, "Overlay element created");
  is(hbox.parentNode.parentNode.id, "tabmail-buttons", "Overlay applied in the right place");

  is(hbox.childNodes.length, WEBAPPS.length, "Created the right number of webapps");
  let webapp = hbox.firstChild;
  let pos = 0;
  while (pos < WEBAPPS.length) {
    for (let attr in WEBAPPS[pos]) {
      is(webapp.getAttribute(attr), WEBAPPS[pos][attr],
         "Saw the right value for " + attr + " in app " + pos);
    }

    pos++;
    webapp = webapp.nextSibling;
  }

  run_next_test();
}

function testWebappClick() {
  waitForNewTab(function(aTab) {
    is(aTab.browser.currentURI.spec, "https://twitter.com/",
       "Should have loaded the right URL");

    closeTab(aTab, function() {
      run_next_test();
    });
  });

  var app = document.getElementById("Twitter");
  clickElement(app);
}

function testShutdown() {
  getAddon(function(aAddon) {
    aAddon.userDisabled = true;

    let hbox = document.getElementById("webapptabs-buttons");
    ok(!hbox, "Overlay element removed");

    aAddon.userDisabled = false;
    run_next_test();
  });
}
