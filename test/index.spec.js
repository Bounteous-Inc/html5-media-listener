describe('Html5MediaTracker', function(){
  'use strict';
	
	beforeEach(function(done) {

		var loaded = 0;	

		document.addEventListener('canplay', done, true);

		var html = `
			<video id="video" controls="" preload="none" poster="https://media.w3.org/2010/05/sintel/poster.png">
				<source id="mp4" src="https://media.w3.org/2010/05/sintel/trailer.mp4" type="video/mp4">
				<source id="webm" src="https://media.w3.org/2010/05/sintel/trailer.webm" type="video/webm">
				<source id="ogv" src="https://media.w3.org/2010/05/sintel/trailer.ogv" type="video/ogg">
				<p>Your user agent does not support the HTML5 Video element.</p>
			</video>
			<audio id="audio" controls="" preload="none" poster="https://media.w3.org/2010/05/sintel/poster.png">
				<source id="mp4" src="https://media.w3.org/2010/05/sintel/trailer.mp4" type="video/mp4">
				<source id="webm" src="https://media.w3.org/2010/05/sintel/trailer.webm" type="video/webm">
				<source id="ogv" src="https://media.w3.org/2010/05/sintel/trailer.ogv" type="video/ogg">
				<p>Your user agent does not support the HTML5 Video element.</p>
			</audio>
		`;

		document.body.innerHTML = html;

		document.getElementById('video').load();

	});

	describe('#Html5MediaTracker', function() {

		var tracker;

		beforeEach(function(done) {

			tracker = window.Html5MediaTracker({targets: 'video,audio'});
			done();

		});

		it('should target two elements', function() {

			expect(tracker._players.length).toBe(2);

		});

		it('should throw an exception w/ no targets', function(done) {

			try { 
				window.html5MediaTracker() 
			} catch (err) {
				done();
			}

		});

		it('should have a .on() and .destroy() method', function() {

			expect(typeof tracker.on).toBe('function');
			expect(typeof tracker.destroy).toBe('function');

		});

		describe('.destroy()', function() {

			it('should destroy the tracker', function() {

				var player = document.getElementById('video');
					
				tracker.destroy();

				expect(tracker._handlers).toBeUndefined();
				expect(tracker._bindings).toBeUndefined();
	
			});

		});

		describe('.on()', function() {

			it('should add events when `on()` is called with events', function() {

				tracker.on({ events: ['play'] }, function(){});
			
				var player = document.getElementById('video');
				var id = player.__html5PlayerId__;
				var handlers = tracker._handlers[id];
		
				expect(handlers.play).toBeDefined();
				expect(handlers.play.length).toBe(1);

			});

			it('should add events when `on()` is called with percentages', function() {

				tracker.on({ percentages: { each: [10] } }, function(){});
			
				var player = document.getElementById('video');
				var id = player.__html5PlayerId__;
				var handlers = tracker._handlers[id];
	
				expect(handlers[Math.floor(0.10 * player.duration)]).toBeDefined();
				expect(handlers[Math.floor(0.10 * player.duration)].length).toBe(1);

			});

			it('should add events when `on()` is called with seconds', function() {

				tracker.on({ seconds: { each: [10] } }, function(){});
	
				var player = document.getElementById('video');
				var id = player.__html5PlayerId__;
				var handlers = tracker._handlers[id];
	
				expect(handlers['10']).toBeDefined();
				expect(handlers['10'].length).toBe(1);

			});

			describe('handler calls', function() {

				var tracker;
				var events;

				beforeEach(function(done) {
			
					tracker = window.Html5MediaTracker({targets: 'video'});
					done();

				});

				describe('events', function() {

					it('should see a play event', function(done) {

						var player = document.getElementById('audio'); 
						var audioTracker = window.Html5MediaTracker({targets: 'audio'});

						audioTracker.on({
							events: ['play']
						}, function(evt) {

							expect(evt.label).toBe('play');
							expect(evt.seconds).toBe(0);
							expect(evt.player).toBe(player);

							done();

						});

						player.play();
			
					});

					it('should see a pause event', function(done) {

						var player = document.getElementById('video'); 

						tracker.on({
							events: ['pause']
						}, function(evt) {

							expect(evt.label).toBe('pause');
							expect(evt.seconds).toBe(Math.floor(player.currentTime));
							expect(evt.player).toBe(player);

							done();

						});

						player.play().then(function() {

							setTimeout(player.pause.bind(player), 1)

						});

					});

					it('should see only an ended event', function(done) {

						var player = document.getElementById('video'); 
						var evts;							

						tracker.on({
							events: ['pause', 'ended']
						}, function(evt) {

							expect(evt.label).toBe('ended');
							expect(evt.seconds).toBe(Math.floor(player.duration));
							expect(evt.player).toBe(player);

							done();

						});

						player.currentTime = player.duration - 1;
						player.play();

					});

				});

				describe('percentages', function() {

					it('should fire after percentages are reached', function(done) {

						var player = document.getElementById('video');
						var evts = [];

						tracker.on({
							percentages: {
								each: [10, 90],
								every: [25]
							}
						}, function(evt) {

							evts.push(evt);

							if (evts.length === 6) {

								var evtOne = evts[0];

								expect(evts.map(function(evt) { return evt.label; }).join())
									.toBe('10%,25%,50%,75%,90%,100%');
								
								expect(evtOne.label).toBe('10%');
								expect(evtOne.seconds).toBe(Math.floor(player.duration * 0.1));
								expect(evtOne.player).toBe(player);

								done();

							}

						});

						player.play().then(function() {

							player.currentTime = player.duration;

						});

					});

				});

				describe('seconds', function() {

					it('should fire after seconds are reached', function(done) {

						var ts = window.Html5MediaTracker._translateSeconds;
						var player = document.getElementById('video');
						var everyCalls = Math.ceil(player.duration / 2);
						var resultLabels = [ts(1)];
						var i;
						var evts = [];

						for (i = 1; i < everyCalls; i++) { resultLabels.push(ts(2 * i)); }

						tracker.on({
							seconds: {
								each: [1],
								every: [2]
							}
						}, function(evt) {

							evts.push(evt);
							var evtOne;

							if (evts.length === Math.ceil(player.duration / 2)) {

								var evtOne = evts[0];

								expect(evts.map(function(evt) { return evt.label; }).join())
									.toBe(resultLabels.join());
								
								expect(evtOne.label).toBe('00:00:01');
								expect(evtOne.seconds).toBe(1);
								expect(evtOne.player).toBe(player);
								done();

							}

						});

						player.play().then(function() {

							player.currentTime = player.duration;

						});

					});

				});

			});

			describe('edge cases', function() {

				describe('two handlers on the same point', function() {

					it('should fire both handlers', function(done) {

						var player = document.getElementById('video');
						var flagOne = false;
						var flagTwo = false;

						tracker.on({
							events: ['play']
						}, clearFlagOne);

						tracker.on({
							events: ['play']
						}, clearFlagTwo);

						player.play().then(function() {

							player.pause();

							setTimeout(function() { 

								expect(flagOne).toEqual(flagTwo);
								done();

							}, 1);

						});

						function clearFlagOne() { flagOne = true; }						
						function clearFlagTwo() { flagTwo = true; }						

					});

				});

				describe('illegal percentages', function() {

					it('should ignore illegal percentages', function() {

						var player = document.getElementById('video');
						var id = player.__html5PlayerId__;

						tracker.on({percentages: { each: [101], every: [105] }}, function(){});

						expect(Object.keys(tracker._handlers[id]).length).toBe(0);

					});

				});

				describe('streaming media', function() {

					beforeEach(function(done) {

						var player = document.getElementById('video');
						var mock = Object.assign({}, player, {duration: Infinity});
						var mock = {
							duration: Infinity,
							currentTime: 0,
							addEventListener: function() {},
							tagName: 'VIDEO',
							__html5PlayerId__: 99,
							readyState: 4
						};

						tracker._players = [mock];

						done();

					});

					it('should ignore percentages when .duration is Infinity', function() {

						tracker.on({percentages: { each: [101], every: [105] }}, function(){});

						expect(Object.keys(tracker._handlers['99']).length).toBe(0);

					});

				});

			});

		});

	});

	describe('._translateSeconds()', function() {

		it('should correctly render the times', function() {

			var ts = window.Html5MediaTracker._translateSeconds;

			expect(ts(1)).toBe('00:00:01');
			expect(ts(61)).toBe('00:01:01');
			expect(ts(3661)).toBe('01:01:01');
			expect(ts(360000)).toBe('100:00:00');

		});

	});

});

