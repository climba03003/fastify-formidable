import Fastify, { FastifyInstance } from 'fastify'
import * as fs from 'fs'
import { AddressInfo } from 'net'
import * as path from 'path'
import FastifyFormidable from '../lib'
import { fastifyOptions } from './createFastify'
import { request } from './request'
import FormData = require('form-data')

const filePath = path.join(__dirname, '../package.json')

describe('removeFilesFromBody', function () {
  let fastify: FastifyInstance

  test('with addContentTypeParser', async function () {
    fastify = Fastify(fastifyOptions)
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

    expect(response.status).toStrictEqual(200)

    const json = await response.json()

    expect(json.body.foo).toStrictEqual('bar')
    expect(json.body.file).toBeUndefined()
    expect(json.files.file).toBeDefined()
    expect(json.files.file.name).toStrictEqual('package.json')
  })

  test('with addHooks', async function () {
    fastify = Fastify(fastifyOptions)
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

    expect(response.status).toStrictEqual(200)

    const json = await response.json()

    expect(json.body.foo).toStrictEqual('bar')
    expect(json.body.file).toBeUndefined()
    expect(json.files.file).toBeDefined()
    expect(json.files.file.name).toStrictEqual('package.json')
  })

  test('with parseMultipart', async function () {
    fastify = Fastify(fastifyOptions)
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

    expect(response.status).toStrictEqual(200)

    const json = await response.json()

    expect(json.body.foo).toStrictEqual('bar')
    expect(json.body.file).toBeUndefined()
    expect(json.files.file).toBeDefined()
    expect(json.files.file.name).toStrictEqual('package.json')
  })

  afterEach(async function () {
    await fastify.close()
  })
})
