(function(document, window) {

	'use strict';
	// Won't work on LTE IE8, so we install a mock.
	if (window.navigator.userAgent.match(/MSIE [678]/gi)) return installMock();

	/**
	 * @typedef SelectorRegistryEntry
	 *
	 * @prop {<Integer, PlayerCache>} cache
   * @prop {<String, Function[]>} handlers 
 	 */

	function Html5MediaListener() {

		var selectorRegistry = {};
		var handlerIds = 1;
		var idProp = '__html5MediaListenerHandlerId__';
		var handlerCaches = {};
		var bound = {};

		function clearCacheOnDurationChange(evt) {

			var player = evt.target;
			var handlerType;
			var selector;
			var key;

			for (selector in selectorRegistry) {

				if (player.matches(selector)) {

					for (handlerType in selectorRegistry[selector]) {

						for (key in selectorRegistry[selector][handlerType]) {

							selectorRegistry[selector][handlerType][key].forEach(function(handler) {
			
								handlerCaches[handler[idProp]] = {};

							});

						}

					}

				}

			}

		}

		function on(selectorRegistryEntry, eventsObj, handler) {

			if (!handler[idProp]) { 

				handler[idProp] = handlerIds; 
				handlerCaches[handlerIds] = {}; 
				handlerIds++;

			}

			if (eventsObj.events) { 

				bindEvents(selectorRegistryEntry, eventsObj.events, handler); 

			}

			if (eventsObj.percentages) { 

				bindPercentages(selectorRegistryEntry, eventsObj.percentages, handler); 

			}

			if (eventsObj.seconds) { 
			
				bindSeconds(selectorRegistryEntry, eventsObj.seconds, handler); 

			}

			if (!bound._clearCaches) {

				document.addEventListener('durationchange', clearCacheOnDurationChange, true);
				bound._clearCaches = clearCacheOnDurationChange;

			}

		}

		function preflightSelectorMethod(method, makeSelector) {

			return function _preflightSelector(selector, eventsObj, handler) {

				if (typeof selector === 'object' && typeof eventsObj === 'function') {

					handler = eventsObj;
					eventsObj = selector;
					selector = '*';

				}

				if (selector.slice(-1) !== '*') { selector += ',' + selector + ' *'; }

				if (makeSelector) {

					selectorRegistry[selector] = selectorRegistry[selector] || {
						percentage: {},
						seconds: {},
						events: {}
					};

				}

				var selectorRegistryEntry = selectorRegistry[selector];

				if (!selectorRegistryEntry) { return; }

				method(selectorRegistryEntry, eventsObj, handler);

			};

		}


		function off(selectorRegistryEntry, eventsObj, handler) {

			if (eventsObj.events) { removeEvents(selectorRegistryEntry, eventsObj.events, handler); }
			if (eventsObj.percentages) { removePercentages(selectorRegistryEntry, eventsObj.percentages, handler); }
			if (eventsObj.seconds) { removeSeconds(selectorRegistryEntry, eventsObj.seconds, handler); }

			bound = {};

		}

		function removeEvents(selectorRegistryEntry, events, handler) {

			var handlers = selectorRegistryEntry.events;
			var handlerInd;
			var type;
			var i;

			for (i = 0; i < events.length; i++) {
				
				type = events[i];
				handlerInd = handlers[type] ? handlers[type].indexOf(handler) : -1;

				if (handlerInd > -1) { handlers[type].splice(handlerInd, 1); }

			}

		}

		function removePercentages(selectorRegistryEntry, percentageObj, handler) {

			var handlers = selectorRegistryEntry.percentages;
			var handlerInd;
			var percentage;
			var i;

			var percentages = (percentageObj.each || [])
				.concat(_calcEveryPercentage(percentageObj.every || []));

			for (i = 0; i < percentages.length; i++) {
				
				percentage = percentages[i];
				handlerInd = handlers[percentage] ? handlers[percentage].indexOf(handler) : -1;

				if (handlerInd > -1) { handlers[percentage].splice(handlerInd, 1); }

			}

		}

		function removeSeconds(selectorRegistryEntry, secondsObj, handler) {

			var handlers = selectorRegistryEntry.seconds;
			var handlerInd;
			var seconds;
			var i;

			for (i = 0; i < secondsObj.each.length; i++) {

				seconds = secondsObj.each[i];
				handlerInd = handlers[seconds] ? handlers[seconds].indexOf(handler) : -1;

				if (handlerInd > -1) { handlers[seconds].splice(handlerInd, 1); }

			}	

			for (i = 0; i < secondsObj.every.length; i++) {

				seconds = secondsObj.every[i];
				handlerInd = handlers[seconds] ? handlers[seconds].indexOf(handler) : -1;

				if (handlerInd > -1) { handlers[seconds].splice(handlerInd, 1); }

			}	

		}

		function bindEvents(selectorRegistryEntry, events, handler) {

			events.forEach(function(type) {

				var boundHandler;

				if (!bound[type]) {

					boundHandler = _preflightEvent(_eventDispatcher);
					document.addEventListener(type, boundHandler, true);
					bound[type] = boundHandler;

				}

			});
			var eventsHandlers = selectorRegistryEntry.events;
			var type;
			var i;

			for (i = 0; i < events.length; i++) {

				type = events[i];
				eventsHandlers[type] = eventsHandlers[type] || [];

				if (eventsHandlers[type].indexOf(handler) === -1) {

					eventsHandlers[type].push(handler);

				}

			}

		}

		function _calcEveryPercentage(every) {

			var output = {};
			var n;
			var i;
			var l;

			for (i = 0; i < every.length; i++) {

				n = 100.0 / every[i];

				for (l = 1; l <= n; l++) { output[every[i] * l] = true; } 

			}

			return Object.keys(output).map(Number).sort(function(a, b) {

				if (a > b) { return 1; }
				if (b > a) { return -1; }
				return 0;

			});

		}	

		function bindPercentages(selectorRegistryEntry, percentageObj, handler) {
		
			var boundHandler;

			if (!bound._timeupdate) {

				boundHandler = _preflightEvent(_timingDispatcher);
				document.addEventListener('timeupdate', boundHandler, true);	
				bound._timeupdate = boundHandler;

			}

			var percentages = (percentageObj.each || [])
				.concat(_calcEveryPercentage(percentageObj.every || []));
			var handlers = selectorRegistryEntry.percentage;
			var percentage;
			var i;

			for (i = 0; i < percentages.length; i++) {

				percentage = percentages[i];
				handlers[percentage] = handlers[percentage] || [];
				
				if (handlers[percentage].indexOf(handler) === -1) {

					handlers[percentage].push(handler);

				}

			}

		}

		function bindSeconds(selectorRegistryEntry, secondsObj, handler) {

			var boundHandler;

			if (!bound._timeupdate) {

				boundHandler = _preflightEvent(_timingDispatcher);
				document.addEventListener('timeupdate', boundHandler, true);	
				bound._timeupdate = boundHandler;

			}

			var handlers = selectorRegistryEntry.seconds;
			var initialHandler;
			var handlerInd;
			var seconds;
			var i;
			var k;

			if (secondsObj.each && secondsObj.each.length) {
				
				for (i = 0; i < secondsObj.each.length; i++) {

					seconds = secondsObj.each[i];
					handlers[seconds] = handlers[seconds] || [];
					handlerInd = handlers[seconds].indexOf(handler);
			
					if (handlerInd === -1) { handlers[seconds].push(handler);	}

				}

			}

			if (secondsObj.every && secondsObj.every.length) {

				for (i = 0; i < secondsObj.every.length; i++) {

					seconds = secondsObj.every[i];
					handlers[seconds] = handlers[seconds] || [];

					initialHandler = rebindingHandler(seconds, seconds, handlers, handler);

					initialHandler.original = handler;
					
					for (k = 0; k < handlers[seconds].length; k++) {

						if (handlers[seconds][k].original === handler) { handlerInd = k; break; }

					}

					if (handlerInd === -1) { handlers[seconds].push(initialHandler); }

				}

			}

		} 

		function rebindingHandler(seconds, step, handlers, handler) {

			return function _rebindingHandler(evt) {

				var player = evt.player;
				var toCall = [seconds];
				var curr = player.currentTime;
				var missedIntervals;
				var next;
				var i;
				
				if (curr > seconds + step) {

					missedIntervals = Math.floor((curr - seconds) / seconds);
					
					for (i = 1; i < missedIntervals + 1; i++) {

						toCall.push(i * step + seconds);

					}

				}

				toCall.forEach(function(interval) {
					
					nextTick(function() { 

						handler.call(player, {
							player: player,
							label: _translateSeconds(interval),
							seconds: interval
						});

					});

				});

				if (!player.ended) {

					next = (missedIntervals + 1) * step + seconds; 
					handlers[next] = handlers[next] || [];
					handlers[next].push(rebindingHandler(next, step, handlers));

				}

			};

		}


		function _preflightEvent(handler) {

			return function _preflightEvent(evt) {

				if (!evt.isTrusted) { return; }

				handler.call(evt.target, evt);

			};

		}

		function _eventDispatcher(evt) {

			var player = evt.target;
			var type = evt.type;
			var seconds = Math.ceil(player.currentTime);
			var selector;
			var handlers;

			if (type === 'pause' && player.ended) { return; }

			for (selector in selectorRegistry) {

				if (player.matches(selector)) {

					handlers = selectorRegistry[selector].events;

					if (handlers[type] && handlers[type].length) {

						handlers[type].forEach(function(handler) {

							handler({
								player: player,
								label: type,
								seconds: seconds
							});

						});

					}			

				}

			}

		}

		function _timingDispatcher(evt) {

			var player = evt.target;
			var seconds = Math.ceil(player.currentTime);
			var percentage = Math.ceil(seconds / player.duration * 100);
			var selector;
			var handlers;
			var key;
			
			for (selector in selectorRegistry) {

				if (player.matches(selector)) {

					handlers = selectorRegistry[selector];

					if (handlers.percentage) {

						for (key in handlers.percentage) {

							if (Number(key) <= percentage) {

								handlers.percentage[key].forEach(function(handler) {

									var handlerId = handler[idProp] || handler.original[idProp];
									var handlerCache = handlerCaches[handlerId];

									if (!handlerCache[key]) { 

										handler.call(player, {
											player: player,
											label: key + '%',
											seconds: Math.ceil(player.duration * key / 100)
										});

										handlerCache[key] = true;	

									}

								});

							}

						}

					}

					if (handlers.seconds) {

						for (key in handlers.seconds) {

							if (Number(key) <= seconds) {

								handlers.seconds[key].forEach(function(handler) {

									var handlerId = handler[idProp] || handler.original[idProp];
									var handlerCache = handlerCaches[handlerId];

									if (!handlerCache[key]) {

										handler({
											player: player,
											label: _translateSeconds(Number(key)),
											seconds: Number(key)
										});

										handlerCache[key] = true;	

									}

								});

							}

						}

					}

				}

			}

		}

		function destroy() {

			var type;
			var key;

			for (type in bound) {

				document.removeEventListener(type, bound[type],  true);

			}

			document.removeEventListener('timingupdate', bound._timeupdate, true);
			
			for (key in selectorRegistry) { delete selectorRegistry[key]; }

		}

		return {
			on: preflightSelectorMethod(on, true),
			off: preflightSelectorMethod(off),
			destroy: destroy,
			_translateSeconds: _translateSeconds,
			_calcEveryPercentage: _calcEveryPercentage
		};

	}

	function _translateSeconds(n) {

		var hours = Math.floor(n / 3600);
		var minutes = Math.floor((n - hours * 3600) / 60);
		var seconds = n - hours * 3600 - minutes * 60;

		return [hours, minutes, seconds].map(function(n) {

			return (n + '').length === 1 ? '0' + n : n + '';

		}).join(':');

	}

	function installMock() {

		window.Html5MediaListener = function() { return {on: noop, destroy: noop, off: noop}; };

	}

	function nextTick(fn) {

		return setTimeout(fn, 0);

	}

	function noop() {}

	window.Html5MediaListener = Html5MediaListener;
 
})(document, window);
/*
 * v1.0.0
 * Created by the Google Analytics consultants at http://www.lunametrics.com/
 * Written by @notdanwilkerson
 * Documentation: https://github.com/lunametrics/html5-media-listener/
 * Licensed under the MIT License
 */