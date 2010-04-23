var Cc = Components.classes;
var Ci = Components.interfaces;
var Cu = Components.utils;

Cu.import("resource:///modules/errUtils.js");


function OnLoad() {
  try {
    for (let [,tabDesc] in Iterator(parent.webtabs.tabDescsList)) {
      addRow(tabDesc);
    }
    addNewRow();
  } catch (e) {
    logException(e);
  }
}


function addRow(tabDesc) {
  let list = $("#list");
  //let name = tabDesc["name"];
  let id = tabDesc['id'];
  let url = tabDesc["options"]["contentPage"];
  let frag = "<li id='" + id + "' class='webtab'><span class='url'>" + url +
    "</span><a class='remove' onclick='doRemove(\""+id+"\")'>remove</a></input></li>"
  list.append(frag);
}

function addNewRow() {
  let list = $("#body");
  list.append("<span id='lastrow'>Add a new tab for the website:<input id='lastinput' onkeydown='doKeyDown(event)' class='url' type='text size='80'></input><button onclick='doAdd()'>Add</button></span>")
}


function doRemove(id) {
  let row = document.getElementById(id);
  row.parentNode.removeChild(row);
  parent.webtabs.uninstallTab(id);
}

function doKeyDown(event) {
  if (event.keyCode == 13) doAdd();
}

function doAdd() {
  try {
    let list = $("#list");
    let lastinput = document.getElementById('lastinput');
    let url = lastinput.value;
    // Fixup URL (so www.foo.com will turn to http://www.foo.com)
    let URIFixup = Cc["@mozilla.org/docshell/urifixup;1"]
                           .getService(Ci.nsIURIFixup);
    url = URIFixup.createFixupURI(url, Ci.nsIURIFixup.FIXUP_FLAG_NONE).spec;
    // Find favicon
    // argh.  part of browser, requires places.
    //let fs = Cc["@mozilla.org/browser/favicon-service;1"].
    //  getService(Ci.nsIFaviconService);
    //let ioService = Components.classes["@mozilla.org/network/io-service;1"]  
    //  .getService(Components.interfaces.nsIIOService);
    //let URI = ioService.newURI(url);
    //let favicon = fs.getFaviconForPage(URI);
    
    let favicon = "http://getfavicon.appspot.com/" + url // for demo purposes
    lastinput.value = '';

    let desc = {id: url,
                regexp: new RegExp(),
                options: {contentPage: url,
                backround: false, clickHandler: "specialTabs.siteClickHandler(event, webtabs.tabDescs['regexp'])"},
                icon: favicon}
    addRow(desc);
    parent.webtabs.installTab(desc);
    parent.webtabs.persist();
  } catch(e) {
    logException(e);
  }
}