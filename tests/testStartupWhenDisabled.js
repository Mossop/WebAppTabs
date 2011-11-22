/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/
 */

function test() {
  getAddon(function(aAddon) {
    ok(aAddon.userDisabled, "Add-on should not be enabled");
  });
}
