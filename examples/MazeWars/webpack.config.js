const HtmlWebPackPlugin = require('html-webpack-plugin');
//const HtmlMinimizerPlugin = require('html-minimizer-webpack-plugin');
const path = require('path');

module.exports = {
    entry : './mazewars04.js',
    output: {
        path: path.join(__dirname, 'dist'),
        filename: '[name]-[contenthash:8].js',
        chunkFilename: 'chunk-[name]-[contenthash:8].js',
    },
    devServer: {
        allowedHosts: 'all',
        port: 9091,
        static: {
            directory: path.join(__dirname, 'assets'),
            publicPath: '/assets'
          }
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
                test: /\.(wav|png|svg|jpg|gif|mp3|glb)$/,
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
