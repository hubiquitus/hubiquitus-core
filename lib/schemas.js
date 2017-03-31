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
    cb: {type: 'boolean'},
    headers: {type: 'object'}
  },
  required: ['from', 'to', 'id'],
  additionalProperties: false
};

exports.startParams = {
  title: 'start parameters',
  description: 'start parameters',
  type: 'object',
  oneOf: [
    {
      properties: {
        discoveryAddr: {type: 'string'},
        discoveryPort: {type: 'number'},
        ip: {type: 'string'},
      },
      additionalProperties: false
    },
    {
      properties: {
        discoveryAddr: {type: 'string'},
        ip: {type: 'string'},
        podAddrs: {
          type: ['array', 'undefined'],
          items: {type: 'string'},
          minItems: 1
        },
        podDiscoveryPort: {type: 'number'}
      },
      required: ['discoveryAddr', 'ip', 'podAddrs', 'podDiscoveryPort'],
      additionalProperties: false
    }
  ]
};
