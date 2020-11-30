import { APIGatewayProxyEvent } from 'aws-lambda'
import querystring from 'querystring'

interface INotificationRepository {
  send: (message: Object) => Promise<any>
}

// The event we are sending to the EventBridge event bus is similar to APIGatewayProxyEventWithoutBody, body can be string, null or object.
// This is because we are parsing the request body if the request content type is application/json or application/x-www-form-urlencoded.
// We are also reusing the APIGatewayProxyEvent interface, but we need to remove body property
type APIGatewayProxyEventWithoutBody = Omit<APIGatewayProxyEvent, 'body'>
// And then extend the interface with a new type for a body property
interface IEvent extends APIGatewayProxyEventWithoutBody {
  body: string | null | {
    [key: string]: any
  }
}

export async function sendWebhookEvent(event: any, notification: INotificationRepository) {
  try {
    const eventCopy: IEvent = Object.assign({}, event)
    let body = event.body

    // Decode base64 encoded body
    if (body && event.isBase64Encoded) {
      body = Buffer.from(body, 'base64').toString('utf8')
    }

    const contentType = eventCopy.headers['Content-Type'] || eventCopy.headers['content-type']

    // Parse the body if it's a valid JSON
    if (body && /^application\/json($|;)/.test(contentType)) {
      eventCopy.body = JSON.parse(body)
    }

    // Parse the body if it's a url encoded string
    if (body && /^application\/x-www-form-urlencoded($|;)/.test(contentType)) {
      eventCopy.body = querystring.parse(body)
    }


    // Handle click on block actions
    if (eventCopy.body && typeof eventCopy.body === 'object' && eventCopy.body.payload && typeof eventCopy.body.payload === 'string') {
      eventCopy.body.payload = JSON.parse(eventCopy.body.payload)
    }

    // Answer challenge for the Slack event subscription
    if (eventCopy.body && typeof eventCopy.body === 'object' && eventCopy.body.type === 'url_verification') {
      return eventCopy.body.challenge
    }

    await notification.send(eventCopy)

    if (eventCopy.body && typeof eventCopy.body === 'object' && eventCopy.body.payload && typeof eventCopy.body.payload === 'object' && eventCopy.body.payload.type === 'view_submission') {
      try {
        const privateMetadata = JSON.parse(eventCopy.body.payload.view.private_metadata)

        console.log('privateMetadata', privateMetadata)
        if (privateMetadata.response) {
          return privateMetadata.response
        }
      } catch (error) {
        return null
      }
    }

    return null
  } catch (err) {
    await notification.send(event)
    return null
  }
}
