const path = require("path");

module.exports = {
	entry: {
		"./client/index": path.resolve(__dirname, "client", "index.ts"),
		"./client/game": path.resolve(__dirname, "client", "game.ts")
	},
	mode: "production",
	module: {
		rules: [
			{
				test: /\.tsx?$/,
				use: "ts-loader",
				exclude: /node_modules/
			}
		]
	},
	resolve: {
		extensions: [".tsx", ".ts", ".js"]
	},
	output: {
		filename: "[name].js",
		path: path.resolve(__dirname)
	}
};
