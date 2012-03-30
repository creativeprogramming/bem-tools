var INHERIT = require('inherit'),
    PATH = require('path'),
    createLevel = require('../index').createLevel,

    MagicNode = require('./magic').MagicNode,
    FileNode = require('./file').FileNode,
    BemCreateNode = require('./create').BemCreateNode,
    BemBuildNode = require('./build').BemBuildNode,
    BemBuildMetaNode = require('./build').BemBuildMetaNode;

var BundleNode = exports.BundleNode = INHERIT(MagicNode, {

    __constructor: function(level, bundleNameOrItem, subBundleName) {
        this.level = typeof level == 'string'? createLevel(level) : level;

        this.item = (typeof bundleNameOrItem === 'string')? createItem(bundleNameOrItem, subBundleName) : bundleNameOrItem;

        this.__base(PATH.dirname(this.getNodePrefix()));
    },

    make: function(ctx) {

        if (ctx.arch.hasNode(this.path)) return;

        return ctx.arch.withLock(this.alterArch(ctx), this);

    },

    alterArch: function(ctx) {

        return function() {

            // create real node for page
            var arch = ctx.arch,
                parents = arch.parents[this.getId()],
                pageNode = arch.setNode(new FileNode(this.path), parents);

            // generate targets for page files
            var techTargets = {};
            for (var tech in this.getTechDeps()) {
                techTargets[tech] = arch.replaceNode(this.createNode(ctx, tech), pageNode);
            }

            // link targets for page files with each other
            this.linkNodes(ctx, techTargets);

        }

    },

    createNode: function(ctx, tech) {
        if (this['create-node-' + tech]) {
            return this['create-node-' + tech](ctx, tech);
        }
        return new FileNode(this.getPath(tech));
    },

    linkNodes: function(ctx, techTargets) {
        for (var t in techTargets) {
            var target = techTargets[t];

            if (target.getDependencies)
                for(var d in target.getDependencies()) techTargets[d] && ctx.arch.link(techTargets[d], target);
        }
    },

    getPath: function(tech) {
        // TODO: use Tech object to construct paths
        return this.getNodePrefix() + '.' + tech;
    },

    // TODO: leave only the list of keys, not used anymore
    // TODO: add getDependencies() methood to bem-bl's html and bemhtml teches
    getTechDeps: function() {
        return {
            'bemjson.js': [],
            'bemdecl.js': ['bemjson.js'],
            'deps.js': ['bemdecl.js'],
            'html': ['bemjson.js', 'bemhtml.js'],
            'bemhtml.js': ['deps.js'],
            'css': ['deps.js'],
            'ie.css': ['deps.js'],
            'js': ['deps.js']
        };
    },


    getNodePrefix: function() {
        if (!this._nodeSuffix) {
            this._nodeSuffix = PATH.join(PATH.basename(this.level.dir), this.level.getRelByObj(this.item));
        }
        return this._nodeSuffix;
    },

    getLevels: function(prefix) {
        return [].concat(
            this.level.getConfig().bundleBuildLevels,
            [ PATH.join(PATH.dirname(prefix), 'blocks') ]);
    },

    getBemBuildNode: function(ctx, techName, techPath, declTech, forked) {
        var buildNode = new BemBuildNode(this.getLevels(this.getNodePrefix()), this.getPath(declTech), techPath, techName, this.getNodePrefix(), forked);

        // FIXME: rething of this.createNode(ctx, declTech).getId()
        // meta.js node should depend on file of declaration
        ctx.arch.setNode(buildNode.getMetaNode(), buildNode.getId(), this.createNode(ctx, declTech).getId());

        return buildNode;
    },

    'create-node-bemdecl.js': function(ctx, tech) {
        return new BemCreateNode(this.level, this.item, tech, tech);
    },

    'create-node-deps.js': function(ctx, tech) {
        return this.getBemBuildNode(ctx, tech, tech, 'bemdecl.js');
    },

    'create-node-html': function(ctx, tech) {
        // TODO: move node to bem-bl/blocks-common/i-bem/bem
        var techHtml = require.resolve(PATH.resolve(this.level.dir, '../bem-bl/blocks-common/i-bem/bem/techs/html'));
        return new BemCreateNode(this.level, this.item, techHtml, tech);
    },

    'create-node-bemhtml.js': function(ctx, tech) {
        // TODO: move node to bem-bl/blocks-common/i-bem/bem
        var techBemHtml = require.resolve(PATH.resolve(this.level.dir, '../bem-bl/blocks-common/i-bem/bem/techs/bemhtml.js'));
        return this.getBemBuildNode(ctx, tech, techBemHtml, 'deps.js', true);
    },

    'create-node-js': function(ctx, tech) {
        return this.getBemBuildNode(ctx, tech, tech, 'deps.js');
    },

    'create-node-css': function(ctx, tech) {
        return this.getBemBuildNode(ctx, tech, tech, 'deps.js');
    },

    'create-node-ie.css': function(ctx, tech) {
        return this.getBemBuildNode(ctx, tech, tech, 'deps.js');
    }
});

function createItem(bundleName, subBundleName) {
    var item = { block: bundleName };

    if (subBundleName) item.elem = subBundleName;

    return item;
}
