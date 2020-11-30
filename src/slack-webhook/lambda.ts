// Allow CloudWatch to read source maps
import 'source-map-support/register'

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import { EventBridgeRepository } from '../common/event-bridge-repository'
import { sendWebhookEvent } from './lib/main'

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  console.log('event: ', JSON.stringify(event))

  const eventBusName = process.env.EVENT_BUS_NAME
  const eventSource = process.env.EVENT_SOURCE

  if (!eventBusName) {
    throw new Error('Webhook URL is required as "process.env.EVENT_BUS_NAME"')
  }

  if (!eventSource) {
    throw new Error('Event source is required as "process.env.EVENT_SOURCE"')
  }

  const notification = new EventBridgeRepository(eventBusName, eventSource)
  const body = await sendWebhookEvent(event, notification)

  return {
    statusCode: body ? 200 : 204,
    headers: {
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : '',
  }
}
