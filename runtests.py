#! python

# ***** BEGIN LICENSE BLOCK *****
#   Version: MPL 1.1/GPL 2.0/LGPL 2.1
#
# The contents of this file are subject to the Mozilla Public License Version
# 1.1 (the "License"); you may not use this file except in compliance with
# the License. You may obtain a copy of the License at
# http://www.mozilla.org/MPL/
#
# Software distributed under the License is distributed on an "AS IS" basis,
# WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
# for the specific language governing rights and limitations under the
# License.
#
# The Original Code is WebApp Tabs.
#
# The Initial Developer of the Original Code is
# Dave Townsend <dtownsend@oxymoronical.com>
# Portions created by the Initial Developer are Copyright (C) 2011
# the Initial Developer. All Rights Reserved.
#
# Contributor(s):
#
# Alternatively, the contents of this file may be used under the terms of
# either the GNU General Public License Version 2 or later (the "GPL"), or
# the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
# in which case the provisions of the GPL or the LGPL are applicable instead
# of those above. If you wish to allow use of your version of this file only
# under the terms of either the GPL or the LGPL, and not to allow others to
# use your version of this file under the terms of the MPL, indicate your
# decision by deleting the provisions above and replace them with the notice
# and other provisions required by the GPL or the LGPL. If you do not delete
# the provisions above, a recipient may use your version of this file under
# the terms of any one of the MPL, the GPL or the LGPL.
#
# ***** END LICENSE BLOCK *****

import sys, os

basedir = os.path.abspath(os.path.dirname(sys.argv[0]))
sys.path.append(os.path.join(basedir, 'mozbase/mozprocess'))
sys.path.append(os.path.join(basedir, 'mozbase/mozinfo'))
sys.path.append(os.path.join(basedir, 'mozbase/manifestdestiny'))
sys.path.append(os.path.join(basedir, 'mozbase/mozprofile'))
sys.path.append(os.path.join(basedir, 'mozbase/mozrunner'))

from manifestparser import TestManifest
from mozprocess import ProcessHandlerMixin
from mozprofile import ThunderbirdProfile
from mozrunner import ThunderbirdRunner
import json
import threading
import SocketServer
from SimpleHTTPServer import SimpleHTTPRequestHandler

def attrIsTrue(obj, attr):
  return attr in obj and obj[attr] == 'true'

class ThreadedTCPServer(SocketServer.ThreadingMixIn, SocketServer.TCPServer):
  pass

class CommandFile():
  commands = None

  def __init__(self):
    self.commands = []

  def addCommand(self, command, arguments=[]):
    self.commands.append({
      'command': command,
      'args': arguments
    })

  def writeCommands(self, profile):
    file = open(os.path.join(profile.profile, 'commands.json'), 'w')
    file.write(json.dumps(self.commands))
    file.close()
    
class TestManager():
  passCount = 0
  failCount = 0
  sawQuit = False

  def __init__(self, profile, runner, tests):
    self.profile = profile
    self.runner = runner
    self.tests = tests

    os.chdir(os.path.join(basedir, "tests/data"))
    self.server = ThreadedTCPServer(("", 8080), SimpleHTTPRequestHandler)
    thread = threading.Thread(target=self.server.serve_forever)
    thread.daemon = True
    thread.start()

  def sanityCheck(self, test, isFirst):
    if attrIsTrue(test, 'resetProfile') and attrIsTrue(test, 'startDisabled'):
      self.processFailLine("Cannot reset profile and start disabled for the same test")
    if attrIsTrue(test, 'startDisabled') and isFirst:
      self.processFailLine("Cannot start disabled for the first test")

  def runTests(self):
    if len(self.tests) == 0:
      print("No tests to run")
      return

    test = self.tests[0]
    self.sanityCheck(test, True)

    while len(self.tests) > 0:
      commands = CommandFile()

      while len(self.tests) > 0:
        heads = []
        if 'head' in test:
          heads.append(os.path.join(test['here'], test['head']))
        commands.addCommand('runTest', [test['path'], heads])
        self.tests = self.tests[1:]

        if len(self.tests) > 0:
          test = self.tests[0]
          self.sanityCheck(test, False)
          if attrIsTrue(test, 'startDisabled'):
            commands.addCommand('disableAddon')
            break
          if attrIsTrue(test, 'restartBefore') or attrIsTrue(test, 'resetProfile'):
            break

      commands.writeCommands(self.profile)

      self.sawQuit = False
      self.runner.start()
      self.runner.wait()
      if not self.sawQuit:
        self.processFailLine("Unexpected application exit")
      if attrIsTrue(test, 'resetProfile'):
        self.profile.reset()
    print("\n%d tests passed, %d tests failed" % (self.passCount, self.failCount))

  def processOutputLine(self, line):
    if line[0:9] == "!!!PASS: ":
      self.processPassLine(line[9:])
    elif line[0:9] == "!!!FAIL: ":
      self.processFailLine(line[9:])
    elif line[0:9] == "!!!INFO: ":
      self.processInfoLine(line[9:])
    else:
      self.processUnknownLine(line)

  def processPassLine(self, line):
    self.passCount += 1
    print("TEST-PASS %s" % line)

  def processFailLine(self, line):
    self.failCount += 1
    print("TEST-FAIL %s" % line)

  def processInfoLine(self, line):
    if line == "TEST-QUIT":
      self.sawQuit = True
      return
    print(line)

  def processUnknownLine(self, line):
    print("   %s" % line)

