const config = require("./webpack.frontend.config.prod");

Object.assign(config, {
	mode: "development"
});

module.exports = config;
