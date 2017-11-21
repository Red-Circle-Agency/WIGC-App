// jshint -W117
// jshint -W119

//@prepros-prepend partials/_functions.js

var app = new Vue({
  el: '#app',
  data: {
    my: {
      sidebarVisible: false,
      meetoo: '',
      view: 'loading',
      showMySessionsDesc: true,
      sessions: [],
      vendors: [],
    },
    loaded: false,
    home: {},
    sessions: [],
    vendors: [],
    people: [],
    sponsors: [],
    tracks: [
      'Tribal Government',
      'Casino Operations & Security',
      'Regulation',
      'Finance & Business Development',
      'MCLEs'
    ],
    social: {},
    unfavorited: [],
    showMyVendors: true,
    search: '',
    socialView: 'twitter',
    instagramFeed: {},
    contactUs: {},
    exhibitorInfo: {},
    booths: [],
    selectedTracks: [],
    showFilters: false,
    error_msg: false
  },
  computed: {
    mySessions: function(){
      var self = this;
      return self.sessions.filter(function(s){
        if((self.my.sessions.indexOf(s.url) !== -1) || (self.unfavorited.indexOf(s.url) !== -1)  || (s.type === 'schedule-item')) {
          return true;
        }
      });
    },
    conferenceSchedule: function(){
      var self = this;
      return self.sessions.filter(function(s){
        if(s.type === 'schedule') {
          return true;
        }
      });
    },
    seminars: function(){
      var self = this;
      return self.sessions.filter(function(s){
        if(s.type === 'sessions') {
          if((self.selectedTracks.indexOf(s.track) !== -1) || (self.selectedTracks.length === 0))
            return true;
        }
      });
    },
    filterIndicator:function(){
      var self = this;
      if( self.selectedTracks.length === 0 || self.selectedTracks.length === self.tracks.length)
        return "All Sessions";
      else
        return self.selectedTracks.join(', ');
    },
    myVendors: function(){
      var self = this;
      return self.vendors.filter(function(v){
        if((self.my.vendors.indexOf(v.url) !== -1) || (self.unfavorited.indexOf(v.url) !== -1) || (self.showMyVendors === false)){
          return true;
        }
      });
    },
    instagramLatest: function(){
      var self = this;
      if(self.instagramFeed.length > 0){
        return self.instagramFeed.slice(0, 3);
      }
    }
  },
  mounted: function () {
    var self = this;
    //trackEvent('Load', self.parseUserAgent());
    $.ajax({
      url: 'https://circle.red/wigc/',
      //url: 'http://localhost/wigc/',
      method: 'GET',
      success: function (data) {
        self.home     = data.home;
        self.sessions = data.sessions;
        self.people   = data.people;
        self.vendors  = data.vendors;
        self.sponsors = data.sponsors;
        self.social  = data.social;
        self.contactUs = data.pages.contactus;
        self.exhibitorInfo = data.pages.exhibitorinformation;
        self.booths = data.booths;
        self.loaded   = true;
      },
      error: function (error) {
        //alert(JSON.stringify(error));
        self.error_msg = error.responseText;
        self.my.view = "error";
      }
    });

    self.getInstagramFeed();
    !function(d,s,id){var js,fjs=d.getElementsByTagName(s)[0],p=/^http:/.test(d.location)?'http':'https';if(!d.getElementById(id)){js=d.createElement(s);js.id=id;js.src=p+"://platform.twitter.com/widgets.js";fjs.parentNode.insertBefore(js,fjs);}}(document,"script","twitter-wjs");

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
    };

    document.addEventListener('deviceready', function () {
      // Enable to debug issues.
       window.plugins.OneSignal.setLogLevel({logLevel: 1, visualLevel: 1});
       console.log("Device Ready!");
      var notificationOpenedCallback = function(jsonData) {
        console.log('notificationOpenedCallback: ' + JSON.stringify(jsonData));
      };

      window.plugins.OneSignal
        .startInit("2405a721-a178-45fb-a787-a1bf43a2e74c")
        .handleNotificationOpened(notificationOpenedCallback)
        .endInit();

      // Call syncHashedEmail anywhere in your app if you have the user's email.
      // This improves the effectiveness of OneSignal's "best-time" notification scheduling feature.
      // window.plugins.OneSignal.syncHashedEmail(userEmail);
    }, false);
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
    };
    //if(self.socialView === 'twitter')
      //self.styleTwitterWidget();
  },
  methods: {
    toggleFavorite: function(faves,fave) {
      var self = this;
      fave.favorite = !fave.favorite;
      console.log(fave.url);
      if (fave.favorite) {
        faves.push(fave.url);
        console.log(fave);
        trackEvent("Favorite", self.my.view, fave.title);
      } else {
        if(self.my.view === 'My WIGC' || (self.my.view === 'Vendors' && self.showMyVendors === true)){
          self.unfavorited.push(fave.url);
          setTimeout(function(){
            snap(self.unfavorited, fave.url);
          }, 3000);
        }
        snap(faves,fave.url);
      }
    },
    switchSection: function(newView, anchor) {
      var self = this;
      self.search = '';
      self.my.sidebarVisible = false;
      if(self.my.view === 'my-wigc'){
        self.unfavorited = [];
      } if (self.my.view == "map"){
        onLoad();
      }
      if(newView === 'Vendors' && typeof(anchor) !== 'undefined')
        self.showMyVendors = false;
      self.my.view = newView;
      if(typeof(anchor) !== 'undefined'){
        setTimeout(function(){
          $('#' + anchor).parent('.cards').animate({scrollTop: document.getElementById(anchor).offsetTop - 50 });
        },1000);
      }
      trackEvent("Screen", self.my.view);
    },
    mapClick: function(vendor) {
      var query = vendor.street_address + ' ' + vendor.city+ ', ' +vendor.state+ ' ' +vendor.zip;
      window.open('https://maps.google.com?q='+query, 'Map');
      console.log(vendor);
    },
    showMeetoo: function(u) {
      var self = this;
      self.my.meetoo = u;
      self.switchSection('meetoo');
    },
    getFavorites: function() {
      var self = this;
      var store = self.getObjectStore('my', 'readonly');
      var req = store.openCursor();

      req.onsuccess = function(evt) {
        var cursor = evt.target.result;
        if (cursor) {
          self.my = cursor.value;
          if (self.error_msg) {
            self.my.view = 'error';
          } else {
            self.my.view = 'Home';
          }
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
            var req = store.add(self.my, 0);
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
          };
        }
      };
    },
    getObjectStore: function(storeName, protocol){
      var self = this;
      return self.db.transaction(storeName, protocol).objectStore(storeName);
    },
    isDisabled: function(session){
      if (!session.favorite && session.type !== 'schedule-item'){
        return true;
      }
      return false;
    },
    styleTwitterWidget: function(){
      var w = document.getElementById("twitter-widget-0").contentDocument;
      var s = document.createElement("link");
      s.href = "https://circle.red/wigc-app/css/wigc.css";
      s.rel = "stylesheet";
      w.head.appendChild(s);
    },
    getInstagramFeed: function(){
      var self = this;
      $.ajax({
        url: 'https://circle.red/wigc/instagram.php?tag=mywigc',
        method: 'GET',
        success: function (data) {
          self.instagramFeed = data.entry_data.TagPage[0].tag.media.nodes;
        },
        error: function (error) {
          //alert(JSON.stringify(error));
          self.error_msg = error.responseText;
          self.my.view = "error";
        }
      });
    },
    parseUserAgent: function(){
      var ua = navigator.userAgent.toLowerCase();
      device = "";
      if (ua.indexOf("android") > -1) {
        device = "Android";
      } else if (ua.indexOf('iphone') > -1 || ua.indexOf('ipad') > -1 || ua.indexOf('ipod') > -1) {
        device = "iOS";
      } else if (ua.indexOf('windows') > -1) {
        device = "Windows";
      } else if (ua.indexOf('mac os x') > -1) {
        device = "OSX";
      }
      return device;
    }
  }
});
