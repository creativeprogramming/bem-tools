var INHERIT = require('inherit'),
    PATH = require('path'),
    createLevel = require('../level').createLevel,

    MagicNode = require('./magic').MagicNode,
    FileNode = require('./file').FileNode,
    BundleNode = require('./bundle').BundleNode,
    BlockNode = require('./block').BlockNode,
    registry = require('../make').Registry;

var LevelNode = exports.LevelNode = INHERIT(MagicNode, {

    __constructor: function(level) {
        this.level = typeof level == 'string'? createLevel(level) : level;
        // TODO: path relative to the project root must be passed
        this.__base(PATH.basename(this.level.dir));
    },

    itemNodeClassName: 'BlockNode',

    make: function(ctx) {

        return ctx.arch.withLock(this.alterArch(ctx), this);

    },

    alterArch: function(ctx) {

        return function() {

            // create real node for level
            var arch = ctx.arch,
                thisNode = this.getId(),
                levelNode = arch.setNode(new FileNode(this.path), arch.parents[thisNode]),

                // scan level for items
                decl = this.level.getDeclByIntrospection();

            // generate targets for items
            var _this = this;
            decl.forEach(function(block) {
                var itemNode = arch.setNode(new (registry.getNodeClass(_this.itemNodeClassName))(_this.level, block.name), levelNode, thisNode);

                // generate targets for elems
                if (block.elems) block.elems.forEach(function(elem) {
                    arch.setNode(new (registry.getNodeClass(_this.itemNodeClassName))(_this.level, block.name, elem.name), itemNode, thisNode);
                });
            });

        }

    }
});


exports.BundlesLevelNode = INHERIT(LevelNode, {

    itemNodeClassName: 'BundleNode'

});
