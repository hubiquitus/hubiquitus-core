#
# @module ping-cs actor
#

logger = require '../../lib/logger'

class Player

  constructor: ->
    @count = 0

  onMessage: (from, content, reply) ->
    logger.info '[#{@id}] #{content} from #{from} (#{++@count} total)'
    setTimeout (=>
      @send from, 'ping'
    ), 500

module.exports = Player
