const _ = require("lodash");
const fs = require("fs");
const path = require('path');
require("dotenv").config({ path :__dirname + '/../.env' });

/****************************************
 Sleep
 Waits around for a certain number of milliseconds using a Promise (use async/await)
 ****************************************/
const sleep = (millis) => {
    return new Promise(resolve => setTimeout(resolve, millis));
};
module.exports.sleep = sleep;

/****************************************
 Get Config
 Returns the JSON object for the configuration based on the command line argument
 ****************************************/
module.exports.getConfig = (filename) => {
    return JSON.parse(fs.readFileSync('../configuration/' + path.basename(filename).split(".")[0] + "/" + process.argv.slice(2)[0] + '.json'));
};

/****************************************
 Check Array
 Returns true/false if the keys exists in the array
 ****************************************/
module.exports.checkArray = (array, value, useAll = true) => {
    return _.indexOf(array, value) !== -1 || (useAll && _.indexOf(array, "all") !== -1);
};
