import undici, { Agent } from 'undici'
import FormData = require('form-data')

async function resolve (source: any): Promise<string> {
  return await new Promise(function (resolve) {
    let data = ''
    source.on('data', function (chunk: Buffer) {
      data += chunk.toString()
    })
    source.once('end', function () {
      resolve(data)
    })
    source.resume()
  })
}

const dispatcher = new Agent({
  keepAliveTimeout: 10,
  keepAliveMaxTimeout: 10
})

export async function request (url: string, formData: FormData): Promise<{ status: number, body: string, json: () => any }> {
  const requestBody = await resolve(formData)

  const response = await undici.request(url, {
    method: 'POST',
    body: requestBody,
    headers: formData.getHeaders(),
    dispatcher
  })

  const responseBody = await resolve(response.body)

  return {
    status: response.statusCode,
    body: responseBody,
    json () {
      return JSON.parse(responseBody)
    }
  }
}

export async function requestJSON (url: string, json: any): Promise<{ status: number, body: string, json: () => any }> {
  const response = await undici.request(url, {
    method: 'POST',
    body: JSON.stringify(json),
    headers: {
      'content-type': 'application/json'
    },
    dispatcher
  })

  const responseBody = await resolve(response.body)

  return {
    status: response.statusCode,
    body: responseBody,
    json () {
      return JSON.parse(responseBody)
    }
  }
}
