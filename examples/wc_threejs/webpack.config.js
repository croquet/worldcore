const HtmlWebPackPlugin = require('html-webpack-plugin');

var path = require('path');

module.exports = {
    entry : './demo_three.js',
    output: {
        path: path.join(__dirname, 'dist'),
        filename: '[name]-[contenthash:8].js',
        chunkFilename: 'chunk-[name]-[contenthash:8].js',
    },
    devServer: {
        disableHostCheck: true,
        contentBase: path.join(__dirname, 'dist'),
        port: 1234
    },
    module: {
        rules: [
            {
                test: /\.(png|svg|jpg|gif|mp3|obj|mtl)$/,
                loader: 'file-loader',
                options: {
                    name: '[contenthash:8].[ext]',
                },
            },
        ],
    },
    // HACK: de-duplicate croquet and three.js
    resolve: {
        alias: {
            "@croquet/croquet": path.resolve(__dirname, 'node_modules/@croquet/croquet/pub/croquet-croquet.js'),
            "three": path.resolve(__dirname, 'node_modules/three'),
        }
    },
    plugins: [
        new HtmlWebPackPlugin({
            template: 'index.html',   // input
            filename: 'index.html',   // output filename in dist/
        }),
    ]
};
