import { createFastify } from './createFastify'

describe('error', function () {
  test('`addContentTypeParser` and `addHooks`', async function () {
    try {
      await createFastify({ addHooks: true, addContentTypeParser: true })
      // should not get here
      expect(true).toStrictEqual(false)
    } catch (err) {
      expect(err).toBeDefined()
      expect(err.message).toStrictEqual('Cannot enable `addContentTypeParser` togather with `addHooks`')
    }
  })
})
