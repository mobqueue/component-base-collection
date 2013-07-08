
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
          subscribe(self.user, self);
        });
      } else {
        subscribe(self.user, self);
      }
    });
  }

  this.postInitialize();
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
  options.xhrFields = { withCredentials: window.device === undefined };

  debug('sync', method, model, options);

  return Backbone.sync.call(this, method, model, options);
};

/**
 * Subscribe to pusher
 */

function subscribe(user, collection) {
  var channelName = user.type + '-' + user.instance.id + '-' + collection.type
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
}
