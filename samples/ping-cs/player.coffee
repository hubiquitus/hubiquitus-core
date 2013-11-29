#
# @module ping-cs actor
#

hubiquitus = require(__dirname + '/../../index')
logger = hubiquitus.logger('hubiquitus:core-samples')

class Player

  constructor: ->
    @count = 0

  onMessage: (from, content, reply) ->
    logger.info '[#{@id}] #{content} from #{from} (#{++@count} total)'
    setTimeout (=>
      @send from, 'PING'
    ), 500

module.exports = Player
