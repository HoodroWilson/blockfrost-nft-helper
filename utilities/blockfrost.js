const _ = require("lodash");
const helper = require("./helper");
const BF = require('@blockfrost/blockfrost-js');
require("dotenv").config({ path :__dirname + '/../.env' });

const API = new BF.BlockFrostAPI({
    projectId: process.env.BLOCKFROST_API_KEY
});

/****************************************
 Get All Assets From Policy
 Returns a list of all assets (hex) given a policy ID
 ****************************************/
module.exports.getAllAssetsFromPolicy = async (policyID, limit) => {
    let error = null;
    let hasMore = true;
    let page = 1;
    let assets = [];

    while(error == null && hasMore && !(limit != null && _.size(assets) >= limit)) {
        try {
            let assetsFromPolicy = await API.assetsPolicyById(policyID, { page: page });
            if(assetsFromPolicy != null && _.size(assetsFromPolicy) > 0) {
                //console.log("on page " + page + " there are " + _.size(assetsFromPolicy) + " assets");
                if(_.size(assetsFromPolicy) < 100) {
                    hasMore = false;
                } else {
                    page++;
                }

                assets = _.concat(assets, assetsFromPolicy);
            } else {
                hasMore = false;
            }
        } catch(e) {
            error = "error calling assetsPolicyById";
            console.error(error, e != null ? e : "unknown");
            continue;
        }

        await helper.sleep(100);
    }

    if(_.size(assets) > 0) {
        assets = _.map(assets, 'asset');
    }

    if(limit != null) {
        assets = _.slice(assets, 0, limit);
    }

    return assets;
};

/****************************************
 Get Asset Details
 ****************************************/
module.exports.getAssetDetails = async (asset) => {
    try {
        return await API.assetsById(asset);
    } catch(e) {
        let error = "error calling assetsById";
        console.error(error, e != null ? e : "unknown");
        return null;
    }
};

/****************************************
 Get Transaction Details
 ****************************************/
module.exports.getTransactionDetails = async (transaction) => {
    try {
        return await API.txs(transaction);
    } catch(e) {
        let error = "error calling txs";
        console.error(error, e != null ? e : "unknown");
        return null;
    }
};

/****************************************
 Get Transaction UTXOs
 ****************************************/
module.exports.getTransactionUTXOs = async (transaction) => {
    try {
        return await API.txsUtxos(transaction);
    } catch(e) {
        let error = "error calling txsUtxos";
        console.error(error, e != null ? e : "unknown");
        return null;
    }
};

/****************************************
 Get Date From Block
 ****************************************/
module.exports.getDateFromBlock = async (block) => {
    try {
        let blockDetails = await API.blocks(block);
        if(blockDetails != null) {
            return new Date(blockDetails.time * 1000);
        }
    } catch(e) {
        let error = "error calling blocks";
        console.error(error, e != null ? e : "unknown");
        return null;
    }
};

/****************************************
 Get Asset Name
 ****************************************/
module.exports.getAssetName = async (transaction, policyID) => {
    try {
        let data = await API.txsMetadata(transaction);
        if(data != null) {
            let nft = _.find(data, { label: "721" });
            if(nft != null) {
                return _.first(_.keys(nft.json_metadata[policyID]));
            }
        }
    } catch(e) {
        let error = "error calling txsMetadata";
        console.error(error, e != null ? e : "unknown");
        return null;
    }
};

/****************************************
 Get Stake Address
 ****************************************/
module.exports.getStakeAddress = async (address) => {
    try {
        let data = await API.addresses(address);
        if(data != null) {
            return data.stake_address;
        }
    } catch(e) {
        let error = "error calling addresses";
        console.error(error, e != null ? e : "unknown");
        return null;
    }
};

/****************************************
 Get Asset Address
 ****************************************/
module.exports.getAssetAddress = async (asset) => {
    try {
        let data = await API.assetsAddresses(asset);
        if(data != null) {
            return _.first(data).address;
        }
    } catch(e) {
        let error = "error calling addresses";
        console.error(error, e != null ? e : "unknown");
        return null;
    }
};

/****************************************
 Get Addresses Transactions
 ****************************************/
module.exports.getAddressesTransactions = async (address, limit = null) => {
    let error = null;
    let hasMore = true;
    let page = 1;
    let transactions = [];

    while(error == null && hasMore && !(limit != null && _.size(transactions) >= limit)) {
        try {
            let transactionsResponse = await API.addressesTransactions(address, { page: page });
            if(transactionsResponse != null && _.size(transactionsResponse) > 0) {
                //console.log("on page " + page + " there are " + _.size(assetsFromPolicy) + " assets");
                if(_.size(transactionsResponse) < 100) {
                    hasMore = false;
                } else {
                    page++;
                }

                transactions = _.concat(transactions, transactionsResponse);
            } else {
                hasMore = false;
            }
        } catch(e) {
            error = "error calling addressesTransactions";
            console.error(error, e != null ? e : "unknown");
            continue;
        }

        await helper.sleep(100);
    }

    return transactions;
};

/****************************************
 Get ADA From Object
 ****************************************/
module.exports.getADAFromObject = (data) => {
    let match = _.find(data, { unit: "lovelace" });
    if(match != null) {
        return match.quantity / 1000000;
    }
    return 0;
};
