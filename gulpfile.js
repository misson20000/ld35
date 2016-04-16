var gulp = require('gulp');

var rollup = require('gulp-rollup');
var babel = require('gulp-babel');

//var rollup = require('rollup');
//var babel = require('babel-core');
var fs = require('fs');

var mainBowerFiles = require('main-bower-files');

var del = require('del');

var webserver = require('gulp-webserver');


gulp.task('compile', function() {
  return gulp.src('./source/main.js', {read: false})
    .pipe(rollup())
    .pipe(babel({
      presets: ["es2015"]
    }))
    .pipe(gulp.dest('dist'));
});
gulp.task('libraries', function() {
  return gulp.src(mainBowerFiles({includeDev:true}))
    .pipe(gulp.dest('./dist/lib'));
});
gulp.task('assets', function() {
  return gulp.src('./assets/**/*')
    .pipe(gulp.dest('./dist'));
});
gulp.task('watch', function() {
  gulp.watch('./source/**/*', ['compile']);
  gulp.watch('./assets/**/*', ['assets']);
});
gulp.task('webserver', function() {
  gulp.src('./dist')
	.pipe(webserver({
	    host: "0.0.0.0"
	}));
});
gulp.task('watchserver', ['watch', 'webserver']);

gulp.task('clean', function(cb) {
  del('./dist/**/*').then(function() { cb(); });
});

gulp.task('default', ['compile', 'assets', 'libraries']);
