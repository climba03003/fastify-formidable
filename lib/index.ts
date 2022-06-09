import { FastifyPluginAsync, FastifyRequest } from 'fastify'
import FastifyPlugin from 'fastify-plugin'
import { Fields, File, Files, IncomingForm, Options } from 'formidable'
import Formidable from 'formidable/Formidable'
import * as fs from 'fs'
import { IncomingMessage } from 'http'
export const kIsMultipart = Symbol.for('[FastifyMultipart.isMultipart]')
export const kIsMultipartParsed = Symbol.for('[FastifyMultipart.isMultipartParsed]')
export const kFileSavedPaths = Symbol.for('[FastifyMultipart.fileSavedPaths]')

declare module 'fastify' {
  interface FastifyRequest {
    files: Files | null
    parseMultipart: <Payload = Fields>(this: FastifyRequest, options?: Options) => Promise<Payload>
    [kIsMultipart]: boolean
    [kIsMultipartParsed]: boolean
    [kFileSavedPaths]: string[]
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
    if (request[kIsMultipartParsed]) {
      request.log.warn('multipart already parsed, you probably need to check your code why it is parsed twice.')
      return { body: request.body as Fields, files: request.files as Files }
    }
    const { fields, files } = await parse(request.raw)
    request[kFileSavedPaths] = []

    const body = Object.assign({}, fields)
    Object.keys(files).forEach(function (key) {
      const paths = Array.isArray(files[key])
        ? (files[key] as File[]).map(function (file) {
            return file.path
          })
        : (files[key] as File).path
      if (options?.removeFilesFromBody !== true) (body as any)[key] = paths
      request[kFileSavedPaths].push(...paths)
    })

    request[kIsMultipartParsed] = true
    return { body, files }
  }
}

const plugin: FastifyPluginAsync<FastifyFormidableOptions> = async function (fastify, options) {
  // create upload folder when not exist
  if (typeof options.formidable?.uploadDir === 'string') {
    await fs.promises.mkdir(options.formidable.uploadDir, { recursive: true })
  }

  const formidable = options.formidable instanceof IncomingForm ? options.formidable : new IncomingForm(options.formidable)

  fastify.decorateRequest(kIsMultipart, false)
  fastify.decorateRequest(kIsMultipartParsed, false)
  fastify.decorateRequest(kFileSavedPaths, null)
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
    fastify.addContentTypeParser('multipart', async function (request: FastifyRequest, _payload: any) {
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
    fastify.addHook('preHandler', function (request, _reply, done) {
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

// we do not require this function anymore but we keep it
// we treat ajv to any because we do not want to deal with the ajv@6 and ajv@8 typing problem
export const ajvBinaryFormat = function (ajv: any): void {
  ajv.addFormat('binary', {
    type: 'string',
    validate (o: unknown) {
      // it must be string because we parse the file / binary and return the filepath
      return typeof o === 'string'
    }
  })
}
export const FastifyFormidable = FastifyPlugin(plugin, {
  fastify: '4.x',
  name: 'fastify-formidable',
  dependencies: []
})
export default FastifyFormidable
