import Ajv from 'ajv'
import t from 'tap'
import { ajvBinaryFormat } from '../lib'

t.plan(1)
t.test('ajv binary format', function (t) {
  t.plan(2)
  const ajv = new Ajv()
  ajvBinaryFormat(ajv)

  const validate = ajv.compile({ type: 'string', format: 'binary' })
  t.equal(validate('any string'), true)
  t.equal(validate(123), false)
})
