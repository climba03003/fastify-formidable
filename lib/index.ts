import { Ajv } from 'ajv'
import { FastifyPluginAsync, FastifyRequest } from 'fastify'
import FastifyPlugin from 'fastify-plugin'
import { Fields, File, Files, IncomingForm, Options } from 'formidable'
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

    return await new Promise(function (resolve, reject) {
      // skip if it is not multipart
      if (!request[kIsMultipart]) return reject(new Error('Cannot handle non-multipart request'))
      requestFormidable.parse(request.raw, function (err, fields, files) {
        if (err as true) reject(err)
        request.body = Object.assign({}, fields)
        if (options.removeFilesFromBody !== true) {
          Object.keys(files).forEach(function (key) {
            (request.body as any)[key] = Array.isArray(files[key])
              ? (files[key] as File[]).map(function (file) {
                  return file.path
                })
              : (files[key] as File).path
          })
        }
        request.files = files
        resolve(request.body)
      })
    })
  })

  if (options.addContentTypeParser === true && options.addHooks === true) {
    throw new Error('Cannot enable `addContentTypeParser` togather with `addHooks`')
  }

  if (options.addContentTypeParser === true) {
    fastify.addContentTypeParser('multipart', function (request, _, done) {
      request[kIsMultipart] = true
      formidable.parse(request.raw, function (err, fields, files) {
        if (err as true) done(err)
        const body = Object.assign({}, fields)
        Object.keys(files).forEach(function (key) {
          (body as any)[key] = Array.isArray(files[key])
            ? (files[key] as File[]).map(function (file) {
                return file.path
              })
            : (files[key] as File).path
        })
        request.files = files
        done(null, body)
      })
    })
  } else {
    fastify.addContentTypeParser('multipart', function (request, _, done) {
      request[kIsMultipart] = true
      done(null)
    })
  }

  if (options.addHooks === true) {
    fastify.addHook('preValidation', function (request, reply, done) {
      // skip if it is not multipart
      if (!request[kIsMultipart]) return done()

      formidable.parse(request.raw, function (err, fields, files) {
        if (err as true) done(err)
        request.body = Object.assign({}, fields)
        Object.keys(files).forEach(function (key) {
          (request.body as any)[key] = Array.isArray(files[key])
            ? (files[key] as File[]).map(function (file) {
                return file.path
              })
            : (files[key] as File).path
        })
        request.files = files
        done()
      })
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
