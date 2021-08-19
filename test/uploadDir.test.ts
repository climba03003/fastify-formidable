import Fastify from 'fastify'
import * as fs from 'fs'
import * as path from 'path'
import FastifyFormidable from '../lib'

const uploadDir = path.resolve('tmp')

describe('uploadDir', function () {
  test('create', async function () {
    const fastify = Fastify()
    await fastify.register(FastifyFormidable, {
      formidable: {
        uploadDir
      }
    })

    const stat = await fs.promises.lstat(uploadDir)
    expect(stat.isDirectory()).toStrictEqual(true)
  })

  afterEach(async function () {
    // clean up
    await fs.promises.rmdir(uploadDir)
  })
})
