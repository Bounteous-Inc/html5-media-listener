# HTML5 Media Listener

Provides a simplified interface for listening to events emitted from HTML5 media players. Offers percentage- and seconds-based breakpoints.

```
Html5MediaListener.on('#modal video', {
  events: ['play', 'pause', 'ended'],
  percentages: {
    each: [10, 90],  // Fires once per load
    every: [25]  // Fires every n %, e.g. 25, 50, 75, 100
  },
  seconds: {
    each: [30, 120],
    every: [60]
  }
}, function(evt) {

  console.log(evt.label);  // e.g. 10%, 00:10:00
  console.log(evt.seconds);  // e.g. 60
  console.log(player);  // [HtmlVideoElement]

});
```

For complete documentation and installation instructions, please visit the [forthcoming LunaMetrics recipe page](#)

## License

Licensed under the MIT 2.0 License.
