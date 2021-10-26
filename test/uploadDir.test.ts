import Fastify from 'fastify'
import * as fs from 'fs'
import * as path from 'path'
import t from 'tap'
import FastifyFormidable from '../lib'

const uploadDir = path.resolve('tmp')

t.plan(1)
t.test('uploadDir', function (t) {
  t.plan(1)

  t.test('create', async function (t) {
    t.plan(1)

    const fastify = Fastify()
    await fastify.register(FastifyFormidable, {
      formidable: {
        uploadDir
      }
    })

    const stat = await fs.promises.lstat(uploadDir)
    t.equal(stat.isDirectory(), true)

    t.teardown(async function () {
    // clean up
      await fs.promises.rmdir(uploadDir)
    })
  })
})
