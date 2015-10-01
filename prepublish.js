'use strict';

var fs = require('fs');
var uglify = require('uglify-js');
var runtime = require('./');

try {
  fs.mkdirSync(__dirname + '/lib');
} catch (ex) {
  if (ex.code !== 'EEXIST') throw ex;
}
var source = fs.readFileSync(__dirname + '/index.js', 'utf8');
var ast = uglify.parse(source);

var dependencies = {};
var internals = {'dependencies': true, 'internals': true};
var sources = {};
ast.body.forEach(function (node) {
  var name;
  switch (node.TYPE) {
    case 'Defun': name = node.name.name;                break;
    case 'Var':   name = node.definitions[0].name.name; break;
  }
  if (!name || !/^jade\_/.test(name)) return;
  name = name.replace(/^jade\_/, '');

  var src = uglify.minify(source.substring(node.start.pos, node.end.endpos), {fromString: true}).code;
  sources[name] = src;

  dependencies[name] = [];
  if (node.TYPE === 'Defun') {
    var ast = uglify.parse(src);
    ast.figure_out_scope();
    var globals = ast.globals.map(function (val, key) {
      return key;
    });
    dependencies[name] = globals.filter(function (key) { return /^jade\_/.test(key); })
                                .map(function (key) { return key.replace(/^jade\_/, ''); });
  }

  if (!runtime[name]) internals[name] = true;
});

Object.keys(dependencies).forEach(function (fn) {
  dependencies[fn] = dependencies[fn].sort();
});

fs.writeFileSync(__dirname + '/lib/dependencies.js', 'module.exports = ' + JSON.stringify(dependencies, null, 2) + '\n');
fs.writeFileSync(__dirname + '/lib/internals.js', 'module.exports = ' + JSON.stringify(internals, null, 2) + '\n');
fs.writeFileSync(__dirname + '/lib/sources.js', 'module.exports = ' + JSON.stringify(sources, null, 2) + '\n');
