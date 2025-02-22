const tag = require("./package.json").version;
writeFileSync("./.version", tag);
