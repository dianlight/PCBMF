const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');
const VueLoaderPlugin = require('vue-loader/lib/plugin');
const CopyPlugin = require("copy-webpack-plugin");
const webpack = require("webpack");
const ThreadsPlugin = require('threads-plugin');

module.exports = [
    new ForkTsCheckerWebpackPlugin(),
    new VueLoaderPlugin(),
    new CopyPlugin({
        patterns: [
            //               { from: "src/preload.js" },
            { from: "test", to: "test" }
        ],
    }),
    new webpack.NormalModuleReplacementPlugin(
        /(.*)\!webpack/,
        ''
    ),
    new ThreadsPlugin({
        target: 'electron-node-worker'
    })
];