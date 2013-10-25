#
# @module ping-cs actor
#

logger = require "../../lib/logger"

class Player

  constructor: ->
    @count = 0

  onMessage: (message) ->
    logger.info "[#{@aid}] ping from #{message.publisher} (#{++@count} total)"
    setTimeout (=>
      @send message.publisher, {payload: "ping"}
    ), 500

module.exports = Player
