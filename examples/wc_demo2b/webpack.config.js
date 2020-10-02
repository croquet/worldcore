const HtmlWebPackPlugin = require('html-webpack-plugin');
const request = require('sync-request');
const path = require('path');

module.exports = {
    entry : './index.js',
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
                test: /\.(png|svg|jpg|gif|mp3|fbx)$/,
                loader: 'file-loader',
                options: {
                    name: '[contenthash:8].[ext]',
                },
            },
        ],
    },
    // use Croquet loaded via <script>
    externals: {
        "@croquet/croquet": "Croquet",
    },
    plugins: [
        new HtmlWebPackPlugin({
            template: 'index.html',   // input
            filename: 'index.html',   // output filename in dist/
            templateParameters: () => {
                let latest_pre = "latest-pre";
                try {
                    latest_pre = request('GET', 'https://croquet.io/sdk/croquet-latest-pre.txt').getBody('utf8').trim();
                } catch (error) {
                    console.warn('failed to fetch version from https://croquet.io/sdk/croquet-latest-pre.txt');
                }
                return { 'latest_pre': latest_pre };
            },
        }),
    ]
};
