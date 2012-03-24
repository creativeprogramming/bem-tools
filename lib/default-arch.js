var INHERIT = require('inherit'),
    PATH = require('./path'),
    util = require('./util'),
    Q = require('q'),
    MAKE = require('./make'),
    registry = MAKE.Registry;

exports.Arch = INHERIT({
    __constructor: function(arch, root) {
        this.arch = arch;
        this.root = root;
        this.nodePrefix = PATH.basename(root) + '/';
    },

    bundlesLevelsRegexp: /^(pages.*|bundles.*)/i,

    libraries: {
//        "bem-bl": {
//            type: 'git',
//            url: 'git://github.com/bem/bem-bl.git',
//            treeish: 'master'
//        }
    },

    nodePrefix: function(){return this.nodePrefix},

    getLibraries: function() {
        return this.libraries;
    },

    alterArch: function() {
        var _this = this;

        return Q.when(_this.createCommonNodes(),
            function(common) {
                return Q.when(_this.createBlockLibrariesNodes(common),
                    function(libs) {
                        return _this.createBundlesLevelsNodes(common, libs);
                    }
                )
            })
            .then(function() {
                console.log(_this.arch.toString());
                return _this.arch;
            });
    },

    createCommonNodes: function() {
        var build;

        this.arch.setNode(
            this.nodePrefix + 'blocks',
            new (registry.getNodeClass('LevelNode'))('blocks'),
            build = this.arch.setNode(
                this.nodePrefix + 'build',
                new (registry.getNodeClass('Node'))('build'),
                this.arch.setNode(
                    'all',
                    new (registry.getNodeClass('Node'))('all'))));

        return build;
    },

    createBlockLibrariesNodes: function(parent) {
        var _this = this,
            libs = this.getLibraries(),
            res = [];

        for (var l in libs) {
            return MAKE.createGraph(_this.absolutePath(l)).then(function(arch){
                arch.removeNode('all');

                for (var n in arch.nodes){
                    _this.arch.setNode(n, arch.nodes[n]);
                }

                for (var n in arch.nodes){
                    _this.arch.link(n, arch.parents[n]);
                }

//                _this.arch.link(arch.children, arch.parents);

//                for (var n in arch.nodes){
//                    res.push(
//                        _this.arch.setNode(
//                            //_this.nodePrefix + arch.nodePrefix() +
//                                n,
//                            arch.nodes[n],
//                            (arch.parents[n] || []).map(function(n){
//                                return /*_this.nodePrefix + arch.nodePrefix + */ n;
//                            }).concat([parent]),
//                            (arch.children[n] || []).map(function(n){
//                                return /*_this.nodePrefix + arch.nodePrefix +*/ n;
//                            })
//                        )
//                    );
//                    console.log(n + ' ' + arch.parents[n] + '; ' + arch.children[n]);
//                };

                res.push('bem-bl/build');
                _this.arch.setNode(
                    //_this.nodePrefix + arch.nodePrefix +
                    l+'-get',
                    new (registry.getNodeClass('LibraryNode'))(
                        _this.absolutePath(l),
                        libs[l].url,
                        libs[l].treeish),
                    arch.findLeaves());

                return res;
            });

        }


    },

    createBundlesLevelsNodes: function(parent, children) {
        var _this = this;

        return this.getBundlesLevels().then(function(levels) {
            return levels.map(function(level) {
                return _this.arch.setNode(
                    _this.nodePrefix + level,
                    new (registry.getNodeClass('BundlesLevelNode'))(_this.absolutePath(level)), parent, children);
            });
        });
    },

    getBundlesLevels: function() {
        var _this = this;
        return util.getDirsAsync(this.root)
            .invoke('filter', function(dir) {
                return dir.match(_this.bundlesLevelsRegexp);
            });
    },

    absolutePath: function(path) {
        return PATH.join(this.root, path);
    }
});
