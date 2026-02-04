const { defineConfig } = require('@vue/cli-service');
const path = require('path');
const os = require('os');
console.log('process.env.NODE_ENV:', process.env.NODE_ENV);
console.log('process.env.VUE_APP_RUNTIME_SCENE:', process.env.VUE_APP_RUNTIME_SCENE);

const isProduction = process.env.NODE_ENV === 'production';
const platform = os.platform();

module.exports = defineConfig({
  transpileDependencies: true,
  publicPath: './',
  configureWebpack: {
    devtool: isProduction ? 'source-map' : 'inline-source-map',
    target: 'electron-renderer',
    resolve: {
      alias: {
        // 强制所有包使用根目录唯一的 vue 实例
        vue: path.resolve(__dirname, './node_modules/vue'),
        'trtc-electron-sdk': path.resolve(__dirname, './node_modules/trtc-electron-sdk'),
      },
    },
    module: {
      rules: [
        {
          test: /\.node$/,
          loader: 'native-ext-loader',
          options: {
            rewritePath: isProduction
              ? platform === 'win32'
                ? './resources'
                : '../Resources'
              : './node_modules/trtc-electron-sdk/build/Release',
          },
        },
      ],
    },
  }
})
