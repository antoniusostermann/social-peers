(($) ->
  $ ->
    peer1 = new window.SimplePeer initiator: true
    peer2 = new window.SimplePeer

    peer1.on 'signal', (data) ->
      # when peer1 has signaling data, give it to peer2
      peer2.signal data

    peer2.on 'signal', (data) ->
      # same as above, but in reverse
      peer1.signal data

    peer2.on 'data', (data) ->
      # got a data channel message
      console.log 'got a message from peer1: ' + data


    from_db = new PouchDB('db')
    to_db = new PouchDB('db_cpy')

    from_db.dump(peer1).then (res) ->
      console.log res
      console.log "should be 'ok'"

    to_db.load(peer2).then (res) ->
      console.log res
      console.log "should be 'ok'"
) jQuery