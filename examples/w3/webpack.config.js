/* eslint import/no-extraneous-dependencies: ["error", {"devDependencies": true}] */

const HtmlWebPackPlugin = require('html-webpack-plugin');
const latestVersion = require('latest-version');

module.exports = async (_env, { mode }) => {
    const prod = mode === 'production';
    const croquet_version = await latestVersion('@croquet/croquet', {version: 'dev'});
    const croquet_script =`<script src="https://cdn.jsdelivr.net/npm/@croquet/croquet@${croquet_version}"></script>`;
    // const croquet_script =`<script src="https://cdn.jsdelivr.net/npm/@croquet/croquet@1.1.0"></script>`;
    return {
        entry : './index.js',
        devtool: 'source-map',
        output: {
            filename: '[name]-[contenthash:8].js',
            chunkFilename: 'chunk-[name]-[contenthash:8].js',
            assetModuleFilename: '[contenthash:8][ext]',
            clean: prod,
        },
        devServer: {
            port: 1234
        },
        module: {
            rules: [
                {
                    test: /\.js$/,
                    enforce: "pre",
                    use: ["source-map-loader"],
                },
                {
                    test: /\.(png|svg|jpg|gif|mp3|otf)$/,
                    type: 'asset/resource',
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
                templateParameters: { croquet_script },
            }),
        ]
    };
};
