import Fastify, { FastifyInstance } from 'fastify'
import fastifySwagger from 'fastify-swagger'
import { Options } from 'formidable'
import FastifyFormidable, { ajvBinaryFormat, FastifyFormidableOptions } from '../lib'

// reduce keep alive to prevent `undici` keep the socket open
export const fastifyOptions = { keepAliveTimeout: 100 }

export async function createFastify (options: FastifyFormidableOptions, inline: boolean | Options = false): Promise<FastifyInstance> {
  const fastify = Fastify(fastifyOptions)

  await fastify.register(FastifyFormidable, options)

  fastify.post<{ Body: { foo: String, file: string } }>('/', async function (request, reply) {
    if (inline === true) await request.parseMultipart()
    if (typeof inline === 'object') await request.parseMultipart(inline)
    return await reply.code(200).send({
      body: request.body,
      files: request.files
    })
  })

  await fastify.listen(0)

  return await fastify
}

export async function createIntegrationFastify (options: FastifyFormidableOptions, schema: any, inline: boolean = false): Promise<FastifyInstance> {
  const fastify = Fastify({
    ...fastifyOptions,
    ajv: {
      plugins: [ajvBinaryFormat]
    }
  })

  await fastify.register(FastifyFormidable, options)
  await fastify.register(fastifySwagger)

  fastify.post<{ Body: { foo: String, file: string } }>('/', {
    schema: schema
  }, async function (request, reply) {
    if (inline) await request.parseMultipart()
    return await reply.code(200).send({
      body: request.body,
      files: request.files
    })
  })

  await fastify.listen(0)

  return await fastify
}
