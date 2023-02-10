const HtmlWebPackPlugin = require('html-webpack-plugin');

var path = require('path');

module.exports = {
    entry : './index.js',
    output: {
        path: path.join(__dirname, 'dist'),
        filename: '[name]-[contenthash:8].js',
        chunkFilename: 'chunk-[name]-[contenthash:8].js',
    },
    devServer: {
        allowedHosts: 'all',
        port: 1234
    },
    resolve: {
       fallback: { "crypto": false }
    },
    experiments: {
        asyncWebAssembly: true,
    },
    module: {
        rules: [
            {
                test: /\.(png|svg|jpg|gif|mp3|fbx|otf)$/,
                loader: 'file-loader',
                options: {
                    name: '[contenthash:8].[ext]',
                },
            },
        ],
    },
    plugins: [
        new HtmlWebPackPlugin({
            template: 'index.html',   // input
            filename: 'index.html',   // output filename in dist/
        }),
    ]
};
