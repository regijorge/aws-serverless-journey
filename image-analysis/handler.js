// yarn sls invoke local -f func --path request.json (run from local)
// yarn sls invoke -f func --log (run from cloud)

const axios = require('axios')

class Handler {
	constructor ({ rekoSvc, translateSvc }) {
		this.rekoSvc = rekoSvc
		this.translateSvc = translateSvc
	}

	async detectImageLabel (buffer) {
		const result = await this.rekoSvc.detectLabels({
			Image: {
				Bytes: buffer
			}
		}).promise()

		const workingItems = result.Labels.filter(({ Confidence }) => Confidence > 50)
		const names = workingItems.map(({ Name }) => Name).join(',')

		return { names, workingItems }
	}

	async translateText (text) {
		const params = {
			SourceLanguageCode: 'en',
			TargetLanguageCode: 'pt',
			Text: text
		}

		const { TranslatedText } = await this.translateSvc.translateText(params).promise()
		
		return TranslatedText.split(', ')
	}

	formatTextResults (texts, workingItems) {
		const finalText = []
		for (const indexText in texts) {
			const nameInPortuguese = texts[indexText]
			const confidence = workingItems[indexText].Confidence
			finalText.push(` ${confidence.toFixed(2)}% de ser do tipo ${nameInPortuguese}`)
		}

		return finalText.join('\n')
	}

	async getImageBuffer (imgUrl) {
		const response = await axios.get(imgUrl, {
			responseType: 'arraybuffer'
		})

		const buffer = Buffer.from(response.data, 'base64')
		return buffer
	}

	async main (event) {
		try {
			const { imgUrl } = event.queryStringParameters

			console.log('Downloading image...')
			const imgBuffer = await this.getImageBuffer(imgUrl)

			console.log('Detecting labels...')
			const { names, workingItems } = await this.detectImageLabel(imgBuffer)

			console.log('Translating to pt-br...')
			const texts = await this.translateText(names)

			const finalText = this.formatTextResults(texts, workingItems)

			console.log('Finishing...')

			return {
				statusCode: 200,
				body: `A imagem tem\n ${finalText}`
			}
		} catch (err) {
			console.error('Error', err.stack)
			return {
				statusCode: 500,
				body: 'Internal Serer Error'
			}
		}
	}
}

// factory 
const aws = require('aws-sdk')
const reko = new aws.Rekognition()
const translator = new aws.Translate()

const handler = new Handler({
	rekoSvc: reko,
	translateSvc: translator
})

module.exports.main = handler.main.bind(handler)