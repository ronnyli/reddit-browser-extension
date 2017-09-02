'use strict'
const snoowrap = require('snoowrap');

const r = new snoowrap({
  userAgent: 'put your user-agent string here',
  clientId: 'zu8uBCaZyhxWGQ',
  clientSecret: 'n3lLMt6H-4KraPw2nwKaotv3lX8',
  refreshToken: '63648754-wv5yVJN3JkIt64BtwSdsa3Tynrw'
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
})
.then(console.log)
.catch(function (err){
  console.log(err);
});
