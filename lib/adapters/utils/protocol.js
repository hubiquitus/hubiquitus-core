/**
 * @module network protocol
 */

/**
 * Builds a ZMQ message [ACK_FLAG(1 byte)|ACK_ID(4 bytes)|JSON_MESSAGE]
 * @param ackFlag {number} ack flag
 * @param ackId {string} ack id
 * @param message {object} message
 * @returns {Buffer}
 */
exports.buildZmqMessage = function (ackFlag, ackId, message) {
  var jsonMessage = message ? JSON.stringify(message) : "";
  var buffer = new Buffer(Buffer.byteLength(jsonMessage, "utf8") + 5);
  buffer.writeUInt8(ackFlag, 0);
  buffer.writeUInt32BE(ackId, 1);
  buffer.write(jsonMessage, 5, "utf8");
  return buffer;
};

/**
 * Parses a ZMQ message
 * @param buffer {Buffer} buffer to parse
 */
exports.parseZmqMessage = function (buffer) {
  var ackFlag = buffer.readUInt8(0);
  var ackId = buffer.readUInt32BE(1);
  var message = JSON.parse(buffer.toString(5));
  return {ackFlag: ackFlag, ackId: ackId, message: message};
};
