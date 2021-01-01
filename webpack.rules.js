const path = require("path");

module.exports = [
    // Add support for native node modules
    {
        test: /\.node$/,
        use: 'node-loader',
    },
    {
        test: /\.(m?js|node)$/,
        parser: { amd: false },
        use: {
            loader: '@marshallofsound/webpack-asset-relocator-loader',
            options: {
                outputAssetBase: 'native_modules',
                //                debugLog: true,
            },
        },
    },
    /*
    {
        test: /\.worker\.ts$/i,
        use: [
          {
            loader: "worker-loader",
          }
        ]   
    },    
    */  
    {
        test: /\.tsx?$/,
        exclude: /(node_modules|\.webpack)/,
        use: {
            loader: 'ts-loader',
            options: {
                transpileOnly: true,
                appendTsSuffixTo: [/\.vue$/],
            }
        }
    },
    {
        test: /\.vue$/,
        loader: 'vue-loader'
    },
    {
        test: /\.(png|jpg|jpeg|gif|eot|ttf|woff|woff2|svg|svgz)(\?.+)?$/,
        use: [{
            loader: 'url-loader',
            options: {
                limit: 10000
            }
        }]
    }, 
];