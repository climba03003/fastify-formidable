import * as fs from 'fs'
import { type AddressInfo } from 'net'
import * as path from 'path'
import t from 'tap'
import { createFastify } from './createFastify'
import { request, requestJSON } from './request'
import FormData = require('form-data')

const filePath = path.join(__dirname, '../package.json')

t.plan(1)
t.test('addHooks', function (t) {
  t.plan(3)

  t.test('single file', async function (t) {
    t.plan(5)

    const fastify = await createFastify(t, { addHooks: true })

    const form = new FormData()
    form.append('foo', 'bar')
    form.append('file', fs.createReadStream(filePath))

    const response = await request(`http://localhost:${(fastify.server.address() as AddressInfo).port}`, form)

    t.equal(response.status, 200)

    const json = await response.json()

    t.equal(json.body.foo, 'bar')
    t.equal(/[0-9a-f]{25}/.test(json.body.file), true)
    t.ok(json.files.file)
    t.equal(json.files.file.originalFilename, 'package.json')
  })

  t.test('multiple files', async function (t) {
    t.plan(6)

    const fastify = await createFastify(t, { addHooks: true, formidable: { multiples: true } })

    const form = new FormData()
    form.append('foo', 'bar')
    form.append('file', fs.createReadStream(filePath))
    form.append('file', fs.createReadStream(filePath))

    const response = await request(`http://localhost:${(fastify.server.address() as AddressInfo).port}`, form)

    t.equal(response.status, 200)

    const json = await response.json()

    t.equal(json.body.foo, 'bar')
    t.equal(Array.isArray(json.body.file), true)
    t.ok(json.files.file)
    t.equal(json.files.file[0].originalFilename, 'package.json')
    t.equal(json.files.file[1].originalFilename, 'package.json')
  })

  t.test('non-multipart', async function (t) {
    t.plan(3)

    const fastify = await createFastify(t, { addHooks: true, removeFilesFromBody: true })

    const response = await requestJSON(`http://localhost:${(fastify.server.address() as AddressInfo).port}`, {
      foo: 'bar'
    } as any)

    t.equal(response.status, 200)

    const json = await response.json()

    t.equal(json.body.foo, 'bar')
    t.equal(json.files, null)
  })
})
