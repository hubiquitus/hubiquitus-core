/**
 * @module schemas
 */

exports.message = {
  title: 'message',
  description: 'piece of information envelope into a conversation',
  type: 'object',
  properties: {
    from: {type: 'string'},
    to: {type: 'string'},
    err: {},
    content: {},
    id: {type: 'string'},
    date: {type: 'integer'},
    timeout: {type: 'integer'},
    cb: {type: 'boolean'}
  },
  required: ['from', 'to', 'id'],
  additionalProperties: false
};
