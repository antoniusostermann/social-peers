/* TODO: CHANGE TO https://github.com/digitalbazaar/forge#rsa */


angular.module('starter.controllers', [])

.controller('ChatsCtrl', function($scope, $ionicModal, pouchDB) {
  var settings = pouchDB('settings');
  settings.get('my-own-id').then(function(doc){
    $scope.own_id = doc.value;
    var my_database = pouchDB(doc.value);
    settings.get('keyset').then(function(doc){
      $scope.keyset = doc.value;
      my_database.allDocs({
        include_docs: true
      }).then(function (result) {
        data = result.rows.map(function(val){return val.doc});
        $scope.entries = data;
      });
    });


    $scope.addEntry = function(){
      val = document.getElementById('new-entry').value;
      privateKey = forge.pki.privateKeyFromPem($scope.keyset.private_key);
      hash = forge.md.sha1.create();
      hash.update(val, "utf8");
      signature = privateKey.sign(hash);
      my_database.put({_id: 'entry-'+Date.now(), content: val, date: Date.now(), signature: signature}).then(function(){
        $scope.new_entry = "";
        window.location.reload();
      });
    };
  });

  $ionicModal.fromTemplateUrl('add-entry-modal.html', {
    scope: $scope,
    animation: 'slide-in-up'
  }).then(function(modal) {
    $scope.modal = modal;
  });
  $scope.openModal = function() {
    $scope.modal.show();
  };
  $scope.closeModal = function() {
    $scope.modal.hide();
  };
  //Cleanup the modal when we're done with it!
  $scope.$on('$destroy', function() {
    $scope.modal.remove();
  });
})

.controller('FriendPinboardCtrl', function($scope, $stateParams, pouchDB) {
  settings = pouchDB("settings");
  settings.get('friends').then(function(res){
    friends = res.value;
    public_key = null;
    for(i=0; i<friends.length; i++){
      if (friends[i].id == $stateParams.friendId){
        public_key = friends[i].public_key;
      }
    }

    public_key = forge.pki.publicKeyFromPem(public_key);
    friendDB = pouchDB($stateParams.friendId);
    friendDB.allDocs({
      include_docs: true
    }).then(function (result) {
      data = result.rows.map(function(val){return val.doc});
      entries = [];
      for(i=0; i<data.length; i++){
        entry = data[i];
        hash = forge.md.sha1.create();
        hash.update(entry.content, "utf8");
        verified = public_key.verify(hash.digest().bytes(), entry.signature);
        if (verified) {
          entry.signature_okay = true;
          entry.element_class = "signature-okay";
          entry.signature_text = "valid"
        }else{
          entry.signature_okay = false;
          entry.element_class = "signature-false";
          entry.signature_text = "<strong>invalid</strong>"
        }
        entries.push(entry);
      }
      $scope.entries = entries;
    });

  });
})

.controller('FriendCtrl', function($scope, $ionicModal, pouchDB) {
  $scope.new_friend = {id: '', name: '', public_key: ''};

  var settings = pouchDB('settings');
  var friends_ref = "";
  settings.get('my-own-id').then(function(doc){
    $scope.own_id = doc.value;
    settings.get('keyset').then(function(doc){
      $scope.public_key = doc.value.public_key;
      settings.get('friends').then(function(doc) {
        $scope.friends = doc.value;
        friends_ref = doc._rev;
      });
    });
  });

  // Adds a new friend
  $scope.addFriend = function(){
    $scope.friends.push($scope.new_friend);
    settings.put({_id: 'friends', value: $scope.friends, _rev: friends_ref}).then(function(resp){
      console.log(resp);
      friends_ref = resp._rev;
      $scope.new_friend = {name: '', id: '', public_key: ''};
    }).catch(function(e){console.log(e)});
  };




  $ionicModal.fromTemplateUrl('add-friend-modal.html', {
      scope: $scope,
      animation: 'slide-in-up'
    }).then(function(modal) {
      $scope.modal = modal;
    });
    $scope.openModal = function() {
      $scope.modal.show();
    };
    $scope.closeModal = function() {
      $scope.modal.hide();
    };
    //Cleanup the modal when we're done with it!
    $scope.$on('$destroy', function() {
      $scope.modal.remove();
    });
});
