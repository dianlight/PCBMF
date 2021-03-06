const CopyPlugin = require("copy-webpack-plugin");
const TsconfigPathsPlugin = require("tsconfig-paths-webpack-plugin");


module.exports = {
    /**
     * This is the main entry point for your application, it's the first file
     * that runs in the main process.
     */
    entry: './src/index.ts',
    // Put your normal webpack config below here
    module: {
        rules: require('./webpack.rules'),
    },
    watchOptions: {
        ignored: [
            'test/**', 'node_modules/**'
        ]
    },
    plugins: [
        new CopyPlugin({
            patterns: [
                //               { from: "src/preload.js" },
                { from: "node_modules/tightcnc", to: "node_modules/tightcnc" }
            ],
        }),
    ],
    resolve: {
        plugins: [new TsconfigPathsPlugin({})],
        extensions: ['.js', '.ts', '.jsx', '.tsx', '.css', '.json'],
    },
};