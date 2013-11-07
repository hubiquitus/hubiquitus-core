/**
 * @module schemas
 */

exports.message = {
  title: "message",
  description: "piece of information envelope into a conversation",
  type: "object",
  properties: {
    from: {type: "string"},
    to: {type: "string"},
    payload: {
      type: "object",
      description: "message content",
      properties: {
        err: {},
        content: {}
      },
      required: ["content"],
      additionalProperties: false
    },
    id: {type: "string"},
    date: {type: "integer"},
    timeout: {type: "integer"}
  },
  required: ["from", "to", "payload", "id"],
  additionalProperties: false
};
