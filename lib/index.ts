import { Ajv } from 'ajv'
import { FastifyPluginAsync, FastifyRequest } from 'fastify'
import FastifyPlugin from 'fastify-plugin'
import { Fields, File, Files, IncomingForm, Options } from 'formidable'
import Formidable from 'formidable/Formidable'
import { IncomingMessage } from 'http'
const kIsMultipart = Symbol.for('[isMultipart]')

declare module 'fastify' {
  interface FastifyRequest {
    files: Files | null
    parseMultipart: <Payload = Fields>(this: FastifyRequest, options?: Options) => Promise<Payload>
    [kIsMultipart]: boolean
  }
}

export interface FastifyFormidableOptions {
  addContentTypeParser?: boolean
  addHooks?: boolean
  removeFilesFromBody?: boolean
  formidable?: Options
}

function promisify (func: Function): (request: IncomingMessage) => Promise<{ fields: Fields, files: Files }> {
  return async function (request: IncomingMessage): Promise<{ fields: Fields, files: Files }> {
    return await new Promise(function (resolve, reject) {
      func(request, function (err: any, fields: Fields, files: Files) {
        if (err as true) reject(err)
        resolve({ fields, files })
      })
    })
  }
}

function buildRequestParser (formidable: Formidable): (request: FastifyRequest, options?: Pick<FastifyFormidableOptions, 'removeFilesFromBody'>) => Promise<{ body: Fields, files: Files }> {
  const parse = promisify(formidable.parse.bind(formidable))
  return async function (request: FastifyRequest, options?: Pick<FastifyFormidableOptions, 'removeFilesFromBody'>): Promise<{ body: Fields, files: Files }> {
    const { fields, files } = await parse(request.raw)

    const body = Object.assign({}, fields)
    if (options?.removeFilesFromBody !== true) {
      Object.keys(files).forEach(function (key) {
        (body as any)[key] = Array.isArray(files[key])
          ? (files[key] as File[]).map(function (file) {
              return file.path
            })
          : (files[key] as File).path
      })
    }

    return { body, files }
  }
}

const plugin: FastifyPluginAsync<FastifyFormidableOptions> = async function (fastify, options) {
  const formidable = new IncomingForm(options.formidable)

  fastify.decorateRequest(kIsMultipart, false)
  fastify.decorateRequest('files', null)

  fastify.decorateRequest('parseMultipart', async function (this: FastifyRequest, decoratorOptions?: Options) {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const request = this

    let requestFormidable = formidable

    if (typeof decoratorOptions === 'object' && decoratorOptions !== null && !Array.isArray(decoratorOptions)) {
      requestFormidable = new IncomingForm(decoratorOptions)
    }

    const parser = buildRequestParser(requestFormidable)
    const { body, files } = await parser(request, { removeFilesFromBody: options.removeFilesFromBody })
    request.body = body
    request.files = files

    return body
  })

  if (options.addContentTypeParser === true && options.addHooks === true) {
    throw new Error('Cannot enable `addContentTypeParser` togather with `addHooks`')
  }

  if (options.addContentTypeParser === true) {
    fastify.addContentTypeParser('multipart', async function (request: FastifyRequest) {
      request[kIsMultipart] = true
      const parse = buildRequestParser(formidable)
      const { body, files } = await parse(request)
      request.files = files
      return body
    })
  } else {
    fastify.addContentTypeParser('multipart', function (request, _, done) {
      request[kIsMultipart] = true
      done(null)
    })
  }

  if (options.addHooks === true) {
    fastify.addHook('preValidation', async function (request: FastifyRequest) {
      // skip if it is not multipart
      if (!request[kIsMultipart]) return
      const parse = buildRequestParser(formidable)
      const { body, files } = await parse(request)
      request.body = body
      request.files = files
    })
  }

  if (options.removeFilesFromBody === true && (options.addHooks === true || options.addContentTypeParser === true)) {
    // we only remove after validation
    fastify.addHook('preHandler', function (request, reply, done) {
      if (request.files !== null) {
        const keys = Object.keys(request.files)
        keys.forEach(function (key) {
          // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
          delete (request.body as any)[key]
        })
      }
      done()
    })
  }
}

export const ajvBinaryFormat = function (ajv: Ajv): void {
  ajv.addFormat('binary', {
    type: 'string',
    validate (o: unknown) {
      // it must be string because we parse the file / binary and return the filepath
      return typeof o === 'string'
    }
  })
}
export const FastifyFormidable = FastifyPlugin(plugin, {
  fastify: '3.x',
  name: 'fastify-formidable',
  dependencies: []
})
export default FastifyFormidable
