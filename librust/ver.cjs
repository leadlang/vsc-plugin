const { writeFileSync } = require("fs");

const tag = require("./package.json").version;
writeFileSync("./.version", tag);
