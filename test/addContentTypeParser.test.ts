import * as fs from 'fs'
import { AddressInfo } from 'net'
import * as path from 'path'
import { createFastify } from './createFastify'
import { request } from './request'
import FormData = require('form-data')

const filePath = path.join(__dirname, '../package.json')

describe('addContentTypeParser', function () {
  test('single file', async function () {
    const fastify = await createFastify({ addContentTypeParser: true })

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

    await fastify.close()
  })

  test('multiple files', async function () {
    const fastify = await createFastify({ addContentTypeParser: true, formidable: { multiples: true } })

    const form = new FormData()
    form.append('foo', 'bar')
    form.append('file', fs.createReadStream(filePath))
    form.append('file', fs.createReadStream(filePath))

    const response = await request(`http://localhost:${(fastify.server.address() as AddressInfo).port}`, form)

    expect(response.status).toStrictEqual(200)

    const json = await response.json()

    expect(json.body.foo).toStrictEqual('bar')
    expect(Array.isArray(json.body.file)).toStrictEqual(true)
    expect(json.files.file).toBeDefined()
    expect(json.files.file[0].name).toStrictEqual('package.json')
    expect(json.files.file[1].name).toStrictEqual('package.json')

    await fastify.close()
  })
})
