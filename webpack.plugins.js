const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');
const VueLoaderPlugin = require('vue-loader/lib/plugin');
const CopyPlugin = require("copy-webpack-plugin");

module.exports = [
    new ForkTsCheckerWebpackPlugin(),
    new VueLoaderPlugin(),
    new CopyPlugin({
        patterns: [
            //               { from: "src/preload.js" },
            { from: "test", to: "test" }
        ],
    }),    
];