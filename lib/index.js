'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.mapToRelative = mapToRelative;
var path = require('path');

function createFilesMap(state) {
    var result = {};
    if (!Array.isArray(state.opts)) {
        state.opts = [state.opts];
    }

    state.opts.forEach(function (moduleMapData) {
        result[moduleMapData.expose] = moduleMapData.src;
    });

    return result;
}

function mapToRelative(currentFile, module) {
    var from = path.dirname(currentFile);
    var to = path.normalize(module);

    from = path.isAbsolute(from) ? from : path.resolve(process.env.PWD || process.cwd(), from);
    to = path.isAbsolute(to) ? to : path.resolve(process.env.PWD || process.cwd(), to);

    var moduleMapped = path.relative(from, to);

    if (moduleMapped[0] !== '.') moduleMapped = './' + moduleMapped;
    return moduleMapped;
}

function mapModule(modulePath, state, filesMap) {
    var moduleSplit = modulePath.split('/');

    if (!filesMap.hasOwnProperty(moduleSplit[0])) {
        return null;
    }

    moduleSplit[0] = filesMap[moduleSplit[0]];
    return mapToRelative(state.file.opts.filename, moduleSplit.join('/'));
}

exports.default = function (_ref) {
    var t = _ref.types;

    function transformRequireCall(nodePath, state, filesMap) {
        if (!t.isIdentifier(nodePath.node.callee, { name: 'require' }) && !(t.isMemberExpression(nodePath.node.callee) && t.isIdentifier(nodePath.node.callee.object, { name: 'require' }))) {
            return null;
        }

        var moduleArg = nodePath.node.arguments[0];
        if (moduleArg && moduleArg.type === 'StringLiteral') {
            var modulePath = mapModule(moduleArg.value, state, filesMap);
            if (modulePath) {
                nodePath.replaceWith(t.callExpression(nodePath.node.callee, [t.stringLiteral(modulePath)]));
            }
        }
    }

    function transformImportCall(nodePath, state, filesMap) {
        var moduleArg = nodePath.node.source;
        if (moduleArg && moduleArg.type === 'StringLiteral') {
            var modulePath = mapModule(moduleArg.value, state, filesMap);
            if (modulePath) {
                nodePath.replaceWith(t.importDeclaration(nodePath.node.specifiers, t.stringLiteral(modulePath)));
            }
        }
    }

    return {
        visitor: {
            CallExpression: {
                exit: function exit(nodePath, state) {
                    return transformRequireCall(nodePath, state, createFilesMap(state));
                }
            },
            ImportDeclaration: {
                exit: function exit(nodePath, state) {
                    return transformImportCall(nodePath, state, createFilesMap(state));
                }
            }
        }
    };
};