const HtmlWebPackPlugin = require('html-webpack-plugin');

var path = require('path');

module.exports = {
    entry : './test.js',
    output: {
        path: path.join(__dirname, 'dist'),
        filename: 'index.js'
    },
    devServer: {
        contentBase: path.join(__dirname, 'dist'),
        port: 1234
    },
    module: {
        rules: [
         {
           test: /\.(png|svg|jpg|gif)$/,
           use: [
             'file-loader',
           ],
         },
        ],
      },
    plugins: [
        new HtmlWebPackPlugin({
            template: 'test.html',   // input
            filename: 'index.html'          // output filename in dist/
        }),
    ]
};
