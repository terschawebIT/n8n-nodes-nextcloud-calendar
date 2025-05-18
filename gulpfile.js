const { src, dest } = require('gulp');

/**
 * Kopiert die Node-Icons in den dist-Ordner
 */
function buildIcons() {
	return src('nodes/**/*.svg').pipe(dest('dist/nodes'));
}

exports.build = buildIcons;
exports.default = buildIcons;
