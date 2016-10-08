var gulp        = require('gulp');
var browserSync = require('browser-sync').create();
var sass        = require('gulp-sass');

gulp.task('serve', ['sass'], function() {
    browserSync.init({
        server: {
          baseDir: '.',
          index: 'popup.html',
        }
    });

    gulp.watch('*.scss', ['sass']);
    gulp.watch(['*.html', 'popup.js']).on('change', browserSync.reload);
});

gulp.task('sass', function() {
    return gulp.src('*.scss')
        .pipe(sass())
        .pipe(gulp.dest('css'))
        .pipe(browserSync.stream());
});

gulp.task('default', ['serve']);
