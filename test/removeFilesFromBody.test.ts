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
t.test('removeFilesFromBody', function (t) {
  t.plan(4)

  t.test('with addContentTypeParser', async function (t) {
    t.plan(5)

    const fastify = Fastify(fastifyOptions)

    t.teardown(fastify.close)

    await fastify.register(FastifyFormidable, {
      addContentTypeParser: true,
      removeFilesFromBody: true
    })

    fastify.post<{ Body: { foo: String, file: string } }>('/', async function (request, reply) {
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

  t.test('with addHooks', async function (t) {
    t.plan(5)

    const fastify = Fastify(fastifyOptions)

    t.teardown(fastify.close)

    await fastify.register(FastifyFormidable, {
      addHooks: true,
      removeFilesFromBody: true
    })

    fastify.post<{ Body: { foo: String, file: string } }>('/', async function (request, reply) {
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

  t.test('with parseMultipart', async function (t) {
    t.plan(5)

    const fastify = Fastify(fastifyOptions)

    t.teardown(fastify.close)

    await fastify.register(FastifyFormidable, {
      removeFilesFromBody: true
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

    t.equal(response.status, 200)

    const json = await response.json()

    t.equal(json.body.foo, 'bar')
    t.notOk(json.body.file)
    t.ok(json.files.file)
    t.equal(json.files.file.name, 'package.json')
  })

  t.test('no file', async function (t) {
    t.plan(4)

    const fastify = Fastify(fastifyOptions)

    t.teardown(fastify.close)

    await fastify.register(FastifyFormidable, {
      addContentTypeParser: true,
      removeFilesFromBody: true
    })

    fastify.post<{ Body: { foo: String, file: string } }>('/', async function (request, reply) {
      return await reply.code(200).send({
        body: request.body,
        files: request.files
      })
    })

    await fastify.listen(0)

    const form = new FormData()
    form.append('foo', 'bar')

    const response = await request(`http://localhost:${(fastify.server.address() as AddressInfo).port}`, form)

    t.equal(response.status, 200)

    const json = await response.json()

    t.equal(json.body.foo, 'bar')
    t.notOk(json.body.file)
    t.notOk(json.files.file)
  })
})
