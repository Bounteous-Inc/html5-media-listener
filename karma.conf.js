module.exports = function(config) {
  'use strict';

  config.set({

    basePath: './',

    frameworks: ["jasmine"],

    files: [
      'src/*.js',
      'test/**/*.spec.js'
    ],

    autoWatch: true,

    browsers: ['Chrome']

  });
};
