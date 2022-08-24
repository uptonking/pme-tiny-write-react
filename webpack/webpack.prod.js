// webpack config for production

const path = require('path');
const webpack = require('webpack');
const { merge } = require('webpack-merge');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const commonConfig = require('./webpack.common');

module.exports = merge(commonConfig, {
  mode: 'production',
  entry: path.resolve(__dirname, '../src/index.js'),
  output: {
    filename: 'main.js',
    path: path.resolve(__dirname, '../build'),
  },
  target: 'browserslist',
  plugins: [
    new MiniCssExtractPlugin({
      // filename: '[name].css',
      filename: 'styles.css',
      // chunkFilename: '[id].css',
      ignoreOrder: false,
    }),
  ],
});
