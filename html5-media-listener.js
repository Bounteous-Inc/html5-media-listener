(function(document, window) {

	'use strict';
	// Won't work on LTE IE8, so we install a mock.
	if (window.navigator.userAgent.match(/MSIE [678]/gi)) return installMock();

	var trackerRegistry = {};
	var playerIds = 1;
	var bound = {};

	/**
	 * @param {Object} opts
	 * @param {HTMLNodeCollection|String} opts.targets
	 */
	function Html5MediaTracker(opts) {

		if (!(this instanceof Html5MediaTracker)) { return new Html5MediaTracker(opts); }

		if (!opts.targets) { 
			throw new TypeError('Missing required configuration opts.targets'); 
		}

		var self = this;

		self._players = selectAll(opts.targets);

		if (!self._players.length) { return; }

		self._players.forEach(function(el) { 

			if (!el.__html5PlayerId__) { el.__html5PlayerId__ = playerIds++; }

			var id = el.__html5PlayerId__;

			(trackerRegistry[id] = trackerRegistry[id] || []).push(self);
					
		});

		self._handlers = {};
		self._bindings = [];

	}

	/** 
	 * @param {Object} config
	 * @param {String[]} [config.events]
	 * @param {Object} [config.percentages]
	 * @param {Number[]} [config.percentages.each]
	 * @param {Number[]} [config.percentages.every]
	 * @param {Object} [config.seconds]
	 * @param {Number[]} [config.seconds.each]
	 * @param {Number[]} [config.seconds.every]
	 * @param {Function} handler
	 * @param {HTMLElement[]} [players]
	 */
	Html5MediaTracker.prototype.on = function on(config, handler) {

		if (typeof handler !== 'function') {

			throw new TypeError('Handler is not a function');

		}

		/**
  	 * @name StandardConfig
		 *
		 * @prop {String[]} events
		 * @prop {Object} percentages
		 * @prop {Number[]} percentages.each
		 * @prop {Number[]} percentages.every
		 * @prop {Object} seconds
		 * @prop {Number[]} seconds.each
		 * @prop {Number[]} seconds.every
		 */
		var standardConfig = {
			events: config.events || [],
			percentages: {},
			seconds: {}
		};

		['percentages', 'seconds'].forEach(function(type) {

			['each', 'every'].forEach(function(prop) {

				standardConfig[type][prop] = (config[type] || {})[prop] || [];

			});

		});

		bindGlobalListeners(standardConfig);

		var self = this;

		self._players.forEach(function(player) {

			self._registerHandlers(player, standardConfig, handler);

		});

		self._bindings.push({config: standardConfig, handler: handler});

	};

	Html5MediaTracker.prototype.destroy = function() {

		this.destroy = true;
		var otherTrackers = false;
		var key,
			i;

		for (key in trackerRegistry) {

			for (i = trackerRegistry[key].length - 1; i >= 0; i--) {

				if (trackerRegistry[key][i].destroy) { 

					trackerRegistry[key].splice(i, 1); 
	
				} else {

					otherTrackers = true;

				}

			}

		} 

		if (!otherTrackers) { unbindGlobalListeners(); }

		delete this._handlers;
		delete this._bindings;
	
		return;

	};

	/**
   * @param {Event} evt
	 */
	Html5MediaTracker.prototype.handleEvent = function(evt) {

		var type = evt.type;
		var player = evt.target;
		var playerId = player.__html5PlayerId__;

		if (!this._handlers[playerId] || !this._handlers[playerId][type]) { return; }
		// Players emit pause events automatically before 'ended', which we squelch
		if (type === 'pause' && player.ended) { return; }

		var handlers = this._handlers[playerId][type];
		var i;

		for (i = 0; i < handlers.length; i++) {

			setTimeout(handlers[i], 0);

		}

	};

	/**
 	 * @param {Event} evt
	 */
	Html5MediaTracker.prototype.handleTiming = function(evt) {

		var player = evt.target;
		var seconds = Math.ceil(player.currentTime);
		var playerId = player.__html5PlayerId__;
		var handlers = this._handlers[playerId];
		var toCall = [];
		var key;
		var i;

		for (key in handlers) {

			if (Number(key) <= seconds) { 

				toCall = toCall.concat(handlers[key]); 
				delete handlers[key];

			}

		}

		for (i = 0; i < toCall.length; i++) {

			setTimeout(toCall[i], 0);

		}

	};

	/**
	 * @param {Number} n
	 *
	 * @returns {String}
	 */
	Html5MediaTracker._translateSeconds = function(n) {

		var hours = Math.floor(n / 3600);
		var minutes = Math.floor((n - hours * 3600) / 60);
		var seconds = n - hours * 3600 - minutes * 60;

		return [hours, minutes, seconds].map(function(n) {

			return (n + '').length === 1 ? '0' + n : n + '';

		}).join(':');

	};

	/**
	 * @param {HTMLVideoElement|HTMLAudioElement} player
	 * @param {StandardConfig} config
	 * @param {Function} handler
	 */
	Html5MediaTracker.prototype._registerHandlers = function(player, config, handler) {

		var self = this;
		var playerId = player.__html5PlayerId__;
		var handlers = self._handlers[playerId] = self._handlers[playerId] || {};
		var percentageConfigs = [];

		config.events.forEach(function(type) {

			handlers[type] = handlers[type] || [];
			handlers[type].push(function() {

				handler.call(player, {
					seconds: Math.floor(player.currentTime),
					label: type,
					player:player	
				});

			});

		});

		if (player.duration !== Infinity && !isNaN(player.duration)) {

			percentageConfigs = config.percentages.every
				.reduce(function(every, val) {

					var n = 100.0 / val;
					var i;

					for (i = 1; i <= n; i++) { every.push(val * i); }

					return every;				

				}, [])
				.concat(config.percentages.each)
				.reduce(function(data, percentage) { 

					var n = Math.floor(player.duration * percentage / 100.0);
				
					if (n === 0.0 || data.uniq[n] || percentage > 100.0) { return data; }

					data.uniq[n] = true;

					data.times.push({
						seconds: Math.min(player.duration, n),
						label: percentage + '%',
						player: player
					});
		
					return data;

				}, {uniq: {}, times: []}).times;	

		}

		var secondsEach = config.seconds.each.map(function(seconds) {

			return {
				seconds: seconds,
				label: Html5MediaTracker._translateSeconds(seconds),
				player: player	
			};

		});	
	
		percentageConfigs.concat(secondsEach).forEach(function(config) {
			
			handlers[config.seconds] = handlers[config.seconds] || [];
			handlers[config.seconds].push(handler.bind(player, config));
		
		});

		config.seconds.every.forEach(bindRecursiveSeconds);

		function bindRecursiveSeconds(seconds) {

			var next = Math.floor(player.currentTime / seconds) + seconds;

			handlers[next] = handlers[next] || [];

			handlers[next].push(function() {

				var intervalsThatHavePassed = [next];
				var curr = player.currentTime;
				var diff = curr - next;
				var intervals = Math.floor(diff / seconds);
				var i;

				for (i = 1; i < intervals + 1; i++) { 
			
					intervalsThatHavePassed.push(next + i * seconds);

				}
	
				intervalsThatHavePassed.forEach(function(interval) {

					setTimeout(function() {

						handler.call(player, {
							seconds: interval,
							label: Html5MediaTracker._translateSeconds(interval),
							player: player
						});

					}, 0);

				});

				if (next + seconds * intervalsThatHavePassed <= player.duration) {

					setTimeout(function() {

						handlers[next + seconds] = [bindRecursiveSeconds.bind(next + seconds)];

					}, 0);
		
				}

			});

		}
		
	};

	/**
	 * @param {StandardConfig} config
	 */
	function bindGlobalListeners(config) {

		config.events.forEach(function(type) {
		
			if (bound[type]) return;

			bindDispatcher(type, eventDispatcher);

			bound[type] = true;

		});

		var needsTime = ['percentages', 'seconds'].filter(function(type) {

			return config[type].each.length + config[type].every.length;

		}).length;

		if (needsTime && !bound.timeupdate) {

			bindDispatcher('timeupdate', timingDispatcher);
			bound.timeupdate = true;

		}

	}

	/**
	 * @param {Event} evt
	 */
	function durationChangeHandler(evt) {

		if (!evt.isTrusted) { return; }

		var player = evt.target;
		var playerId = player.__html5PlayerId__;
		var trackers = trackerRegistry[playerId];		

		if (!trackers || trackers.length) { return; }
	
		trackers.forEach(function(tracker) {
	
			delete tracker._handlers[playerId];

			tracker._bindings.forEach(function(binding) {

				tracker._calculateMarks(player, binding.config, binding.handler);

			});

		});

	}

	/**
	 * @param {String} type
	 * @param {Function} dispatcher
	 */
	function bindDispatcher(type, dispatcher) {

		document.addEventListener(type, function(evt) {

			var player = evt.target;
			var tagName = player.tagName;

			if (evt.isTrusted && (tagName === 'AUDIO' || tagName === 'VIDEO')) {

				dispatcher(evt);

			}

		}, true);

	}

	/**
	 * @param {Event} evt
	 */
	function eventDispatcher(evt) {

		var player = evt.target;
		var trackers = trackerRegistry[player.__html5PlayerId__];

		if (trackers) { 

			trackers.forEach(function(tracker) { 
				tracker.handleEvent.call(tracker, evt); 
			});

		}

	}

	/**
	 * @param {Event} evt
	 */
	function timingDispatcher(evt) {

		var player = evt.target;
		var trackers = trackerRegistry[player.__html5PlayerId__];

		if (trackers) { 

			trackers.forEach(function(tracker) { 
				tracker.handleTiming(evt); 
			});

		}

	}

	function unbindGlobalListeners() {

		var e;
	
		for (e in bound) { document.removeEventListener(e, eventDispatcher, true); }

		document.removeEventListener('timingupdate', timingDispatcher, true);

		document.removeEventListener('durationchange', durationChangeHandler, true);

		bound = {};	

	}

	/** 
	 * @param {String[]} tags
	 *
	 * @return {HTMLElement[]}
	 */
	function selectAll(tags) {

		if (!(Array.isArray(tags))) { tags = [tags]; }

		return [].slice.call(document.querySelectorAll(tags.join()));

	}

	function installMock() {

		window.Html5MediaTracker = function() { return {on: noop, destroy: noop}; };

	}

	function noop() {}

	window.Html5MediaTracker = Html5MediaTracker;

})(document, window);
/*
 * v1.0.0
 * Created by the Google Analytics consultants at http://www.lunametrics.com/
 * Written by @notdanwilkerson
 * Documentation: https://github.com/lunametrics/html5-media-listener/
 * Licensed under the MIT License
 */