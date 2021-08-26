const axios = require('axios')
const cheerio = require('cheerio')
const uuid = require('uuid')

const AWS = require('aws-sdk')
const dynamoDB = new AWS.DynamoDB.DocumentClient()

const settings = require('./config/settings')

class Handler {
  static async main (event) {
    console.log('at', new Date().toISOString())

    const { data } = await axios.get(settings.APICommitMessagesURL)
    const $ = cheerio.load(data)
    const [commitMessage] = $('#content').text().trim().split('\n')

    const params = {
      TableName: settings.DbTableName,
      Item: {
        commitMessage,
        id: uuid.v1(),
        createdAt: new Date().toISOString()
      }
    }
    await dynamoDB.put(params).promise()
    console.log(params.Item)

    return {
      statusCode: 200,
      body: 'OK'
    }
  }
}

module.exports = {
  scheduler: Handler.main
}