class TestProcess(ProcessHandlerMixin):
  def __init__(self, cmd, **kwargs):
    kwargs.setdefault('processOutputLine', []).append(manager.processOutputLine)
    ProcessHandlerMixin.__init__(self, cmd, **kwargs)

class TestProfile(ThunderbirdProfile):
  preferences = {
    # Turn on debug logging
    'extensions.webapptabs.loglevel': 0,
    # Don't automatically update the application
    'app.update.enabled': False,
    # Only install add-ons from the profile and the application scope
    # Also ensure that those are not getting disabled.
    # see: https://developer.mozilla.org/en/Installing_extensions
    'extensions.enabledScopes': 5,
    'extensions.autoDisableScopes': 10,
    # Don't install distribution add-ons from the app folder
    'extensions.installDistroAddons': False,
    # Dont' run the add-on compatibility check during start-up
    'extensions.showMismatchUI': False,
    # Don't automatically update add-ons
    'extensions.update.enabled': False,
    # say yes to debug output via dump
    'browser.dom.window.dump.enabled': True,
    # say no to slow script warnings
    'dom.max_chrome_script_run_time': 0,
    'dom.max_script_run_time': 0,
    # do not ask about being the default mail client
    'mail.shell.checkDefaultClient': False,
    # do not tell us about the greatness that is mozilla (about:rights)
    'mail.rights.override': True,
    # disable non-gloda indexing daemons
    'mail.winsearch.enable': False,
    'mail.winsearch.firstRunDone': True,
    'mail.spotlight.enable': False,
    'mail.spotlight.firstRunDone': True,
    # disable address books for undisclosed reasons
    'ldap_2.servers.osx.position': 0,
    'ldap_2.servers.oe.position': 0,
    # disable the first use junk dialog
    'mailnews.ui.junk.firstuse': False,
    # Do not allow check new mail to be set
    'mail.startup.enabledMailCheckOnce': True,
    # Dont load whats new or the remote start page - keep everything local
    # under our control.
    'mailnews.start_page_override.mstone': 'ignore',
    'mailnews.start_page.url': 'about:blank',
    # Do not enable gloda
    'mailnews.database.global.indexer.enabled': False,
    # But do have gloda log if it does anything.  (When disabled, queries
    # are still serviced; they just should not result in any matches.)
    'mailnews.database.global.logging.upstream': True,
    # Do not allow fonts to be upgraded
    'mail.font.windows.version': 2,
    # No, we dont want to be prompted about Telemetry
    'toolkit.telemetry.prompted': True,
    # Create fake accounts so the new account wizard won't open
    'mail.account.account1.server': 'server1',
    'mail.account.account2.identities': 'id1,id2',
    'mail.account.account2.server': 'server2',
    'mail.accountmanager.accounts': 'account1,account2',
    'mail.accountmanager.defaultaccount': 'account2',
    'mail.accountmanager.localfoldersserver': 'server1',
    'mail.identity.id1.fullName': 'Tinderbox',
    'mail.identity.id1.htmlSigFormat': False,
    'mail.identity.id1.htmlSigText': 'Tinderbox is soo 90ies',
    'mail.identity.id1.smtpServer': 'smtp1',
    'mail.identity.id1.useremail': 'tinderbox@invalid.com',
    'mail.identity.id1.valid': True,
    'mail.identity.id2.fullName': 'Tinderboxpushlog',
    'mail.identity.id2.htmlSigFormat': True,
    'mail.identity.id2.htmlSigText': 'Tinderboxpushlog is the new <b>hotness!</b>',
    'mail.identity.id2.smtpServer': 'smtp1',
    'mail.identity.id2.useremail': 'tinderboxpushlog@invalid.com',
    'mail.identity.id2.valid': True,
    'mail.server.server1.directory-rel': '[ProfD]Mail/Local Folders',
    'mail.server.server1.hostname': 'Local Folders',
    'mail.server.server1.name': 'Local Folders',
    'mail.server.server1.type': 'none',
    'mail.server.server1.userName': 'nobody',
    'mail.server.server2.check_new_mail': False,
    'mail.server.server2.directory-rel': '[ProfD]Mail/tinderbox',
    'mail.server.server2.download_on_biff': True,
    'mail.server.server2.hostname': 'tinderbox',
    'mail.server.server2.login_at_startup': False,
    'mail.server.server2.name': 'tinderbox@invalid.com',
    'mail.server.server2.type': 'pop3',
    'mail.server.server2.userName': 'tinderbox',
    'mail.server.server2.whiteListAbURI': '',
    'mail.smtp.defaultserver': 'smtp1',
    'mail.smtpserver.smtp1.hostname': 'tinderbox',
    'mail.smtpserver.smtp1.username': 'tinderbox',
    'mail.smtpservers': 'smtp1',
  }

addons = [
  os.path.join(basedir, 'src'),
  os.path.join(basedir, 'testharness')
]

manifest = TestManifest([os.path.join(basedir, 'tests/tests.ini')])
tests = manifest.active_tests(disabled=False)
profile = TestProfile(addons=addons)
runner = ThunderbirdRunner(profile=profile, process_class=TestProcess)
manager = TestManager(profile, runner, tests)

manager.runTests()
