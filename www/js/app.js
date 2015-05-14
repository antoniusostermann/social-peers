// Ionic Starter App

// angular.module is a global place for creating, registering and retrieving Angular modules
// 'starter' is the name of this angular module example (also set in a <body> attribute in index.html)
// the 2nd parameter is an array of 'requires'
// 'starter.services' is found in services.js
// 'starter.controllers' is found in controllers.js
angular.module('starter', ['ionic', 'starter.controllers', 'starter.services', 'pouchdb'])


.run(function($ionicPlatform, pouchDB) {
  $ionicPlatform.ready(function() {
    // Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
    // for form inputs)
    if (window.cordova && window.cordova.plugins && window.cordova.plugins.Keyboard) {
      cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
    }
    if (window.StatusBar) {
      // org.apache.cordova.statusbar required
      StatusBar.styleLightContent();
    }

    /* for GUID generation */
    guid = function() {
      S4 = function()  {
        return (((1+Math.random())*0x10000)|0).toString(16).substring(1);
      };
      return (S4() + S4() + "-" + S4() + "-4" + S4().substr(0,3) + "-" + S4() + "-" + S4() + S4() + S4()).toLowerCase();
    };

    /* Gets a sequence nr of a database name */
    var getSeqNr = function (db, friend, callback) {
      db = pouchDB(db);
      db.info().then(function(r) {
        callback(r.update_seq, friend);
      });
    }

    /* Gets a friend by id with seq nr. if id == my id, returns my own info! */
    var getFriend = function(id, basic, callback) {
      // adds own data to friends array
      new_basic = (JSON.parse(JSON.stringify(basic)));
      new_basic.friends.push({id: basic.id, name: "me"});
      for (friend in new_basic.friends) {
        friend = new_basic.friends[friend];
        if (friend.id == id) {
          getSeqNr(id, friend, function(seq, friend){
            friend.database = seq;
            callback(friend);
          });
        }
      }
    };

    /* Gets basic-data with seq data */
    var basicWithSequence = function(basic, callback){
      old_friends = basic.friends;
      new_friends = [];
      for (friend in old_friends) {
        friend = old_friends[friend];
        getFriend(friend.id, basic, function(f){
          new_friends.push(f);
          if (new_friends.length == old_friends.length){
            new_basic = (JSON.parse(JSON.stringify(basic)));
            new_basic.friends = new_friends;
            callback(new_basic);
          }
        });
      }
    };

    /* Checks if a friend id is in friend list */
    var inFriendList  = function(id, basic, callbackIfTrue) {
      getFriend(id, basic, function(f) {
        if (f != false) {callbackIfTrue(f);}
      });
    };


    /* Sends database changes to friend */
    /* his_data and my_data needs to contain sequence data! */
    var sendChanges = function(conn, his_data, my_data) {
      /* Changes-Feed besorgen (auf Revision-Basis) und schicken */
      db = pouchDB(his_data.id)
      changes = db.changes({include_docs: true, since: his_data.database});
      all_changes = [];
      changes.on('change', function(c) {
        all_changes.push(c);
      }).on('complete', function() {
        data = {changes: all_changes, id: my_data.id};
        console.log("!!SENDING CHANGES:");
        console.log(data);
        conn.send(data); // Sends data to friend -> executes receiveChanges() on the other side!
      });
    };

    /* Receives changes */
    var receiveChanges = function(conn, data) {
      console.log("!!RECEIVING CHANGES:");
      console.log(data);
      /* Feed-Daten empfangen: Was wurde geändert, aktualisiert, usw? */
      db = pouchDB(data.id);
      doc_changes = data.changes.map(function(v){return v.doc});
      db.bulkDocs(doc_changes).then(function(r){
        console.log("DB FOR ID = "+data.id+" IS NOW UP TO DATE!");
        console.log("result = ");
        console.log(r);
      });
    };


    /* Processes all sync requests */
    var processSyncRequests = function(conn, request_data, basic) {
      console.log(request_data);
      cache = {};
      for (friend in request_data.friends) {
        friend = request_data.friends[friend];
        cache[friend.id] = friend;
        inFriendList(friend.id, basic, function(my_data){
          his_data = cache[my_data.id]
          if (his_data.database < my_data.database) {
            sendChanges(conn, his_data, my_data);
          }
        });
      }
    };



    /* Function to call if database is ready => got my id and friends */
    var databaseReady = function(basic) {
      var peer = new Peer(basic.id, {key: 'awz3df7pmltedn29'});

      peer.on('open', function(id) {
        console.log('My peer ID is: ' + id);

        /* Open connection for each friend */
        var connections = [];
        for (friend in basic.friends) {
          friend = basic.friends[friend];
          friend_connection = peer.connect(friend.id);
          friend_connection.on('open', function(){

            /* Send friend friends info (inc. seq nr) and my id */
            basicWithSequence(basic, function(data) {
              friend_connection.send(data);
            });

            // Receive changes
            friend_connection.on('data', function(data) {
              receiveChanges(friend_connection, data);
            });
          });
          connections.push({
            friend: friend,
            connection: friend_connection
          });
        }

        /* Get new connection request (to send changes) */
        peer.on('connection', function(conn) {
          conn.on('data', function(request_data){
            console.log(request_data);
            processSyncRequests(conn, request_data, basic);
          });
        });
      });
    };


    /* Set initial values of database if unset */
    var settings = pouchDB('settings');
    var basic = {id: null, friends: null};
    settings.get('my-own-id').then(function(doc){
      basic.id = doc.value;
      settings.get('friends').then(function(doc) {
        basic.friends = doc.value;
        databaseReady(basic);
      }).catch(function(err) {
        settings.put({_id: 'friends', value: []}).then(function(resp){
          basic.friends = [];
          databaseReady(basic);
        });
      });
    }).catch(function(err){
      if (err.status == 404) {
        // -> There is no document with id in settings database, so generate one and put it in
        settings.put({_id: 'my-own-id', value: guid()}).then(function(resp) {
          window.location.reload();
        });
      }
    });


  });
})

.config(function($stateProvider, $urlRouterProvider) {

  // Ionic uses AngularUI Router which uses the concept of states
  // Learn more here: https://github.com/angular-ui/ui-router
  // Set up the various states which the app can be in.
  // Each state's controller can be found in controllers.js
  $stateProvider

  // setup an abstract state for the tabs directive
    .state('tab', {
    url: "/tab",
    abstract: true,
    templateUrl: "templates/tabs.html"
  })

  // Each tab has its own nav history stack:

  .state('tab.chats', {
      url: '/chats',
      views: {
        'tab-chats': {
          templateUrl: 'templates/tab-chats.html',
          controller: 'ChatsCtrl'
        }
      }
    })

  .state('tab.friends', {
    url: '/friends',
    views: {
      'tab-friends': {
        templateUrl: 'templates/tab-friends.html',
        controller: 'FriendCtrl'
      }
    }
  })
  .state('tab.friend-pinboard', {
      url: '/friends/:friendId',
      views: {
        'tab-friends': {
          templateUrl: 'templates/friend-pinboard.html',
          controller: 'FriendPinboardCtrl'
        }
      }
    });

  // if none of the above states are matched, use this as the fallback
  $urlRouterProvider.otherwise('/tab/chats');

});
