const fs = require('fs');
const rules = require('./src/rules');
const pkg = JSON.parse(fs.readFileSync('./package.json', 'utf8'));

module.exports = {
	meta: {
		name: pkg.name,
		version: pkg.version,
	},
	rules,
};
