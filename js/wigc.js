// jshint -W117
// jshint -W119



/////////////////////////////////
// Functions (General Use)
function snap(array, search_term, multi = false) {
  for (var i = array.length - 1; i >= 0; i--) {
    if (array[i] === search_term) {
      array.splice(i, 1);
      if (multi === true) {
        break;
      }
    }
  }
}


var app = new Vue({
  el: '#app',
  data: {
    my: {
      sidebarVisible: true,
      view: 'home',
      sessions: [],
      vendors: [],
      schedule: []
    },
    sessions: [],
    vendors: [],
    error_msg: false

  },
  computed: {
    mySessions: function(){
      var self = this;
      return self.sessions.filter(function(s){
        if(self.my.sessions.indexOf(s.url) !== -1){
          return true;
        }
      });
    },
    myVendors: function(){
      var self = this;
      return self.vendors.filter(function(v){
        if(self.my.vendors.indexOf(v.url) !== -1){
          return true;
        }
      });
    }
  },
  mounted: function () {
    var self = this;

    // Grab Sessions
    $.ajax({
      url: 'https://circle.red/wigc/sessions',
      //url: 'http://localhost/wigc/sessions',
      method: 'GET',
      success: function (data) {
        self.sessions = data;
      },
      error: function (error) {
        alert(JSON.stringify(error));
        //self.error_msg = error
      }
    });

    // Grab Vendors
    $.ajax({
      url: 'https://circle.red/wigc/vendors',
      //url: 'http://localhost/wigc/vendors',
      method: 'GET',
      success: function (data) {
        self.vendors = data;
      },
      error: function (error) {
        alert(JSON.stringify(error));
        //self.error_msg = error
      }
    });

    // Grab Schedule
    /*$.ajax({
      url: 'https://circle.red/wigc/schedule',
      //url: 'http://localhost/wigc/schedule',
      method: 'GET',
      success: function (data) {
        self.schedule = data;
      },
      error: function (error) {
        alert(JSON.stringify(error));
        //self.error_msg = error
      }
    });*/

    var request = indexedDB.open("WIGCApp", 3);

    request.onerror = function(event) {
      self.indexed = "Can't use IndexedDB";
    };
    request.onsuccess = function(event) {
      self.db = this.result;
      self.getFavorites();
      self.my.view = "sessions";
    };
    request.onupgradeneeded = function(event) {
      var objStore = event.currentTarget.result.createObjectStore('my');
    }
  },
  updated: function() {
    var self = this;
    var request = indexedDB.open("WIGCApp", 3);

    request.onerror = function(event) {
      self.indexed = "Can't use IndexedDB";
    };
    request.onsuccess = function(event) {
      self.db = this.result;
      self.updateFavorites();
    };
    request.onupgradeneeded = function(event) {
      var objStore = event.currentTarget.result.createObjectStore('my');
    }
  },
  methods: {
    toggleFavorite: function(faves,fave) {
      var self = this;
      fave.favorite = !fave.favorite;
      console.log(fave.url);
      if (fave.favorite) {
        faves.push(fave.url);
      } else {
        snap(faves,fave.url);
      }
      self.updateFavorites();
    },
    switchSection: function(newView) {
      var self = this;
      self.my.sidebarVisible = false;
      self.my.view = newView;
    },
    mapClick: function(vendor) {
      var query = vendor.street_address + ' ' + vendor.city+ ', ' +vendor.state+ ' ' +vendor.zip;
      window.open('https://maps.google.com?q='+query, 'Map');
      console.log(vendor);
    },
    getFavorites: function() {
      var self = this;
      var store = self.getObjectStore('my', 'readonly');
      var req = store.openCursor();

      req.onsuccess = function(evt) {
        var cursor = evt.target.result;
        if (cursor) {
          self.my = cursor.value;
        }
      };
    },
    updateFavorites: function(){
      var self = this;
      var store = self.getObjectStore('my', 'readwrite');

      var getCount = store.count();
      getCount.onsuccess = function(evt){
        if (evt.target.result === 0){
          try {
            req = store.add(self.my, 0);
          } catch (e) {
            throw e;
          }
        }
        else{
          var req = store.openCursor();
          req.onsuccess = function(evt) {
            var cursor = evt.target.result;
            if(cursor){
              try {
                cursor.update(self.my);
              } catch (e) {
                throw e;
              }
            }
            self.sessions.map(function(s){
              if(self.my.sessions.indexOf(s.url) !== -1){
                s.favorite = true;
              }
            });
            self.vendors.map(function(v){
              if(self.my.vendors.indexOf(v.url) !== -1){
                v.favorite = true;
              }
            });
          }
        }
      }
    },
    getObjectStore: function(storeName, protocol){
      var self = this;
      return self.db.transaction(storeName, protocol).objectStore(storeName);
    }
  }
});
