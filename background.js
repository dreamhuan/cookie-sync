chrome.runtime.onInstalled.addListener(function () {
  chrome.declarativeContent.onPageChanged.removeRules(undefined, function () {
    chrome.declarativeContent.onPageChanged.addRules([
      {
        conditions: [new chrome.declarativeContent.PageStateMatcher()],
        actions: [new chrome.declarativeContent.ShowPageAction()],
      },
    ]);
  });
});

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  var result = "";
  var sandbox = document.getElementById("sandbox");
  sandbox.value = "";
  sandbox.select();
  if (document.execCommand("paste")) {
    result = sandbox.value;
  }
  sandbox.value = "";
  sendResponse(result);
});
