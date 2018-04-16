describe('html5MediaListener', function(){
	'use strict';
	

	describe('#html5MediaListener', function() {

		var html5MediaListener;

		beforeEach(function(done) {

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

			html5MediaListener = window.Html5MediaListener._constructor();

		});

		afterEach(function() { 

			html5MediaListener.destroy(); 
			html5MediaListener = null; 

		});

		it('should throw an exception w/ no events', function(done) {

			try { 
				html5MediaListener('video', function() {}); 
			} catch (err) {
				done();
			}

		});

		it('should have an .on(), .off(), and .destroy() method', function() {

			expect(typeof html5MediaListener.on).toBe('function');
			expect(typeof html5MediaListener.off).toBe('function');
			expect(typeof html5MediaListener.destroy).toBe('function');

		});


		it('should destroy the listener', function(done) {

			var player = document.getElementById('video');
			var evts = [];
				
			html5MediaListener.on({events: ['play']}, function(evt) { evts.push(evt); });

			html5MediaListener.destroy();

			player.play().then(function() {

				setTimeout(function() {
					expect(evts.length).toBe(0);
					// @TODO expect(html5MediaListener).toBeUndefined())
					done();
				},0);

			});

		});


		it('should unregister a handler', function(done) {
	
			var player = document.getElementById('video');
			var evts = [];
				
			function handler(evt) { evts.push(evt); }

			html5MediaListener.on({events: ['play']}, handler);
			html5MediaListener.off({events: ['play']}, handler);

			player.play().then(function() {

				setTimeout(function() {
					expect(evts.length).toBe(0);
					done();
				},0);

			});

		});

		it('should see a play event', function(done) {

			var player = document.getElementById('audio'); 

			html5MediaListener.on('audio', {
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

			html5MediaListener.on({
				events: ['pause']
			}, function(evt) {

				expect(evt.label).toBe('pause');
				expect(evt.seconds).toBeLessThan(2);

				done();

			});

			player.play().then(function() {

				setTimeout(player.pause.bind(player), 1);

			});

		});


		it('should fire after percentages are reached', function(done) {

			var player = document.getElementById('video');
			var evts = [];

			html5MediaListener.on({
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
					expect(evtOne.seconds).toBe(Math.ceil(player.duration * 0.1));
					expect(evtOne.player).toBe(player);

					done();

				}

			});

			player.play().then(function() {

				player.currentTime = player.duration;

			});

		});

		it('should fire after seconds are reached', function(done) {

			var ts = html5MediaListener._translateSeconds;
			var player = document.getElementById('video');
			var everyCalls = Math.ceil(player.duration / 2);
			var resultLabels = [ts(1)];
			var evts = [];
			var i;

			for (i = 1; i < everyCalls; i++) { resultLabels.push(ts(2 * i)); }

			html5MediaListener.on({
				seconds: {
					each: [1],
					every: [2]
				}
			}, function(evt) {

				var evtOne;

				evts.push(evt);

				if (evts.length === Math.ceil(player.duration / 2)) {

					evtOne = evts[0];

					expect(evts.map(function(evt) { return evt.label; }).join()).toBe(resultLabels.join());
					
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

		it('should only register a handler one time per type/handler combo', function(done) {

			var player = document.getElementById('video');

			function callCounter(evt) { 
				callCounter.called++;
			}
			callCounter.called = 0;

			html5MediaListener.on({events: ['play']}, callCounter);
			html5MediaListener.on({events: ['play', 'pause']}, callCounter);

			player.play().then(function() {

				setTimeout(function() {

					expect(callCounter.called).toBe(1); 
					player.pause();

					setTimeout(function() {

						expect(callCounter.called).toBe(2);
						done();

					}, 1);

				}, 1);

			});
			
		});

		it('should fire both handlers', function(done) {

			var player = document.getElementById('video');
			var flagOne = false;
			var flagTwo = false;

			html5MediaListener.on({
				events: ['play']
			}, clearFlagOne);

			html5MediaListener.on({
				events: ['play']
			}, clearFlagTwo);

			player.play().then(function() {

				setTimeout(function() {

					player.pause();

					setTimeout(function() { 

						expect(flagOne).toEqual(flagTwo);
						done();

					}, 1);

				}, 1);

			});

			function clearFlagOne() { flagOne = true; }						
			function clearFlagTwo() { flagTwo = true; }						

		});

		it('should fire for both percentage and seconds events', function(done) {

			var evts = [];
			var player = document.getElementById('video');
	
			html5MediaListener.on({
				percentages: {
					each: [10]
				},
				seconds: {
					each: [4]
				}
			}, function(evt) {
	
				evts.push(evt);
				if(evts.length === 2) { done(); }

			});	
	
			player.currentTime = 10;

		});

		it('should see only an ended event', function(done) {

			var player = document.getElementById('video');

			html5MediaListener.on({
				events: ['ended', 'pause']
			}, function(evt) {
	
				expect(evt.label).toBe('ended');
				done();

			});

			player.currentTime = player.duration - 0.1;

			player.play();

		});

    it('should fire all events on the same .on() call', function(done) {

      var player = document.getElementById('video');
      var expected = [
        'play', 'pause', 'play', '00:00:05', '10%', '00:00:10', '25%',
        '00:00:20', '00:00:40', '50%', '75%', '90%', '100%', 'ended'
      ];
      var outcome = [];

      html5MediaListener.on({
        percentages: {
          each: [10, 90],
          every: [25],
        },
        seconds: {
          each: [5, 10],
          every: [20]
        },
        events: ['play', 'pause', 'ended']      
      }, function(evt) {

        outcome.push(evt.label);
        if (evt.label === 'ended') {

          expect(outcome.join()).toBe(expected.join())
          done();

        }

      });

      player.play().then(function() {

        player.pause();
        setTimeout(function() {

          player.currentTime = player.duration - 0.5;
          setTimeout(function() { player.play(); }, 0);

        }, 0);

      });

    });

	});

	describe('._calcEveryPercentage()', function() {

		it('should correctly calculate multiples of many ns, deduplicate, and order', function() {

			var ns = [25, 10];
			var expected = [10, 20, 25, 30, 40, 50, 60, 70, 75, 80, 90, 100];
			var outcome = Html5MediaListener._calcEveryPercentage(ns);

			expect(outcome).toEqual(expected);

		});

	});

	describe('._translateSeconds()', function() {

		it('should correctly render the times', function() {

			var ts = Html5MediaListener._translateSeconds;

			expect(ts(1)).toBe('00:00:01');
			expect(ts(61)).toBe('00:01:01');
			expect(ts(3661)).toBe('01:01:01');
			expect(ts(360000)).toBe('100:00:00');

		});

	});

});

