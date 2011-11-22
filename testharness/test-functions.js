function info(aMessage) {
  _log("TEST-INFO " + aMessage);
}

function ok(aCondition, aMessage) {
  is(!!aCondition, true, aMessage);
}

function is(aFound, aExpected, aMessage) {
  if (aFound == aExpected)
    _logPass(aMessage);
  else
    _logFail(aMessage);
}

function isnot(aFound, aNotExpected, aMessage) {
  if (aFound != aNotExpected)
    _logPass(aMessage);
  else
    _logFail(aMessage);
}
