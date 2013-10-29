#
# @module ping-cs actor
#

logger = require "../../lib/logger"

class Player

  constructor: ->
    @count = 0

  onMessage: (message) ->
    logger.info "[#{@id}] ping from #{message.from} (#{++@count} total)"
    setTimeout (=>
      @send message.from, "ping"
    ), 500

module.exports = Player
