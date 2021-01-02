const rules = require('./webpack.rules');
const plugins = require('./webpack.plugins');
const TsconfigPathsPlugin = require("tsconfig-paths-webpack-plugin");
const path = require('path');



rules.push({
    test: /\.css$/,
    use: [{ loader: 'style-loader' }, { loader: 'css-loader' }],
});

module.exports = {
    module: {
        rules,
    },
    watchOptions: {
        ignored: [
            'test/**', 'node_modules/**'
        ]
    },
    plugins: plugins,
    resolve: {
        alias: {
            'vue$': 'vue/dist/vue.esm.js',
            _: path.resolve(__dirname, 'src/')
        },
        plugins: [new TsconfigPathsPlugin({})],
        extensions: ['.js', '.ts', '.jsx', '.tsx', '.css', '.vue']
    },
};