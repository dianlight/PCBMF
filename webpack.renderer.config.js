const rules = require('./webpack.rules');
const plugins = require('./webpack.plugins');
const TsconfigPathsPlugin = require("tsconfig-paths-webpack-plugin");
const path = require('path');



rules.push({
    test: /\.css$/,
    use: [{ loader: 'style-loader' }, { loader: 'css-loader' }],
});

rules.push({
    test: /\.s[ac]ss$/i,
    use: [
        // Creates `style` nodes from JS strings
        "style-loader",
        // Translates CSS into CommonJS
        "css-loader",
        // Compiles Sass to CSS
        "sass-loader",
    ],
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
        extensions: ['.js', '.ts', '.jsx', '.tsx', '.css', '.vue', '.scss', '.sass']
    },
};