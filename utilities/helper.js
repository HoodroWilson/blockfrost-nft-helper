const _ = require("lodash");
const fs = require("fs");
const path = require('path');
const {parse} = require("json2csv");
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

/****************************************
 Export File
 ****************************************/
module.exports.exportFile = async (data, dataFileName, scriptFilename, format = "json", flatten = null) => {
    // TODO: Update to use the path.separator type concatenation
    const outFilePath = '../output/' + path.basename(scriptFilename).split(".")[0] + '/' + dataFileName;

    // Format the data in the proper way based on the file type
    let outputData = null;
    if(format != null && format.includes("csv")) {
        if(flatten != null && flatten.key != null && flatten.label != null) {
            data = _.map(data, (a) => {
                let r = {}
                r[flatten.label] = a[flatten.key];
                return r;
            });
        }

        try {
            outputData = parse(data, {});
        } catch(err) {
            outputData = null;
            console.error(err);
        }
    } else {
        if(flatten != null && flatten.key != null && flatten.label != null) {
            let flatAssets = _.map(data, (a) => {
                return a[flatten.key];
            });
            data = {};
            data[flatten.label] = flatAssets;
        }
        outputData = JSON.stringify(data, null, '\t');
    }

    if(outputData != null) {
        await fs.writeFile(outFilePath, outputData, err => {
            if(err) {
                console.log('output file could not be created ' + dataFileName);
                console.error(err);
                return;
            }
        });
        console.log('output file created ' + dataFileName);
    } else {
        console.log('output file wasn\'t created ' + dataFileName);
    }
};
