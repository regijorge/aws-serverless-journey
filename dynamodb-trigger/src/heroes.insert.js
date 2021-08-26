const uuid = require('uuid')
const Joi = require('@hapi/joi')
const decoratorValidator = require('./util/decoratorValidator')
const globalEnum = require('./util/globalEnum')

class Handler {
  constructor ({ dynamoDbScv }) {
    this.dynamoDbScv = dynamoDbScv
    this.dynamoDbTable = process.env.DYNAMODB_TABLE
  }

  static validator () {
    return Joi.object({
      nome: Joi.string().max(100).min(2).required(),
      poder: Joi.string().max(20).required()
    })
  }

  async insertItem (params) {
    return this.dynamoDbScv.put(params).promise()
  }

  prepareData (data) {
    const params = {
      TableName: this.dynamoDbTable,
      Item: {
        ...data,
        id: uuid.v1(),
        createdAt: new Date().toISOString()
      }
    }

    return params
  }

  handlerSuccess (data) {
    return {
      statusCode: 200,
      body: JSON.stringify(data)
    }
  }

  handlerError (data) {
    return {
      statusCode: data.statusCode || 500,
      headers: { 'Content-Type': 'text/plain' },
      body: 'Could not create item!'
    }
  }

  async main (event) {
    try {
      const dbParams = this.prepareData(event.body)

      await this.insertItem(dbParams)
      return this.handlerSuccess(dbParams.Item)
    } catch (err) {
      console.error('Error', err.stack)
      return this.handlerError({ statusCode: 500 })
    }
  }
}

// factory
const AWS = require('aws-sdk')
const dynamoDB = new AWS.DynamoDB.DocumentClient()

const handler = new Handler({
  dynamoDbScv: dynamoDB
})

module.exports = decoratorValidator(
  handler.main.bind(handler),
  Handler.validator(),
  globalEnum.ARG_TYPE.BODY
)
