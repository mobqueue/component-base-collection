
/**
 * Dependencies
 */

var Backbone = require('backbone')
  , BackboneCollection = require('backbone-collection')
  , BaseModel = require('base-model')
  , debug = require('debug')('base-collection')
  , pusher = require('pusher')
  , XHR = require('xhr');

/**
 * Expose `BaseCollection`
 */

var BaseCollection = module.exports = BackboneCollection.extend({
  name: 'basecollection'
, model: BaseModel
});

/**
 *  Default initialize
 */

BaseCollection.prototype.initialize = function() {
  var self = this;
  if (this.user) {
    this.user.isLoggedIn(function(err, newUser) {
      if (err || !newUser) {
        self.user.on('login', function() {
          self.channelName = subscribe(self.user, self);
          self.activated = true;
        });
      } else {
        self.channelName = subscribe(self.user, self);
        self.activated = true;
      }
    });
  }

  function fetch() {
    setTimeout(function() {
      if (self.activated) {
        self.fetch({ reset: true });
      }
    }, 0);
  }

  document.addEventListener('online', fetch, false);
  document.addEventListener('resume', fetch, false);

  this.postInitialize();
};

/**
 * Destroy
 */

BaseCollection.prototype.destroy = function() {
  // unsubscribe
  if (this.channelName) {
    pusher.unsubscribe(this.channelName);
  }

  // activated
  this.activated = false;

  // reset
  this.reset({}, { silent: true });
};

/**
 * Empty post initialize
 */

BaseCollection.prototype.postInitialize = function() {};

/**
 * Custom sync
 */

BaseCollection.prototype.sync = function(method, model, options) {
  options.url = window.API_URL;

  if (typeof model.url === 'string') {
    options.url += model.url;
  } else {
    options.url += model.url();
  }

  options.headers = XHR.getHeaders();
  options.xhrFields = {
    withCredentials: window.device === undefined && options.url.indexOf('private') !== -1
  };

  debug('sync', method, model, options);

  return Backbone.sync.call(this, method, model, options);
};

/**
 * Subscribe to pusher
 */

function subscribe(user, collection) {
  var channelName = user.type + '-' + user.instance.id + '-' + collection.name
    , channel = pusher.channel(channelName);

  if (!channel) {
    channel = pusher.subscribe(channelName);
  }

  debug('listening to', channelName);

  channel.bind('create', function(data) {
    debug('pusher received create', data);
    collection.add(data, { merge: true });
  });

  channel.bind('update', function(data) {
    debug('pusher received update', data);
    collection.add(data, { merge: true });
  });

  user.on('logout', function() {
    pusher.unsubscribe(channelName);
  });

  return channelName;
}
