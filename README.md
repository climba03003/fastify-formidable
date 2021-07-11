# fastify-formidable

[![Continuous Integration](https://github.com/climba03003/fastify-formidable/actions/workflows/ci.yml/badge.svg)](https://github.com/climba03003/fastify-formidable/actions/workflows/ci.yml)
[![Package Manager CI](https://github.com/climba03003/fastify-formidable/actions/workflows/package-manager-ci.yml/badge.svg)](https://github.com/climba03003/fastify-formidable/actions/workflows/package-manager-ci.yml)
[![NPM version](https://img.shields.io/npm/v/fastify-formidable.svg?style=flat)](https://www.npmjs.com/package/fastify-formidable)
[![GitHub package.json version](https://img.shields.io/github/package-json/v/climba03003/fastify-formidable)](https://github.com/climba03003/fastify-formidable)
[![Coverage Status](https://coveralls.io/repos/github/climba03003/fastify-formidable/badge.svg?branch=main)](https://coveralls.io/github/climba03003/fastify-formidable?branch=master)
[![GitHub](https://img.shields.io/github/license/climba03003/fastify-formidable)](https://github.com/climba03003/fastify-formidable)

This plugin add a handy parser for `multipart/form-data` by using `formidable` and provide a better integration between `multipart/form-data` and `fastify-swagger`

> Disclaimer: This plugin will work just fine for handling `multipart/form-data` and during the pre-release period (version under `1.0.0`) the API may changes a lot. Use it as your own risk for production before a stable version. I can only promises I will not change the API when it is not needed.

## Install
```
npm install fastify-formidable --save

yarn add fastify-formidable
```

## Usage

```ts
import FastifyFormidable from 'fastify-formidable'

fastify.register(FastifyFormidable)

fastify.post('/', async function(request, reply) {
  // you need to call the parser if you do not pass any option through plugin registration
  await request.parseMultipart()

  // access files
  request.files

  // access body
  // note that file fields will exist in body and it will becomes the file path saved on disk
  request.body
})

// add content type parser which will automatic parse all `multipart/form-data` found
fastify.register(FastifyFormidable, {
  addContentTypeParser: true
})

// add `preValidation` hook which will automatic parse all `multipart/form-data` found
fastify.register(FastifyFormidable, {
  addHooks: true
})
```

### Options

#### options.formidable

The options which will be directly passed to `formidable`.

```ts
import FastifyFormidable from 'fastify-formidable'

fastify.register(FastifyFormidable, {
  formidable: {
    maxFileSize: 1000 
  }
})
```

See: [`formidable`](https://github.com/node-formidable/formidable#options)

#### options.removeFilesFromBody

This options will add a `preHandler` hooks to remove files from body.

```ts
import FastifyFormidable from 'fastify-formidable'

fastify.register(FastifyFormidable, {
  removeFilesFromBody: true
})
```

### Integration

It is a known limitation for `fastify-multipart` integrate with `fastify-swagger` and this plugin provide a relatively simple solution for the integration.

```ts
import Fastify from 'fastify'
import FastifyFormidable, { ajvBinaryFormat } from 'fastify-formidable'
import FastifySwagger from 'fastify-swagger'

const fastify = Fastify({
  ajv: {
    plugins: [ ajvBinaryFormat ]
  }
})

fastify.register(FastifyFormidable, {
  addContentTypeParser: true
})

fastify.register(FastifySwagger)
```