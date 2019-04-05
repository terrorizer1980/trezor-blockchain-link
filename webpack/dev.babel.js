import webpack from 'webpack';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import { SRC, BUILD, PORT } from './constants';

module.exports = {
    watch: true,
    mode: 'development',
    devtool: 'source-map',
    entry: {
        indexUI: [`${SRC}/ui/index.ui.ts`],
        index: [`${SRC}/index.ts`],
    },
    output: {
        filename: '[name].[hash].js',
        path: BUILD,
    },
    devServer: {
        contentBase: [SRC],
        hot: false,
        https: false,
        port: PORT,
        stats: 'verbose',
        inline: true,
    },
    module: {
        rules: [
            {
                test: /\.ts?$/,
                loader: 'awesome-typescript-loader',
                options: {
                    errorsAsWarnings: true,
                },
            },
        ],
    },
    resolve: {
        modules: [SRC, 'node_modules'],
        alias: {
            'ws-browser': `${SRC}/utils/ws.js`,
        },
        extensions: ['.ts', '.js'],
    },
    performance: {
        hints: false,
    },
    plugins: [
        new webpack.NormalModuleReplacementPlugin(/^ws$/, 'ws-browser'),
        new HtmlWebpackPlugin({
            chunks: ['indexUI'],
            template: `${SRC}ui/index.html`,
            filename: 'index.html',
            inject: true,
        }),
        new webpack.optimize.OccurrenceOrderPlugin(),
        new webpack.NoEmitOnErrorsPlugin(),
        // new webpack.HotModuleReplacementPlugin(),
        new webpack.NamedModulesPlugin(),
    ],
    node: {
        net: 'empty',
        tls: 'empty',
        dns: 'empty',
    },
};
