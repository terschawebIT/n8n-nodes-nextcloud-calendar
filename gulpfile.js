const path = require('path');
const { task, src, dest, series } = require('gulp');

task('copy:package', function() {
	return src(['package.json'])
		.pipe(dest('dist'));
});

task('build:icons', function() {
	return src('nodes/**/*.svg')
		.pipe(dest('dist/nodes'));
});

task('build', series('build:icons', 'copy:package'));

function copyIcons() {
	const nodeSource = path.resolve('nodes', '**', '*.{png,svg}');
	const nodeDestination = path.resolve('dist', 'nodes');

	src(nodeSource).pipe(dest(nodeDestination));

	const credSource = path.resolve('credentials', '**', '*.{png,svg}');
	const credDestination = path.resolve('dist', 'credentials');

	return src(credSource).pipe(dest(credDestination));
}
