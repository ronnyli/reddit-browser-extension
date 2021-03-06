/**
 * Get the current URL.
 *
 * @param {function(string)} callback - called when the URL of the current tab
 *   is found.
 */
function getCurrentTabUrl(callback) {
  var URL = require('url-parse');
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

    callback(new URL(url));
  });
}

document.addEventListener('DOMContentLoaded', function() {
  getCurrentTabUrl(function(url) {
    document.getElementById("newpostURL").value = url.host + url.pathname;
  });
});

// TODO: login does not persist across browser_action sessions
var auth_flow = (function() {
  'use strict';
  const snoowrap = require('snoowrap');

  var signin_button;
  var revoke_button;
  var user_info_div;
  var post_info_div;
  var newpost;
  var search_button;

  // API calls
  function newSnoowrap(snoowrap_requester_json) {
    var j = JSON.parse(snoowrap_requester_json);
    const r = new snoowrap({
      userAgent: j.userAgent,
      clientId: j.clientId,
      clientSecret: '',
      refreshToken: j.refreshToken
    });
    return r;
  }

  function getUserInfo(snoowrap_requester_json) {
    const r = newSnoowrap(snoowrap_requester_json);
    r.getMe().then(onUserInfoFetched)
  }

  function redditSubmit(snoowrap_requester_json) {
    const r = newSnoowrap(snoowrap_requester_json);
    var link = document.querySelector('#newpostURL').value;
    console.log('making a post for', link);
    r.submitLink({
      subredditName: 'test',
      title: link,
      url: link
    })
    .then(function (submission) {
      populatePostInfo('successful post');
    })
    .catch(function (err){
      populatePostInfo(err);
    });
  }

  function redditSearch(snoowrap_requester_json) {
    const r = newSnoowrap(snoowrap_requester_json);
    getCurrentTabUrl(function(url) {
      console.log('searching Reddit for posts related to', url.host + url.pathname);
      r.search({
        query: "url:" + url.host + url.pathname,
        restrictSr: false,
        time: 'all',
        sort: 'relevance',
        syntax: 'lucene'
      })
      .then(console.log);
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

  function populatePostInfo(info) {
    var elem = post_info_div;
    elem.innerHTML = info;
  }

  // Handlers for the buttons's onclick events.

  function interactiveSignIn() {
    disableButton(signin_button);
    chrome.runtime.sendMessage({
        'action' : 'getSnoowrap',
        'interactive' : true
      },
      function(snoowrap_requester_json) {
        console.log(snoowrap_requester_json);
        if (snoowrap_requester_json) {
          getUserInfo(snoowrap_requester_json);
        } else {
          showButton(signin_button);
        }
    });
  }

  function submitPost() {
    chrome.runtime.sendMessage({
        'action' : 'getSnoowrap',
        'interactive' : true
      },
      function(snoowrap_requester_json) {
        console.log(snoowrap_requester_json);
        if (snoowrap_requester_json) {
          redditSubmit(snoowrap_requester_json);
        } else {
          populatePostInfo('Error: submitPost message passing');
        }
    });
    return false;
  }

  function searchPost() {
    chrome.runtime.sendMessage({
        'action' : 'getSnoowrap',
        'interactive' : true
      },
      function(snoowrap_requester_json) {
        console.log(snoowrap_requester_json);
        if (snoowrap_requester_json) {
          redditSearch(snoowrap_requester_json);
        } else {
          populatePostInfo('Error: searchPost message passing');
        }
    });
    return false;
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
      signin_button.type = 'button';

      revoke_button = document.querySelector('#revoke');
      revoke_button.onclick = revokeToken;

      user_info_div = document.querySelector('#user_info');
      post_info_div = document.querySelector('#post_info');

      newpost = document.querySelector('#newpost');
      newpost.onsubmit = submitPost;

      search_button = document.querySelector('#search');
      search_button.onclick = searchPost;

      console.log(signin_button, revoke_button, user_info_div, search_button);

      showButton(signin_button);
      showButton(search_button);
    }
  };
})();

window.onload = auth_flow.onload;
