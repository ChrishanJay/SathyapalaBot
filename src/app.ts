import express from 'express';
import dotenv from 'dotenv';
import { Twitter } from './twitter';

const PORT = process.env.PORT || 3001
dotenv.config();
const app = express();
let twitter: Twitter;

app.get('/', (req, res) => {
    res.send('Hello');
});

const IDS: string = process.env.DATA_CRAWLER_IDS as string;
const {TwitterApi, ETwitterStreamEvent} = require('twitter-api-v2');

const DATA_CRAWLER_IDS = JSON.parse(IDS);

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
    (    err: any) => console.log('Connection error!', err),
  );
  
  stream.on(
    // Emitted when Node.js {response} is closed by remote or using .close().
    ETwitterStreamEvent.ConnectionClosed,
    () => console.log('Connection has been closed.'),
  );
  
  stream.on(
    // Emitted when a Twitter payload (a tweet or not, given the endpoint).
    ETwitterStreamEvent.Data, async (eventData: any) => {
      //console.log('Twitter has sent something:', eventData);
      twitter = new Twitter(eventData);
      console.log("Requester :" + twitter.requester);
      
      if(DATA_CRAWLER_IDS.includes(twitter.requester)) {
        // Feeding the system through approved feeders
        await twitter.getLikedUsers(client);
        await twitter.getRetweetedUsers(client);
        await twitter.getAuthor(client);

        let replyMsg: string = "Hello there! This is an academic research. DM for further information. Only userId and verfied status collected for this research."
        await twitter.reply(client, replyMsg);

      } else {
        console.log('Not an Approved Feeder');
        
        let splitText = twitter.text.split(" ", 2);
        if (splitText[1].toUpperCase() === 'TRUE') {
          // Reject non approved data feeders
          
          console.log("Not an approved data feeder.");
          let replyMsg: string = "Hello there! Sorry, you are not an approved data feeder for the research."
          await twitter.reply(client, replyMsg);
        } else {
          // 3rd party requester
          console.log('Requesting');
          
          twitter.calculateScore(client);
          

        }
      }
      
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

})();

app.listen(PORT, () => console.log('Server Running on port: ', PORT));