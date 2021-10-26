import * as fs from 'fs'
import { AddressInfo } from 'net'
import * as path from 'path'
import t from 'tap'
import { createIntegrationFastify } from './createFastify'
import { request } from './request'
import FormData = require('form-data')

const filePath = path.join(__dirname, '../package.json')

t.plan(1)
t.test('integration', function (t) {
  t.plan(2)

  t.test('single file', async function (t) {
    t.plan(5)

    const fastify = await createIntegrationFastify(t, { addContentTypeParser: true }, {
      body: {
        type: 'object',
        properties: {
          foo: { type: 'string' },
          file: { type: 'string', format: 'binary' }
        }
      }
    })

    const form = new FormData()
    form.append('foo', 'bar')
    form.append('file', fs.createReadStream(filePath))

    const response = await request(`http://localhost:${(fastify.server.address() as AddressInfo).port}`, form)

    t.equal(response.status, 200)

    const json = await response.json()

    t.equal(json.body.foo, 'bar')
    t.equal(/upload_/.test(json.body.file), true)
    t.ok(json.files.file)
    t.equal(json.files.file.name, 'package.json')
  })

  t.test('multiple files', async function (t) {
    t.plan(6)

    const fastify = await createIntegrationFastify(t, { addContentTypeParser: true, formidable: { multiples: true } }, {
      body: {
        type: 'object',
        properties: {
          foo: { type: 'string' },
          file: { type: 'array', items: { type: 'string', format: 'binary' } }
        }
      }
    })

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
    t.equal(json.files.file[0].name, 'package.json')
    t.equal(json.files.file[1].name, 'package.json')
  })
})
