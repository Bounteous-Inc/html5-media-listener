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

		it('should throw an exception w/ no events', function(done) {

			try { 
				window.Html5MediaListener('video', function() {}); 
			} catch (err) {
				done();
			}

		});

		it('should have an .on(), .off(), and .destroy() method', function() {

      expect(typeof Html5MediaListener.on).toBe('function');
			expect(typeof Html5MediaListener.off).toBe('function');
			expect(typeof Html5MediaListener.destroy).toBe('function');

		});

		describe('.destroy()', function() {

			it('should destroy the listener', function(done) {

				var player = document.getElementById('video');
        var evts = [];
					
        Html5MediaListener.on({events: ['play']}, evts.push);

				tracker.destroy();

        player.play().then(function() {

          setTimeout(function() {
            expect(evts.length).toBe(0);
            // @TODO expect(window.Html5MediaListener).toBeUndefined())
            done();
          },0);

        });
	
			});

		});

    describe('remove()', function() {

      it('should unregister a handler', function() {
    
        var evts = [];
					
        Html5MediaListener.on({events: ['play']}, evts.push);
        Html5MediaListener.off({events: ['play']}, evts.push);

        player.play().then(function() {

          setTimeout(function() {
            expect(evts.length).toBe(0);
            done();
          },0);

        });

      });

    });

		describe('.on()', function() {

			describe('handler calls', function() {

				describe('events', function() {

					it('should see a play event', function(done) {

						var player = document.getElementById('audio'); 

						window.Html5MediaTracker.on('audio', {
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

						window.Html5MediaListener.on({
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

						window.Html5MediaListener.on({
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

						window.Html5MediaListener.on({
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

						Html5MediaListener.on({
							seconds: {
								each: [1],
								every: [2]
							}
						}, function(evt) {

							var evtOne;

							evts.push(evt);

							if (evts.length === Math.ceil(player.duration / 2)) {

							  evtOne = evts[0];

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

          it('should only register a handler one time per type/handler combo', function(done) {

            var player = document.getElementById('video');

            function callCounter() { 
              callCounter.called++;
            }
            callCounter.called = 0;

            window.Html5MediaListener.on({events: 'play'}, callCounter);
            window.Html5MediaListener.on({events: ['play', 'pause']}, callCounter);

            player.play().then(function() {

              setTimeout(function() {

                expect(callCounter.called).toBe(1); 
                player.pause();
                expect(callCounter.called).toBe(2);

              }, 0);

            });
            
          });

					it('should fire both handlers', function(done) {

						var player = document.getElementById('video');
						var flagOne = false;
						var flagTwo = false;

						window.Html5MediaListener.on({
							events: ['play']
						}, clearFlagOne);

						window.Html5MediaListener.on({
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

            // @TODO
            return;

						Html5MediaListener.on({percentages: { each: [101], every: [105] }}, function(){});

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

