var tokenFetcher = (function() {
'use strict';
const snoowrap = require('snoowrap');
  // Replace clientId and clientSecret with values obtained by you for your
  // application https://github.com/settings/applications.
  var clientId = '6fqzCTIJJlk5JQ';
  // TODO: Does the redirect URL on Reddit's side need to be programmatic?
  //       The app ID appears to change from one comp to next
  var redirectUri = chrome.identity.getRedirectURL('provider_cb');
  var redirectRe = new RegExp(redirectUri + '[#\?](.*)');
  var userAgent = chrome.runtime.id + ':' + 'v0.0.1' + ' (by /u/sirius_li)'

  var snoowrap_requester = null;

  return {
    getSnoowrap: function(interactive, callback) {
      // In case we already have a snoowrap requester cached, simply return it.
      if (snoowrap_requester) {
        console.log('Getting existing snoowrap_requester');
        console.log(snoowrap_requester);
        snoowrap_requester
          .getMe()
          .then(function(resp) {
            console.log('Wassup ', resp.name);
          });
        callback(JSON.stringify(snoowrap_requester));
        return;
      }

      var authenticationUrl = snoowrap.getAuthUrl({
        clientId: clientId,
        scope: ['identity', 'submit'],
        redirectUri: redirectUri,
        permanent: true,
        state: 'fe211bebc52eb3da9bef8db6e63104d3' // a random string, this could be validated when the user is redirected back
      });
      // --> 'https://www.reddit.com/api/v1/authorize?client_id=foobarbaz&response_type=code&state= ...'
      console.log('Snoowrap auth URL:', authenticationUrl);

      var options = {
        'interactive': interactive,
        'url': authenticationUrl
      }
      chrome.identity.launchWebAuthFlow(options, function(redirectUri) {
        console.log('launchWebAuthFlow completed', chrome.runtime.lastError,
            redirectUri);

        if (chrome.runtime.lastError) {
          new Error(chrome.runtime.lastError);
        }

        // Upon success the response is appended to redirectUri, e.g.
        // https://{app_id}.chromiumapp.org/provider_cb#access_token={value}
        //     &refresh_token={value}
        // or:
        // https://{app_id}.chromiumapp.org/provider_cb#code={value}
        var matches = redirectUri.match(redirectRe);
        if (matches && matches.length > 1) {
          var code = new URL(redirectUri).searchParams.get('code');
          console.log('Snoowrap received code:', code);
          console.log('fromAuthCode:', code, userAgent, clientId, redirectUri);
          setSnoowrap(code);
        } else {
          new Error('Invalid redirect URI');
        }
      });

      function setSnoowrap(auth_code) {
        var snoowrap_promise = snoowrap.fromAuthCode({
          code: auth_code,
          userAgent: userAgent,
          clientId: clientId,
          redirectUri: redirectUri
        });
        console.log('Setting snoowrap_requester');
        snoowrap_promise.then(r => {
          console.log(r);
          snoowrap_requester = r;
          r.getMe().then(console.log);
          callback(JSON.stringify(snoowrap_requester));
        });
      }
    },

    removeCachedToken: function(token_to_remove) {
      if (access_token == token_to_remove)
        access_token = null;
    }
  }
})();

function onRequest(request, sender, callback) {
  // Controls which functions are triggered when actions are sent from popup.js
  if (request.action == 'getSnoowrap') {
    tokenFetcher.getSnoowrap(request.interactive, callback);
  }
}

// Wire up the listener.
chrome.runtime.onMessage.addListener(onRequest);
