// @TODO Write a container generator
var fs = require('fs');
var jsBeautify = require('js-beautify').js_beautify;
var outputFilename = 'html5-media-listener';

module.exports = function(grunt) {

  var footer = ['/*',
                ' * v<%= pkg.version %>',
                ' * Created by the Google Analytics consultants at http://www.lunametrics.com/',
                ' * Written by @notdanwilkerson',
                ' * Documentation: https://github.com/lunametrics/html5-media-listener/',
                ' * Licensed under the MIT License',
                ' */'
  ].join('\r\n');

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    jshint: {
      ignore_warning: {
        options: {
          '-W030': true,
          '-W058': true
        },
        src: ['./src/*.js']
      }
    },
    uglify: {
      options: {
        footer: '\r\n' + footer
      },
      build: {
        src: './src/index.js',
        dest: './' + outputFilename + '.min.js'
      }
    },
    appendFooter: {
      options: {
        build: {
          src: './src/index.js',
          dest: './' + outputFilename + '.js'
        },
        footer: footer
      }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-jshint');

  grunt.registerTask('appendFooter', ['append credits to footer'], function() {

    var options = this.options();
    var data = fs.readFileSync(options.build.src, 'utf-8');
    fs.writeFileSync(options.build.dest, data + options.footer);
    console.log('appended footer to unminifed script');

  });

  grunt.registerTask('default', ['jshint', 'appendFooter', 'uglify']);

};
