import path from 'path';
import { fileURLToPath } from 'url';
import HtmlWebPackPlugin from 'html-webpack-plugin';
import CopyWebpackPlugin from 'copy-webpack-plugin';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
  entry: './mazewars04.js',  // Adjust this to your entry point
  output: {
    filename: '[name].bundle.js',
    path: path.resolve(__dirname, 'dist'),
    publicPath: '/',
  },
  externals: {
    three: 'THREE'
  },
  module: {
    rules: [
      {
        test: /\.(glsl|vert|frag)$/,
        type: 'asset/source',
      },
      {
        test: /\.(png|svg|jpg|jpeg|gif|glb|gltf)$/i,
        type: 'asset/resource',
      },
    ]
  },
  resolve: {
    alias: {
      '#glsl': path.resolve(__dirname, 'src/shaders'),  // Adjust this path to match your project structure
    },
    fallback: {
      "crypto": false
    }
  },
  plugins: [
    new HtmlWebPackPlugin({
      template: 'index.html',  // Adjust this to your HTML template file
      filename: 'index.html',
    }),
    new CopyWebpackPlugin({
        patterns: [
          {
            from: 'src/draco',
            to: 'src/draco'
          },
        ],
      }),
  ],
  devServer: {
    static: {
      directory: path.join(__dirname, 'public'),  // Adjust this to your static files directory
    },
    compress: true,
    port: 9000,  // Adjust this to your preferred port
  },
};