const http = require('http')
const path = require('path')
const express = require('express')
const socketIO = require('socket.io')
const mysql = require('mysql2')

const needle = require('needle')
const config = require('dotenv').config()
const TOKEN = process.env.BEARER_TOKEN
const PORT = process.env.PORT || 3001

const db = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '0112232228',
  database: 'SathyapalaDB'
})

const app = express()

const server = http.createServer(app)
const io = socketIO(server)

app.get('/', (req, res) => {
  res.sendFile(path.resolve(__dirname, '../', 'client', 'index.html'))
})

const rulesURL = 'https://api.twitter.com/2/tweets/search/stream/rules'
const streamURL = 'https://api.twitter.com/2/tweets/search/stream?tweet.fields=author_id,referenced_tweets&expansions=referenced_tweets.id.author_id'

//value: '@SathyapalaBot -is:reply'
const rules = [{
  value: '@SathyapalaBot'
}]

// Get Stream Rules
async function getRules() {
  const response = await needle('get', rulesURL, {
    headers: {
      Authorization: `Bearer ${TOKEN}`
    }
  })

  return response.body
}

// Set Stream Rules
async function setRules() {
  const data = {
    add: rules
  }

  const response = await needle('post', rulesURL, data, {
    headers: {
      'content-type': 'application/json',
      Authorization: `Bearer ${TOKEN}`
    }
  })

  console.log(response.body)
}

// Delete Stream Rules
async function deleteRules(rules) {
  if (!Array.isArray(rules.data)) {
    return null
  }
  const ids = rules.data.map((rule) => rule.id)
  const data = {
    delete: {
      ids: ids
    }
  }

  const response = await needle('post', rulesURL, data, {
    headers: {
      'content-type': 'application/json',
      Authorization: `Bearer ${TOKEN}`
    }
  })

  return response.body
}

function streamTweets(socket) {
  const stream = needle.get(streamURL, {
    headers: {
      Authorization: `Bearer ${TOKEN}`
    }
  })

  stream.on('data', data => {
    try {

      const json = JSON.parse(data)
      console.log(json.data)
      getTweetInfo(json)
      //socket.emit('tweet', json)
    } catch (error) {
      if (data.detail === "This stream is currently at the maximum allowed connection limit.") {
        console.log(data.detail)
        process.exit(1)
      } else {
        console.log("Catch Error: " + error)
        console.log("Catch Error: " + data)
      }
    }
  }).on('err', error => {
    if (error.code !== 'ECONNRESET') {
      console.log(error.code);
      process.exit(1);
    } else {
      console.log(error)
    }
  });
}

async function getTweetInfo(json) {

  // Author IDs for Training
  // SathyapalaBot - 907886923678711809
  // ChrishaJay - 2459987869

  const text = json.data.text
  console.log(text)
  const requester = json.data.author_id
  const refTweet = json.data.referenced_tweets[0]

  const retweetedByURL = `https://api.twitter.com/2/tweets/${refTweet.id}/retweeted_by`
  const likedURL = `https://api.twitter.com/2/tweets/${refTweet.id}/liking_users`
  const tweetInfoURL = `https://api.twitter.com/2/tweets/${refTweet.id}?tweet.fields=author_id,public_metrics`

  const retweetResponse = await needle('get', retweetedByURL, {
    headers: {
      Authorization: `Bearer ${TOKEN}`
    }
  })

  console.log("********** Retweet ***************")
  console.log(retweetResponse.body)

  const likeResponse = await needle('get', likedURL, {
    headers: {
      Authorization: `Bearer ${TOKEN}`
    }
  })

  console.log("********** Like ***************")
  console.log(likeResponse.body)

  const infoResponse = await needle('get', tweetInfoURL, {
    headers: {
      Authorization: `Bearer ${TOKEN}`
    }
  })

  console.log("********** Info ***************")
  const tweetInfo = infoResponse.body.data
  console.log(tweetInfo)


  const authorInfoURL = `https://api.twitter.com/2/users/${tweetInfo.author_id}?user.fields=verified,username`
  const authorInfoResponse = await needle('get', authorInfoURL, {
    headers: {
      Authorization: `Bearer ${TOKEN}`
    }
  })

  console.log("********** Author ***************")
  console.log(authorInfoResponse.body)

  var isGenuine = text.toUpperCase().includes('TRUE')

  insertUsers(tweetInfo.id.toString(), tweetInfo.author_id.toString(), 1, authorInfoResponse.body.data.verified, 0, 0, isGenuine)
}

async function insertUsers(tweetId, userId, isAuthor = 0, isVerified = 0, isRetweet = 0, isLike = 0, isGenuine = 0) {

  console.log("****** Values Start *******")
  console.log("Tweet ID : " + tweetId)
  console.log("User ID : " + userId)
  console.log("IsAuthor : " + isAuthor)
  console.log("isVerified : " + isVerified)
  console.log("isRetweet : " + isRetweet)
  console.log("isLike : " + isLike)
  console.log("isGenuine: " + isGenuine)
  console.log("****** Values End *******")

  const sqlInsert = "INSERT INTO users (tweet_id, user_id, is_author, is_verified, is_retweet, is_like, is_genuine) values (?,?,?,?,?,?,?)"
  db.query(sqlInsert, [tweetId, userId, isAuthor, isVerified, isRetweet, isLike, isGenuine], (error, result) => {
    console.log("Result : " + result)
    console.log("Error : " + error)
  })
}

io.on('connection', async () => {
  console.log('Client Connected...')

  let currentRules
  try {
    // Get all stream rules
    currentRules = await getRules()

    //console.log(currentRules)
    // Delete all stream rules
    await deleteRules(currentRules)

    // Set rules based on array above
    await setRules()
  } catch (error) {
    console.log(error)
    process.exit(1)
  }

  streamTweets(io)
})

server.listen(PORT, () => console.log(`Listening on port ${PORT}`))
