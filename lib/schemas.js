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

exports.startParams = {
  title: 'start parameters',
  description: 'start parameters',
  type: 'object',
  properties: {
    stats: {
      type: 'object',
      properties: {
        enabled: {type: 'string'},
        host: {type: 'string'},
        port: {type: 'number'}
      },
      required: ['enabled'],
      additionalProperties: false
    },
    discoveryAddr: {type: 'string'},
    discoveryPort: {type: 'number'},
    ip: {type: 'string'}
  },
  required: [],
  additionalProperties: false
};
