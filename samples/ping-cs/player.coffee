#
# @module ping-cs actor
#

hubiquitus = require(__dirname + '/../../index')
logger = hubiquitus.logger('hubiquitus:core:samples')

class Player

  constructor: ->
    @count = 0

  onMessage: (req) ->
    logger.info "[#{@id}] #{req.content} from #{req.from} (#{++@count} total)"
    setTimeout (=>
      @send req.from, 'PING'
    ), 500

module.exports = Player
