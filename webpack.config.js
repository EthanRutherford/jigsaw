const MiniCssExtractPlugin = require("mini-css-extract-plugin");

function template({template}, opts, {componentName, props, jsx}) {
	return template.ast`const React = require("react");
const ${componentName} = (${props}) => ${jsx}
module.exports = ${componentName}`;
}

module.exports = (env) => ({
	entry: "./src/main.jsx",
	output: {filename: "main.js"},
	plugins: [new MiniCssExtractPlugin({filename: "styles.css"})],
	module: {
		rules: [
			{
				test: /\.css$/,
				use: [
					MiniCssExtractPlugin.loader,
					{loader: "css-loader", options: {
						camelCase: "only",
						localIdentName: "[name]__[local]--[hash:base64:5]",
						modules: true,
					}},
				],
			}, {
				test: /.svg$/,
				use: [{
					loader: "@svgr/webpack",
					options: {template},
				}],
			}, {
				test: /\.jsx$/,
				exclude: /node_modules/,
				use: "babel-loader",
			}, {
				test: /\.worker\.js$/,
				use: {
					loader: "worker-loader",
					options: {publicPath: "/dist/"},
				},
			},
		],
	},
	resolve: {extensions: [".js", ".jsx", ".json", ".css", ".svg"]},
	mode: env === "prod" ? "production" : "development",
	devtool: env === "prod" ? "" : "eval-source-map",
	devServer: {open: true, publicPath: "/dist", port: 8084},
});
