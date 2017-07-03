'use strict'
const snoowrap = require('snoowrap');

const r = new snoowrap({
  userAgent: 'put your user-agent string here',
  clientId: 'ABC',
  clientSecret: 'EASY AS',
  refreshToken: '1-2-3'
});

r.getMe().then(console.log);

/*
r.submitSelfpost({
  subredditName: 'test',
  title: 'This is a selfpost',
  body: 'This is the body of the selfpost'
}).then(console.log)
*/
r.submitLink({
  subredditName: 'test',
  title: 'I found a cool website!',
  url: 'https://google.com'
}).then(console.log)
