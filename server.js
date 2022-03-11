const http = require('http')
const path = require('path')
const express = require('express')
const socketIO = require('socket.io')

const needle = require('needle')
const config = require('dotenv').config()
const TOKEN = process.env.BEARER_TOKEN
const PORT = process.env.PORT || 3000

const app = express()

const server = http.createServer(app)
const io = socketIO(server)

const rulesURL = 'https://api.twitter.com/2/tweets/search/stream/rules'
const streamURL = 'https://api.twitter.com/2/tweets/search/stream?tweet.fields=created_at,public_metrics&expansions=author_id'


const rules = [{
  value: '#අපිතමාහොඳටමකලේ'
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

  return response.body
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

function streamTweets() {
  const stream = needle.get(streamURL, {
    headers: {
      Authorization: `Bearer ${TOKEN}`
    }
  })

  stream.on('data', (data) => {
    try {
      const json = JSON.parse(data)
      console.log(json)
    } catch (error) {

    }
  })

}

(async () => {
  let currentRules

  try {
    // Get all stream rules
    currentRules = await getRules()

    console.log(currentRules)
    // Delete all stream rules
    await deleteRules(currentRules)

    // Set rules based on array above
    await setRules()
    console.log('########################')
  } catch (error) {
    console.log(error)
    process.exit(1)
  }

  streamTweets()
})()
