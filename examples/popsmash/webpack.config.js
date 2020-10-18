const HtmlWebPackPlugin = require('html-webpack-plugin');
const fetch = require('node-fetch');
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
            templateParameters: async () => {
                const response = await fetch('https://croquet.io/sdk/croquet-latest-pre.txt');
                if (!response.ok) throw Error(`${response.status} ${response.statusText} ${response.url}`);
                const body = await response.text();
                return { 'latest_pre': body.trim() };
            },
        }),
    ]
};
