// shared webpack config object for dev, build, prod, demo...

const path = require('path');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

const isProd = process.env.NODE_ENV === 'production';
// console.log(';;isProd-sass, ', isProd);

module.exports = {
  module: {
    rules: [
      {
        test: /\.(ts|js)x?$/,
        use: [
          {
            loader: 'babel-loader',
          },
        ],
        exclude: /node_modules/,
      },
      {
        test: /\.(sa|sc|c)ss$/,
        use: [
          isProd ? MiniCssExtractPlugin.loader : 'style-loader',
          'css-loader',
          {
            loader: 'sass-loader',
            options: {
              // when node-sass and sass were installed，by default sass-loader prefers sass.
              implementation: require('sass'),
              sassOptions: {
                // fiber: require('fibers'),
              },
            },
          },
        ],
      },
      // Fonts
      {
        test: /\.(ttf|eot|woff|woff2)$/,
        // loader: 'file-loader',
        type: 'asset/resource',
        // generator: {
        //   filename: 'fonts/[hash].[ext]',
        // },
      },
      // Files
      {
        test: /\.(jpg|jpeg|png|gif|svg|ico)$/,
        // loader: 'file-loader',
        type: 'asset/resource',
        // generator: {
        //   filename: 'static/[hash].[ext]',
        // },
      },
      {
        test: /\.js$/,
        use: 'source-map-loader',
        enforce: 'pre',
      },
    ],
  },
  plugins: [new CleanWebpackPlugin()],
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
    // alias: {},
  },
  experiments: {
    topLevelAwait: true,
  },
  // ignoreWarnings: [/Failed to parse source map/],
};
