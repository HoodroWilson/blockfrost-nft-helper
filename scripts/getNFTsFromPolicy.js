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
        processed: 0
    };
    const startTime = new Date();
    const configurationFileName = process.argv.slice(2)[0];

    let assets = [];

    // Get all of the assets and their hex address
    let hexAssets = [];
    if(config.assets != null && _.size(config.assets) > 0) {
        // Only use the assets in the array if it's set for testing, ignores the policy id
        hexAssets = config.limit ? _.slice(config.assets, 0, config.limit <= _.size(config.assets) ? config.limit : _.size(config.assets)) : config.assets;
    } else {
        const policyID = config.policy_id;
        console.log("processing policy " + policyID);

        // Use the Blockfrost API to get all of the assets, gives hex of policy and asset name
        hexAssets = await blockfrost.getAllAssetsFromPolicy(policyID, config.limit ? config.limit : null);
    }
    track.found = _.size(hexAssets);

    console.log("found " + track.found + " assets");

    // Solidify the config on the data
    if(config.data == null) {
        config.data = ["all"];
    }

    // Loop thru each asset and then use the Blockfrost API to get the asset details
    for(let hexAssetNumber = 0; hexAssetNumber < _.size(hexAssets); hexAssetNumber++) {
        let assetHex = hexAssets[hexAssetNumber];
        let asset = {
            asset: assetHex
        };

        console.log("processing " + (track.processed + 1) + " " + assetHex);

        if(helper.checkArray(config.data, "details") || helper.checkArray(config.data, "asset") || helper.checkArray(config.data, "mint") || helper.checkArray(config.data, "mint_addresses")) {
            let apiAsset = await blockfrost.getAssetDetails(assetHex);
            if(apiAsset != null) {
                asset = {
                    asset: apiAsset.asset,
                    policyId: apiAsset.policy_id,
                    assetName: apiAsset.asset_name,
                    fingerprint: apiAsset.fingerprint,
                    mintTransactionHash: apiAsset.initial_mint_tx_hash,
                    metadata: apiAsset.onchain_metadata
                };

                _.each(config.metadata, (m) => {
                    asset["metadata" + m.toString().replace(/ /g, "")] = apiAsset.onchain_metadata[m];
                });
            }
        }

        if(helper.checkArray(config.data, "asset")) {
            let assetName = await blockfrost.getAssetName(asset.mintTransactionHash, asset.policyId);
            if(assetName != null) {
                asset.assetLabel = assetName;
                asset.assetNumber = assetName.replace(/\D/g, '');
            }
        }

        if(helper.checkArray(config.data, "mint")) {
            let mintDetails = await blockfrost.getTransactionDetails(asset.mintTransactionHash);
            if(mintDetails != null) {
                asset.mintTransactionBlock = mintDetails.block;
                asset.mintTransactionSlot = mintDetails.slot;
                asset.mintTransactionTime = new Date(mintDetails.block_time * 1000);
                asset.mintTransactionUTXOCount = mintDetails.utxo_count;
                asset.mintTransactionFees = mintDetails.fees / 1000000;
            }
        }

        if(helper.checkArray(config.data, "mint_addresses")) {
            let transactionUTXOs = await blockfrost.getTransactionUTXOs(asset.mintTransactionHash);
            if(transactionUTXOs != null) {
                let outputUTXOs = _.map(transactionUTXOs.outputs, (o) => {
                    return {
                        ada: blockfrost.getADAFromObject(o.amount),
                        nftHolder: _.size(o.amount) > 1 ? 1 : 0,
                        address: o.address
                    };
                });

                let inputUTXOs = _.map(transactionUTXOs.inputs, (i) => {
                    return {
                        ada: blockfrost.getADAFromObject(i.amount),
                        address: i.address
                    };
                });

                // Scenario 1: Simple - INPUT: 50 ADA - OUTPUT - 2 ADA & NFT, 45.768323 ADA, 2 ADA - b9efeb6128c173046f52b474a07c935a0b3b4609a644f25fb3d973b4637ca26c
                // Scenario 2: Overpaid - INPUT: 200 ADA - OUTPUT - 152 ADA & NFT, 45.757587 ADA, 2 ADA - 6a116482aa5ea173d5a1a52f62599e7a9e8a828c2a7b882248793396c49bbd2d
                // Scenario 3: Free NFT - INPUT: 146.849007 ADA - OUTPUT - 2 ADA & NFT, 124.6003602 ADA, 2 ADA - 1630e69d2f6bab017478f02297ab124cf3b509acb3c34d1b917bee8f082da14d

                if(_.size(_.differenceBy(outputUTXOs, inputUTXOs, 'address')) != _.size(outputUTXOs)) {
                    // We have detected that one of the addresses in the input matches the output which means it's an NFT-MAKER PRO direct mint
                    outputUTXOs = _.differenceBy(outputUTXOs, inputUTXOs, 'address');
                    outputUTXOs = _.orderBy(outputUTXOs, ['nftHolder'], ['asc']);
                    asset.mintTransactionType = "Community";
                    asset.mintTransactionIncome = 0;
                    asset.mintTransactionCost = outputUTXOs[0].ada;
                    // TODO: double check validitiy
                    asset.mintTransactionMinUTXO = (outputUTXOs[1] != null) ? outputUTXOs[1].ada : outputUTXOs[0].ada;
                    asset.mintTransactionAddress = (outputUTXOs[1] != null) ? outputUTXOs[1].address : outputUTXOs[0].address;
                    asset.mintTransactionPrice = 0;
                } else {
                    outputUTXOs = _.orderBy(outputUTXOs, ['nftHolder', 'ada'], ['asc', 'desc']);
                    asset.mintTransactionType = "Mint";
                    asset.mintTransactionIncome = outputUTXOs[0].ada;
                    asset.mintTransactionCost = outputUTXOs[1].ada;
                    // TODO: This will break if NFT-MAKER PRO updates the Minimum UTXO ADA sent with the NFT
                    asset.mintTransactionMinUTXO = 2;
                    asset.mintTransactionAddress = outputUTXOs[2].address;
                    asset.mintTransactionPrice = asset.mintTransactionIncome + asset.mintTransactionCost + asset.mintTransactionMinUTXO + asset.mintTransactionFees;
                }
            }
        }

        if(helper.checkArray(config.data, "current_holder")) {
            let assetAddress = await blockfrost.getAssetAddress(asset.asset);
            if(assetAddress != null) {
                asset.currentHolderAddress = assetAddress;
            }
        }

        if(helper.checkArray(config.data, "stake_addresses")) {
            if(asset.mintTransactionAddress != null) {
                let stakeKeyMintAddress = await blockfrost.getStakeAddress(asset.mintTransactionAddress);
                if(stakeKeyMintAddress != null) {
                    asset.mintTransactionStakeAddress = stakeKeyMintAddress;
                }
            }

            if(asset.currentHolderAddress != null) {
                let stakeKeyCurrentAddress = await blockfrost.getStakeAddress(asset.currentHolderAddress);
                if(stakeKeyCurrentAddress != null) {
                    asset.currentHolderStakeAddress = stakeKeyCurrentAddress;
                }
            }
        }

        track.processed++;
        assets.push(asset);

        // Stop early if configured
        if(config.limit != null && _.size(assets) >= config.limit) {
            console.log("stopping early from hitting the limit configuration set at " + config.limit);
            break;
        }
    }

    const outFileType = config.format != null && config.format === "csv" ? "csv" : "json";
    const outFileName = configurationFileName + "." + outFileType;
    // TODO: Update to use the path.separator type concatenation
    const outFilePath = '../output/' + path.basename(__filename).split(".")[0] + '/' + outFileName;

    // TODO: Move file export to a shared function

    // Format the data in the proper way based on the file type
    let outputData = null;
    if(config.format != null && config.format.includes("csv")) {
        if(config.flatten != null && config.flatten.key != null && config.flatten.label != null) {
            assets = _.map(assets, (a) => {
                let r = {}
                r[config.flatten.label] = a[config.flatten.key];
                return r;
            });
        }

        try {
            outputData = parse(assets, {});
        } catch(err) {
            outputData = null;
            console.error(err);
        }
    } else {
        if(config.flatten != null && config.flatten.key != null && config.flatten.label != null) {
            let flatAssets = _.map(assets, (a) => {
                return a[config.flatten.key];
            });
            assets = {};
            assets[config.flatten.label] = flatAssets;
        }
        outputData = JSON.stringify(assets, null, '\t');
    }

    if(outputData != null) {
        await fs.writeFile(outFilePath, outputData, err => {
            if(err) {
                console.log('output file could not be created ' + outFileName);
                console.error(err);
                return;
            }
        });
        console.log('output file created ' + outFileName);
    } else {
        console.log('output file wasn\'t created ' + outFileName);
    }

    console.log("ran in " + Math.floor((Date.now() - startTime) / 1000) + " seconds");
    console.log("finished - "  + JSON.stringify(track));
};

app();
