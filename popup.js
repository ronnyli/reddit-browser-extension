/**
 * Get the current URL.
 *
 * @param {function(string)} callback - called when the URL of the current tab
 *   is found.
 */
function getCurrentTabUrl(callback) {
  // Query filter to be passed to chrome.tabs.query - see
  // https://developer.chrome.com/extensions/tabs#method-query
  var queryInfo = {
    active: true,
    currentWindow: true
  };

  chrome.tabs.query(queryInfo, function(tabs) {
    // chrome.tabs.query invokes the callback with a list of tabs that match the
    // query. When the popup is opened, there is certainly a window and at least
    // one tab, so we can safely assume that |tabs| is a non-empty array.
    // A window can only have one active tab at a time, so the array consists of
    // exactly one tab.
    var tab = tabs[0];

    // A tab is a plain object that provides information about the tab.
    // See https://developer.chrome.com/extensions/tabs#type-Tab
    var url = tab.url;

    // tab.url is only available if the "activeTab" permission is declared.
    // If you want to see the URL of other tabs (e.g. after removing active:true
    // from |queryInfo|), then the "tabs" permission is required to see their
    // "url" properties.
    console.assert(typeof url == 'string', 'tab.url should be a string');

    callback(url);
  });
}

document.addEventListener('DOMContentLoaded', function() {
  getCurrentTabUrl(function(url) {
    document.getElementById("newpostURL").value = url;
  });
});

// TODO: login does not persist across browser_action sessions
var auth_flow = (function() {
  'use strict';
  const snoowrap = require('snoowrap');

  var signin_button;
  var revoke_button;
  var user_info_div;
  var newpost;

  var tokenFetcher = (function() {
    // Replace clientId and clientSecret with values obtained by you for your
    // application https://github.com/settings/applications.
    var clientId = 'WVBdzQjziRt8jQ';
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
          callback(null, snoowrap_requester);
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
            callback(new Error(chrome.runtime.lastError));
            return;
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
            callback(new Error('Invalid redirect URI'));
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
            callback(null, snoowrap_requester);
          });
        }
      },

      removeCachedToken: function(token_to_remove) {
        if (access_token == token_to_remove)
          access_token = null;
      }
    }
  })();

  // API calls

  function getUserInfo(snoowrap_requester) {
    snoowrap_requester.getMe().then(onUserInfoFetched)
  }

  function redditSubmit(snoowrap_requester) {
    var link = document.querySelector('#newpostURL').value;
    console.log('making a post for', link);
    snoowrap_requester
      .submitLink({
        subredditName: 'test',
        title: link,
        url: link
      })
      .then(console.log)
      .catch(function (err){
        console.log(err);
      });
  }

  // Functions updating the User Interface:

  function showButton(button) {
    button.style.display = 'inline';
    button.disabled = false;
  }

  function hideButton(button) {
    button.style.display = 'none';
  }

  function disableButton(button) {
    button.disabled = true;
  }

  function onUserInfoFetched(response) {
    console.log("Got the following user info: " + response);
    populateUserInfo(response);
    hideButton(signin_button);
    showButton(revoke_button);
  }

  function populateUserInfo(reddituser) {
    var elem = user_info_div;
    var nameElem = document.createElement('div');
    nameElem.innerHTML = "<b>Hello " + reddituser.name + "</b>";
    elem.appendChild(nameElem);
  }

  // Handlers for the buttons's onclick events.

  function interactiveSignIn() {
    disableButton(signin_button);
    tokenFetcher.getSnoowrap(true, function(error, snoowrap_requester) {
      if (error) {
        showButton(signin_button);
      } else {
        getUserInfo(snoowrap_requester);
      }
    });
  }

  function submitPost() {
    tokenFetcher.getSnoowrap(false, function(error, snoowrap_requester) {
      if (error) {
        console.log(error);
      } else {
        redditSubmit(snoowrap_requester);
      }
    });
  }

  function revokeToken() {
    // We are opening the web page that allows user to revoke their token.
    window.open('https://github.com/settings/applications');
    // And then clear the user interface, showing the Sign in button only.
    // If the user revokes the app authorization, they will be prompted to log
    // in again. If the user dismissed the page they were presented with,
    // Sign in button will simply sign them in.
    user_info_div.textContent = '';
    hideButton(revoke_button);
    showButton(signin_button);
  }

  return {
    onload: function () {
      signin_button = document.querySelector('#signin');
      signin_button.onclick = interactiveSignIn;

      revoke_button = document.querySelector('#revoke');
      revoke_button.onclick = revokeToken;

      user_info_div = document.querySelector('#user_info');

      newpost = document.querySelector('#newpost');
      newpost.onsubmit = submitPost;

      console.log(signin_button, revoke_button, user_info_div);

      showButton(signin_button);
    }
  };
})();

window.onload = auth_flow.onload;
