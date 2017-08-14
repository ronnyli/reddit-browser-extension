function login() {
  return false;
}

function onRequest(request, sender, callback) {
  // Controls which functions are triggered when actions are sent from popup.js
  if (request.action == 'login') {
        login(request.url, callback);
      }
}

// Wire up the listener.
chrome.extension.onRequest.addListener(onRequest);
