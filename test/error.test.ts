import Fastify from 'fastify'
import { IncomingForm } from 'formidable'
import * as fs from 'fs'
import { AddressInfo } from 'net'
import * as path from 'path'
import t from 'tap'
import FastifyFormidable from '../lib'
import { createFastify, fastifyOptions } from './createFastify'
import { request } from './request'
import FormData = require('form-data')

const filePath = path.join(__dirname, '../package.json')

t.plan(1)
t.test('error', function (t) {
  t.plan(2)

  t.test('`addContentTypeParser` and `addHooks`', async function (t) {
    t.plan(2)

    try {
      await createFastify(t, { addHooks: true, addContentTypeParser: true })
      // should not get here
      t.fail()
    } catch (err: any) {
      t.ok(err)
      t.equal(err.message, 'Cannot enable `addContentTypeParser` togather with `addHooks`')
    }
  })

  t.test('parse error', async function (t) {
    t.plan(1)

    const fastify = Fastify(fastifyOptions)

    t.teardown(fastify.close)

    const formidable = new IncomingForm()
    formidable.parse = function (_, callback: Function) {
      callback(new Error('parse error'))
    }

    await fastify.register(FastifyFormidable, {
      formidable: formidable as any
    })

    fastify.post<{ Body: { foo: String, file: string } }>('/', async function (request, reply) {
      const body = await request.parseMultipart()
      return await reply.code(200).send({
        body: body,
        files: request.files
      })
    })

    await fastify.listen(0)

    const form = new FormData()
    form.append('foo', 'bar')
    form.append('file', fs.createReadStream(filePath))

    const response = await request(`http://localhost:${(fastify.server.address() as AddressInfo).port}`, form)

    t.equal(response.status, 500)
  })
})
