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
        hot: false,
        port: 1234
    },
    experiments: {
        asyncWebAssembly: true,
    },
    resolve: {
        fallback: { "crypto": false }
    },
    module: {
        rules: [
            {
                test: /\.(png|svg|jpg|gif|mp3)$/,
                loader: 'file-loader',
                options: {
                    name: '[contenthash:8].[ext]',
                },
            },
        ],
    },
    // use Croquet loaded via <script>
    plugins: [
        new HtmlWebPackPlugin({
            template: 'index.html',   // input
            filename: 'index.html',   // output filename in dist/
        }),
    ]
};
