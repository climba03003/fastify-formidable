import t from 'tap'
import { createFastify } from './createFastify'

t.plan(1)
t.test('error', function (t) {
  t.plan(1)

  t.test('`addContentTypeParser` and `addHooks`', async function (t) {
    t.plan(2)

    try {
      await createFastify(t, { addHooks: true, addContentTypeParser: true })
      // should not get here
      t.fail()
    } catch (err: any) {
      t.ok(err)
      t.equal(err.message, 'Cannot enable `addContentTypeParser` togather with `addHooks`')
    }
  })
})
