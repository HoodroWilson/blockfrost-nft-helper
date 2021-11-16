const _ = require("lodash");
const fs = require("fs");
const path = require('path');
const helper = require("../utilities/helper");
const blockfrost = require("../utilities/blockfrost");
const { parse } = require('json2csv');

// Process the command line argument for the configuration to use
const config = helper.getConfig(__filename);

// Wrap the execution in an async function so we can use await
const app = async () => {
    // Set up variables to track the progress/summarize of the execution
    let track = {
        found: 0,
        processed: 0,
        transactions: 0
    };
    const startTime = new Date();
    const configurationFileName = process.argv.slice(2)[0];

    let allTransactions = [];

    let addresses = [];
    if(config.addresses != null && _.size(config.addresses) > 0) {
        addresses = config.addresses;
    }
    track.found = _.size(addresses);
    console.log("found " + track.found + " addresses");

    mainLoop:
    for(let t = 0; t < _.size(addresses); t++) {
        const address = addresses[t];
        console.log("processing address " + (track.processed + 1) + " " + address);

        let transactions = await blockfrost.getAddressesTransactions(address);
        if(transactions != null) {
            let addTransactions = _.map(transactions, (t) => {
                return {
                    paidAddress: address,
                    payerAddress: "",
                    transactionHash: t.tx_hash,
                    transactionTime: new Date(t.block_time * 1000),
                    amount: null,
                    outputUTXOCount: 0,
                }
            });

            for(let z = 0; z < _.size(addTransactions); z++) {
                let addTransaction = addTransactions[z];
                console.log("processing transaction " + (track.transactions + 1) + " " + addTransaction.transactionHash);
                let transactionUTXOs = await blockfrost.getTransactionUTXOs(addTransaction.transactionHash);
                if(transactionUTXOs != null) {
                    // Skip payments from the account
                    if(_.find(transactionUTXOs.inputs, (i) => {
                        return i.address === address;
                    }) != null) {
                        continue;
                    }

                    _.each(transactionUTXOs.outputs, (i) => {
                        if(i.address === address) {
                            addTransaction.amount = blockfrost.getADAFromObject(i.amount);
                        } else {
                            addTransaction.outputUTXOCount++;
                            addTransaction.payerAddress = i.address;
                        }
                    });

                    allTransactions.push(addTransaction);
                    track.transactions++;

                    // Stop early if configured
                    if(config.limit != null && track.transactions >= config.limit) {
                        console.log("stopping early from hitting the limit configuration set at " + config.limit);
                        break mainLoop;
                    }
                }
            }

            track.processed++;
        }
    }

    const outFileType = config.format != null && config.format === "csv" ? "csv" : "json";
    const outFileName = configurationFileName + "." + outFileType;
    await helper.exportFile(allTransactions, outFileName, __filename, outFileType, config.flatten);

    console.log("ran in " + Math.floor((Date.now() - startTime) / 1000) + " seconds");
    console.log("finished - "  + JSON.stringify(track));
};

app();
