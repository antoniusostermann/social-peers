(($) ->
  $ ->
    db = new PouchDB('social_peers')

    insert = (post) ->
      $('#posts').append post.content+"<br>"

    $('#add-post-button').click ->
      db.put(content: $('#new-post').val(), _id: 'post-' + Date.now()).then (result) ->
        console.log result

    db.allDocs(include_docs: true, startkey: 'post-').then (result) ->
      console.log result
      insert post.doc for post in result.rows

) jQuery