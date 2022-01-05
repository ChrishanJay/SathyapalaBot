require('dotenv').config()

const Twit = require('twit');

const T = new Twit({
  consumer_key: process.env.APPLICATION_CONSUMER_KEY,
  consumer_secret: process.env.APPLICATION_CONSUMER_SECRET,
  access_token: process.env.ACCESS_TOKEN,
  access_token_secret: process.env.ACCESS_TOKEN_SECRET
});

const stream = T.stream('statuses/filter', {track: '@SathyapalaBot'});

stream.on('tweet', function (tweet) {
    console.log(tweet)

    T.get('statuses/:id', {id: tweet.in_reply_to_status_id_str}, function(err, data, response) {
      console.log(data)
    })
  })