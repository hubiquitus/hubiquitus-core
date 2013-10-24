#
# @module ping sample
#

logger = require __dirname + "/../../lib/logger"

class Player

  constructor: ->
    @count = 0

  onMessage: (message) ->
    logger.info "[#{@aid}] ping from #{message.publisher} (#{++@count} total)"
    setTimeout (=>
      @send message.publisher, {payload: "ping"}
    ), 500

module.exports = Player
