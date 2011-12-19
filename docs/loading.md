Handling page loads
===================

A lot of the code in WebApp Tabs is dedicated to redirecting loads such that
any attempt to load a know webapp will open in a new tab (or an existing one)
and any attempt to open other urls will open in the default browser.
Unfortunately Gecko doesn't make this straightforward. Thunderbird contains
some rudimentary code for this but it is entirely based on analysing the link
in a click handler and so fails for JS or targetted loads.

WebApp Tabs uses a combination of three techniques working together to be
able to control link opening fully:

onBeforeLinkTraversal
---------------------

When a link element it triggered the platform calls
`nsIXULBrowserWindow.onBeforeLinkTraversal` to allow the frontend to change the
named target of the link. It isn't possible to cancel the link load at this
point but it can be retargetted back to window that opened it to stop any
new tabs from being opened.

1.  Get the target window for the link from docshell.
2.  If the target window is an inner frame then leave the target the same, inner
    frames can load whatever they like.
3.  If the link is javascript protocol then just force the target window to
    evaluate it. Content policy handlers will stop the normal load from
    happening.
3.  If the target window isn't a webapp then leave the target the same to avoid
    breaking other extensions.
4.  If the new link is the same webapp as the source window and if the link isn't
    targetted to a new window then retarget it to the top of the source window.
5.  Otherwise if the new link is the same webapp as the source window then just
    leave the target the same.
6.  If the new link is not to a webapp then leave the target the same, the
    content policy will take over the load later.
7.  Otherwise the link is to a new webapp, target it to the existing window to
    avoid opening a new tab. The content policy will cancel the load later.
    Open the new webapp.

openURI
-------

When a page load requires a new tab/window, either because of a call to
window.open or because of a _blank link target then `nsIBrowserDOMWindow.openURI`
is called to get a new window. Again there isn't a way to cancel the load from
here and also if an existing window is returned its content will be cleared
ready for the new page. Also the new URL isn't passed to this function but the
window performing the open is.

1.  If the opening window is a webapp then create a hidden browser element and
    pass that back to be used for the load, the content policy will redirect
    the load somewhere sensible.
2.  Otherwise just allow the default handler to run.

nsIContentPolicy
----------------

Content policies are called just before a page load begins and is the last
chance to cleanly cancel the load. They generally get a lot of information, the
source page and url and the target url and load type.

1.  If the load is for anything except a top-level document then just allow it.
2.  If the load is for anything except ftp, http or https then just allow it.
3.  If there isn't a page URL then allow the load.
4.  If the load came from a hidden browser created by openURI then delete the
    browser. If the URL is for a webapp then open it in Thunderbird otherwise
    open it externally.
5.  If the load didn't come from a webapp then allow it.
6.  If the load is for the same webapp then allow it.
7.  If the load is for a different webapp then deny it, onBeforeLinkTraversal
    will have opened a new tab for it.
8.  Otherwise open the link externally.
