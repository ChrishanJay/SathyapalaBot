import express from 'express';
import dotenv from 'dotenv';
import { Twitter } from './twitter';

dotenv.config();
const app = express();
let twitter: Twitter;

app.get('/', (req, res) => {
    res.send('Hello');
});
const {TwitterApi, ETwitterStreamEvent} = require('twitter-api-v2');

const client = new TwitterApi({
    appKey: process.env.APPLICATION_CONSUMER_KEY,
    appSecret: process.env.APPLICATION_CONSUMER_SECRET,
    accessToken: process.env.ACCESS_TOKEN,
    accessSecret: process.env.ACCESS_TOKEN_SECRET,
});

( async ()=> {
  // Whatever is here will be executed as soon as the script is loaded.
  const stream = await client.v1.filterStream({
    // See FilterStreamParams interface.
    track: '@SathyapalaBot',
  });

  stream.on(
    // Emitted when Node.js {response} emits a 'error' event (contains its payload).
    ETwitterStreamEvent.ConnectionError,
    err => console.log('Connection error!', err),
  );
  
  stream.on(
    // Emitted when Node.js {response} is closed by remote or using .close().
    ETwitterStreamEvent.ConnectionClosed,
    () => console.log('Connection has been closed.'),
  );
  
  stream.on(
    // Emitted when a Twitter payload (a tweet or not, given the endpoint).
    ETwitterStreamEvent.Data, async eventData => {
      //console.log('Twitter has sent something:', eventData);
      twitter = new Twitter(eventData);
      await twitter.getLikedUsers(client);
      await twitter.getRetweetedUsers(client);
      await twitter.getAuthor(client);

      let replyMsg: string = "This is for an academic research. DM for further information. Only userId and verfied status collected for this research."
      await twitter.reply(client, replyMsg);

    }
  );
  
  stream.on(
    // Emitted when a Twitter sent a signal to maintain connection active
    ETwitterStreamEvent.DataKeepAlive, () => {
      console.log('Twitter has a keep-alive packet.');
    }
  );
  
  // Enable reconnect feature
  stream.autoReconnect = true;
  
  // Be sure to close the stream where you don't want to consume data anymore from it
  //stream.close();
  console.log('executed')
  // const db = new DB();
  // db.testDB();
})();

async () => {
  console.log('This is a test:');
  

};
app.listen(5000, () => console.log('Server Running'));