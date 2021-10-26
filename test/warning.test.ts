import Fastify from 'fastify'
import * as fs from 'fs'
import { AddressInfo } from 'net'
import * as path from 'path'
import t from 'tap'
import FastifyFormidable from '../lib'
import { fastifyOptions } from './createFastify'
import { request } from './request'
import FormData = require('form-data')

const filePath = path.join(__dirname, '../package.json')

t.plan(1)
t.test('warning', function (t) {
  t.plan(1)

  t.test('multipart already parsed', async function (t) {
    t.plan(6)

    const fastify = Fastify(fastifyOptions)

    t.teardown(fastify.close)

    await fastify.register(FastifyFormidable, {
      addContentTypeParser: true,
      removeFilesFromBody: true
    })

    fastify.post<{ Body: { foo: String, file: string } }>('/', {
      onRequest (request, _, done) {
        request.log = {
          warn (msg: string) {
            t.equal(msg, 'multipart already parsed, you probably need to check your code why it is parsed twice.')
          }
        } as any
        done()
      }
    }, async function (request, reply) {
      await request.parseMultipart()
      return await reply.code(200).send({
        body: request.body,
        files: request.files
      })
    })

    await fastify.listen(0)

    const form = new FormData()
    form.append('foo', 'bar')
    form.append('file', fs.createReadStream(filePath))

    const response = await request(`http://localhost:${(fastify.server.address() as AddressInfo).port}`, form)

    t.equal(response.status, 200)

    const json = await response.json()

    t.equal(json.body.foo, 'bar')
    t.notOk(json.body.file)
    t.ok(json.files.file)
    t.equal(json.files.file.name, 'package.json')
  })
})
