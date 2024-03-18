const HtmlWebPackPlugin = require('html-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
    entry : './index.js',
    output: {
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
        // regular bundling build
        new HtmlWebPackPlugin({
            template: 'index.html',   // input
            filename: 'index.html',   // output filename in dist/
        }),
        // for non-bundling demo, copy unprocessed sources to jsdelivr directory
        new CopyPlugin({
            patterns: [
              { from: "jsdelivr.html", to: "jsdelivr/index.html" },
              { from: "index.js", to: "jsdelivr" },
              { from: "src/*js", to: "jsdelivr" },
            ],
          }),
    ]
};
