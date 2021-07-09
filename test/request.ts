import * as stream from 'stream'
import undici from 'undici'
import * as util from 'util'
import FormData = require('form-data')
const pump = util.promisify(stream.pipeline)

async function resolve (source: any): Promise<string> {
  let data = ''
  await pump(source, new stream.Transform({
    write (chunk: Buffer, _, done) {
      data += chunk.toString()
      done()
    }
  }))
  return data
}

export async function request (url: string, formData: FormData): Promise<{ status: number, body: string, json: () => any }> {
  const requestBody = await resolve(formData)

  const response = await undici.request(url, {
    method: 'POST',
    body: requestBody,
    headers: formData.getHeaders()
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
