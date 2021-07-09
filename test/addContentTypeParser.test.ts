import Fastify, { FastifyInstance } from 'fastify'
import * as fs from 'fs'
import { AddressInfo } from 'net'
import * as path from 'path'
import FastifyFormidable from '../lib'
import { request } from './request'
import FormData = require('form-data')

const filePath = path.join(__dirname, '../package.json')

describe('addContentTypeParser', function () {
  let fastify: FastifyInstance

  beforeEach(async function () {
    fastify = Fastify()
    await fastify.register(FastifyFormidable, {
      addContentTypeParser: true
    })

    fastify.post<{ Body: { foo: String, file: string } }>('/', async function (request, reply) {
      return await reply.code(200).send({
        body: request.body,
        files: request.files
      })
    })

    await fastify.listen(0)
  })

  test('single file', async function () {
    const form = new FormData()
    form.append('foo', 'bar')
    form.append('file', fs.createReadStream(filePath))

    const response = await request(`http://localhost:${(fastify.server.address() as AddressInfo).port}`, form)

    expect(response.status).toStrictEqual(200)

    const json = await response.json()

    expect(json.body.foo).toStrictEqual('bar')
    expect(/upload_/.test(json.body.file)).toStrictEqual(true)
    expect(json.files.file).toBeDefined()
    expect(json.files.file.name).toStrictEqual('package.json')
  })

  afterEach(async function () {
    await fastify.close()
  })
})
