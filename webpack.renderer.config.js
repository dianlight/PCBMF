const rules = require('./webpack.rules');
const plugins = require('./webpack.plugins');
const TsconfigPathsPlugin = require("tsconfig-paths-webpack-plugin");


rules.push({
    test: /\.css$/,
    use: [{ loader: 'style-loader' }, { loader: 'css-loader' }],
});

module.exports = {
    module: {
        rules,
    },
    plugins: plugins,
    resolve: {
        alias: {
            'vue$': 'vue/dist/vue.esm.js',
        },
        plugins: [new TsconfigPathsPlugin({})],
        extensions: ['.js', '.ts', '.jsx', '.tsx', '.css', '.vue']
    },
};