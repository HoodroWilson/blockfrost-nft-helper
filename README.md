# Blockfrost NFT Helper

_A collection of scripts which you configure with JSON files that help you interface with the Blockfrost API to accomplish tasks related to NFTs on Cardano without having to write any code_

---

[Blockfrost](https://blockfrost.io) is an API that enables you to interact with the Cardano blockchain at scale.

These scripts can solve any of these complexities (and more) that you may face when running an NFT project.

* Getting the details of each mint transaction from an NFT drop given a policy ID
* Getting a list of current wallet addresses for every NFT asset given an array of assets
* Getting a list of mint wallet addresses for every NFT asset given a policy ID

Used to analyze the blockchain for [Cardano Caricatures](https://www.cardanocaricatures.com/) and [Old Money](https://www.oldmoney.io/).

---

## Setting up the Blockfrost NFT Helper scripts

_Follow these steps before attempting to use any of the scripts_

1. Ensure you have [node](https://nodejs.org/en/download/) and [git](https://git-scm.com/downloads) installed
2. Download this repository using the command line (recommended) with `git clone` or directly from [GitHub](https://github.com/CardanoCaricatures/blockfrost-nft-helper)
3. Navigate to the root directory of the repository and run `npm install` to set up the libraries required
4. Create a new file named `.env` in the root directory and add your API Key from [Blockfrost](https://blockfrost.io/dashboard)
   * `BLOCKFROST_API_KEY=mainnet333eag3Fb333cKhOq333ph3lgMEam333`
5. Create a `.json` file based on one of the examples add add it to a configuration folder with the same name of the script `/configuration` any of the script
   * For example, you can create the file `/configuration/getNFTsFromPolicy/TestRun.json` then run `node getNFTsFromPolicy.js TestRun`

---

## `getNFTsFromPolicy.js`

_Given a policy id it can get all the current wallet addresses, mint wallet address, original mint time, and more for every NFT asset_

### Overview

* This script takes a `.json` file that outlines what policy to analyze and how it should be done
* It will output the results in the specified format with a filename that matches the `.json` file
* It currently is somewhat reliant on how NFT-MAKER-PRO works with minting NFTs to calculate some of the wallet logic
* It takes longer depending on what data you want to collect with each asset so limiting it with the `data` configuration speeds it up

### How to run

1. Create a `.json` configuration file in the `/configuration/getNFTsFromPolicy` folder
2. Run using `node getNFTsFromPolicy.js NAME_OF_JSON_FILE_WITH_NO_EXTENSION`
3. It will output the results in the `/output/getNFTsFromPolicy` folder

### How to configure

Each `.json` file in the `/configuration/getNFTsFromPolicy` folder can only analyze one policy at a time

Required configuration values:

* **policy_id**
  * unique ID of the policy to analyze the NFTs
  * ex: `a4c45615825acae7c4937ee4d45d2ff9a29328084e2dc34bf4af37b2`

Optional configuration values:

* **limit**
  * how many NFTs to output
  * if not provided, it will analyze every NFT given the policy
  * ex: `500`
* **format**
  * how to format the output
  * if not provided, it will default to `json`
  * ex: `csv` or `json`
* **data**
  * which data to fetch with each policy/asset
  * if not provided, it will default to all
  * use when you want it to run faster
  * if the value `all` exists in the array then it will fetch everything
  * see the example of the output below to know what each setting includes
  * ex: `["all", "details", "asset_name", "mint", "mint_addresses", "current_holder", "stake_addresses"]`
* **assets**
  * array of hex addresses of assets to process
  * if assets are provided then it will use them and ignore the policy id
  * ex: `["a4c45615825acae7c4937ee4d45d2ff9a29328084e2dc34bf4af37b2546865496e666c6174696f6e54696d65734c5849303338"]`
* **metadata**
  * specify keys for the metadata that you want to bring to the top level data for each NFT
  * allows you to use the data in the metadata easier
  * ex: `["Rarity", "Stamp", "Voting Power"]`
* **flatten**
  * specify a `key` for a single data point that you want flattened
  * the `key` has to match one of the keys in `data`
  * specify a `label` for the json key or column header for the single data point
  * flattened values in a `json` format are all in a single array with the `label` as the key
  * flattened values in a `csv` format are in a single column

Here are some example `.json` configuration files:

```json
{
  "policy_id": "a4c45615825acae7c4937ee4d45d2ff9a29328084e2dc34bf4af37b2"
}
```

```json
{
  "assets": [
    "a4c45615825acae7c4937ee4d45d2ff9a29328084e2dc34bf4af37b2546865496e666c6174696f6e54696d65734c5849303338"
  ],
  "format": "csv"
}
```

```json
{
  "policy_id": "a4c45615825acae7c4937ee4d45d2ff9a29328084e2dc34bf4af37b2",
  "limit": 500,
  "format": "json",
  "data": ["details", "mint", "mint_address", "current_address"],
  "metadata": ["Volume"],
  "flatten": { "key": "currentHolderAddress", "label": "addresses" }
}
```

Here are the output options controlled by setting the `data` array in the configuration file:

```json
[
    {
      "asset": "a4c45615825acae7c4937ee4d45d2ff9a29328084e2dc34bf4af37b2546865496e666c6174696f6e54696d65734c5849363831", // always returned
      "policyId": "a4c45615825acae7c4937ee4d45d2ff9a29328084e2dc34bf4af37b2", // details
      "assetName": "546865496e666c6174696f6e54696d65734c5849363831", // details
      "fingerprint": "asset184mgnqas98myw3jgdcn8qktgxjzlqvzynczanw", // details
      "mintTransactionHash": "be44c14315f79f8129ec4cf41e3ed563534d1b8b205b1956dfd3d7bc1f9a8afa", // details
      "metadata": { // details
        "image": "ipfs://QmcGALdBLqE7ejiteWFyZxcayP3sYe6m7XkFFP7dj1aF6j",
        "Name": "The Inflation Times, Volume LXI",
        "Asset": "TheInflationTimesLXI681",
        "files": [
          {
            "src": "ipfs://QmXpqDso4G4ASG6eYi9uJ9uJgfNMfg7SGrqGMqHjQvxgGW",
            "name": "TheInflationTimesLXI038",
            "mediaType": "image/jpeg"
          }
        ],
        "Number": "681 of 700",
        "Series": "The Inflation Times",
        "Volume": "LXI",
        "Headline": "Hoodro to Announce",
        "mediaType": "image/jpeg",
        "Collection": "Old Money"
      },
      "metadataVolume": "LXI", // details
      "assetLabel": "TheInflationTimesLXI038", // asset
      "assetNumber": "038", // asset
      "mintTransactionBlock": "abf8f10ac7725ef9971406d0d6527efe3d5211bdfd8557abfc6a4ad56a71b6b0", // mint 
      "mintTransactionSlot": 44196461, // mint
      "mintTransactionTime": "2021-11-01T10:32:32.000Z", // mint
      "mintTransactionUTXOCount": 4, // mint
      "mintTransactionFees": 0.215265, // mint
      "mintTransactionType": "Community", // mint_addresses
      "mintTransactionIncome": 0, // mint_addresses
      "mintTransactionCost": 2, // mint_addresses
      "mintTransactionMinUTXO": 2, // mint_addresses
      "mintTransactionAddress": "addr1qytl0wx4c6u7pcfrcl5y84ms4fqewjqchy8hhk80ll47mpn0e4lmdfcwxw8w8s8dapap8vd4wfnhe85xlsw9ukfealeqn9zn0k", // mint_addresses
      "mintTransactionPrice": 0, // mint_addresses
      "currentHolderAddress": "addr1qygnz95mmel98g58j2hv53982l44gneuxw4gmyu3mdstlmfwyg0ukzssgs3jdqu8h0323edg3fp8jlewcmwjsjsc2dmqg6s0d4", // current_holder
      "mintTransactionStakeAddress": "stake1u9hu6lak5u8r8rhrcrk7s7snkx6hyemun6r0c8z7tyu7lusfchlq8", // stake_addresses
      "currentHolderStakeAddress": "stake1uyhzy87tpggyggexswrmhc4guk5g5sne0uhvdhfgfgv9xasqtpdvn"  // stake_addresses
    }
]
```

---

## Release Notes

### 1.0.0
  * Initialized the repo/codebase
  * Created the initial version of `getNFTsFromPolicy.js`
  * Created the `README.md`

---

## Future Scripts
* ?

## Future Improvements
* Setup `configuration` folder under `scripts` directory with examples, update README to point to example files instead of embedding in the page 
* Add validation to finding the `.json` configuration file instead of throwing exception
* Add validation to the `.json` configuration files required and optional fields
* Add `order` as a configuration to control how the output is sorted with a key/order array

## Potential Enhancements
* Reconfigure to be an `npm` package so users just need to create `.json` files instead of needing to download the repository

---

Have questions or suggestions? Want to get paid to contribute? Reach out to [@AdaCaricatures](https://twitter.com/AdaCaricatures) or [justin@cardanocaricatures.com](mailto:justin@cardanocaricatures.com)
