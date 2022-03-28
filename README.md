

# JT Marketplace
## Main functionality
**Marketplace owner**. Marketplace owner can
- Set marketplace wallet via `setMarketplaceWallet`
- Set marketplace fee portion, by per-ten-thousand unit of portions via `setMarketplaceFeePortion`
- Set ERC20 token for timed auction payment via `setERC20TokenForAuction`
- Stop an ongoing auction or sale via `stopAuction`, i.e. after the duration of the auction or sale has ended
    - *Requirements*.
        - Only marketplace owner can stop an on-going sale or auction
    - *Actions and events*.
        - The auction or sale will be marked as stopped
        - If no offer or bid is made, the NFTs deposited to the marketplace will be transferred back to the seller, and the auction or sale will be deleted
        - Event `AuctionStopped(_auctionId)` will be emitted upon successful stop

**NFT seller**. NFT sellers can
- Settle a stopped auction via `settleAuction`, i.e. take a particular offer or the highest one and sell the NFTs
    - *Requirements*.
        - Only NFT seller can settle an auction or sale by taking a bid or offer
        - The indicated auction or sale must be stopped previously
        - The indicated offer or bid must be made previously
    - *Actions and events*.
        - The chosen buyer will pay the marketplace fee and seller fee in Wei (for fixed-price sale) or WETH (for timed auction and declining-price sale)
        - The NFTs are lazily minted and transferred to the recipient indicated by the buyer
        - All offers or bids made by other users will be transferred back to them
        - The auction or sale is then deleted
        - Event `NFTTransferredAndSellerPaid` will be emitted upon successful settle
- Withdraw an auction or sale via `withdrawAuction`, i.e. this function will transfer all bids or offers back to their bidders
    - *Requirements*.
        - Only NFT seller or marketplace owner can withdraw a sale or auction, i.e. the marketplace owner may decide to withdraw an auction which last for too long without being settled
    - *Actions and events*.
        - All NFTs transferred from the seller to the marketplace is transferred back to the seller
        - All offers or bids made by ordinary users will be transferred back to them
        - The auction or sale is then deleted
        - Event `AuctionWithdrawn(_auctionId)` will be emitted upon successful withdraw
- Update whitelisted buyer of an ongoing fixed-price sale, where there is no bidder yet, via `updateWhitelistedBuyer`
    - *Requirements*.
        - Only NFT seller can invoke `updateWhitelistedBuyer`
        - Whitelisted buyer can only be updated for an on-going fixed-price sale, where no offer has been made
    - *Actions and events*.
        - Event `WhitelistedBuyerUpdated(_auctionId, _newWhitelistedBuyer)` will be emitted upon successful update
- Update the reserve price of an ongoing timed auction, where the old reserve price has not been met, via `updateMinimumPrice`
    - *Requirements*.
        - Only NFT seller can invoke `updateMinimumPrice()`
        - Min price can only be updated for an on-going timed auction
        - The newly min price must not be higher than the current buy-now price
    - *Actions and events*.
        - Event `MinimumPriceUpdated(_auctionId, _newMinPrice)` will be emitted upon successful update
- Update the buy-now price of an ongoing timed auction or fixed-price sale via `updateBuyNowPrice`
    - *Requirements*.
        - Only NFT seller can invoke `updateBuyNowPrice()`
        - Buy-now price cannot be udpated for declining-price sale, since it is treated as starting price for such a sale
        - NFT seller can only update buy-now price of an on-going fixed-price sale or timed auction
        - The new buy-now price must not be lower than the current reserve price (min price)
    - *Actions and events*.
        - Event `BuyNowPriceUpdated(_auctionId, _newBuyNowPrice)` will be emitted upon successful update
        - If the current highest bid or offer meets the newly updated buy-now price, the offer will be immediately taken and the sale is finished
- Take an offer and terminate an ongoing fixed-price sale via `takeOffer`
    - *Requirements*.
        - Only NFT seller can invoke `takeOffer()`
        - NFT seller can only take offer from an on-going fixed-price sale
    - *Actions and events*.
        - Event `OfferTaken(_auctionId, _bidId)` will be emitted upon successful invocation

**Ordinary users**. Ordinary users can
- Create NFT timed-auction via `createNftAuction`
    - *Actions and events*.
        - Event `NftAuctionCreated(auctionId)` is emitted upon successful sale creation
- Create NFT fixed-price sale via `createSale`
    - *Actions and events*. 
        - Event `SaleCreated(auctionId)` is emitted upon successful sale creation 
- Create NFT declining-price sale via `createDecliningPriceSale`
    - *Actions and events*.
        - Event `DecliningPriceSaleCreated(auctionId)` is emitted upon successful sale creation
- Make bid, purchase, or make offer to an ongoing auction, via `makeBid`
    - *Requirements*.
        - NFT seller cannot make offer or bid to his own sale or auction
        - Bids to fixed-price sales must be paid in Wei, while bids to timed auction and declining-price sale must be paid in WETH
        - For fixed-price sale, the bid must be at least the nailed buy-now price, otherwise the bid must be an offer
        - For timed auction, the bid must be at least the min price, and higher than the current highest bid by a certain percentage
        - For declining-price sale, the bid must be at least the current price of the sale
        - If the sale is a direct fixed-price sale, i.e. with whitelisted buyer, only the whitelisted buyer can make a bid or offer
    - *Actions and events*.
        - The corresponding cash will be transferred to the marketplace
        - The highest bid ID will automatically updated
        - Event `BidMade(auctionId, bidId, bidder, bidAmount)` will be emitted upon successful bid
        - If the buy-now price is met, for any type of auction or sale, the bid is taken and the auction or sale is terminated
        - In case of declining-price sale, the bid is taken immediately and the sale is terminated
- Withdraw the bid from an ongoing auction via `withdrawBid`
    - *Requirements*.
        - Bidder can only withdraw bid from an on-going auction
        - Only bidder can withdraw his own bids
    - *Actions and events*.
        - The highest bid is re-picked
        - If no highest bid can be picked, i.e. all bidders has drawn their bid, the number of bids is set to zero
        - The withdrawn cash will be saved as credits at the marketplace, and the withdrawer can get the cash later via `withdrawAllCredits`
        - Event `BidWithdrawn(_auctionId, _bidId, _newHighestBidId)` will be emitted upon successful withdraw
- Withdraw all credited Wei and ERC20 from the marketplace via `withdrawAllCredits`

## User guide
### Fixed-price sale
**Ordinary working flow**.
1. NFT author creates NFT (if not available) with `ArtToken.create(initialOwner, initialSupply, uri, data)`
    * *Arguments*.
        * `initialOwner` is the address of the initial owner, i.e. if `initialOwner` is not zero, then an amount of `initialSupply` of the NFT is minted and assigned to `initialOwner`
        * `initialSupply` is the amount of initially minted NFTs
        * `uri` is the URI of the NFT metadata
        * `data` is a 64-byte binary string. Should be zero binary string
    * *Example*.

        ```js
        const ZERO_ADDRESS = web3.utils.padLeft(web3.utils.toHex(0), 40);
        const EMPTY_BYTES = web3.utils.padLeft(web3.utils.toHex(0), 64);
        const SAMPLE_URI = "https://web.skype.com/"
 
        receipt = await arttoken.create(
            ZERO_ADDRESS, 0, SAMPLE_URI, EMPTY_BYTES
        );
        ```

2. Seller create sale with `Marketplace.createSale(artTokenContractAddress, tokenIds, quantities, buyNowPrice, whitelistedBuyer)`
    * *Arguments*.
        * `artTokenContractAddress` is the address of `ArtToken` contract
        * `tokenIds` is the IDs of the NFTs for sale
        * `quantities` is the quantities of each NFT for sale
        * `whitelistedBuyer` is the address of the whitelisted buyer. Set this to zero to indicate no whitelisted buyer
    * *Example*.

        ```js
        receipt = await marketplace.createSale(
            arttoken.address, createdTokenIds, quantitiesForSale, 
            nftPrice, ZERO_ADDRESS
        );
        ```

3. Buyer make a bid to the sale with `Marketplace.makeBid(auctionId, nftRecipient, tokenAmount, isOffer)`
    * *Arguments*.
        * `auctionId` is the ID of the sale to make bid or offer
        * `nftRecipient` is the address of the NFT recipient in case of successful purchase. Set to zero in case the buyer is the recipient
        * `tokenAmount` is the amount of WETH used for payment (should be zero for fixed-price sale)
        * `isOffer` is set to `true` in case of making an offer, otherwise set to `false`
    * *Example*.

        ```js
        // make ordinary
        receipt = await marketplace.makeBid(auctionId, ZERO_ADDRESS, 0, false);

        // make offer
        receipt = await marketplace.makeBid(auctionId, ZERO_ADDRESS, 0, true);
        ```

4. Buyer can withdraw bid using `Marketplace.withdrawBid(auctionId, bidId)`
5. Seller can take offer using `Markteplace.takeOffer(auctionId, bidId)` before sale expiration
6. In case no offer is taken before expiration, marketplace owner stops the sale using `Marketplace.stopAuction(auctionId)`
7. The seller can settle the sale using `Marketplace.settleAuction(auctionId, bidId, takeHighestBid)`
    * *Arguments*.
        * `auctionId` is the ID of the sale to make bid or offer
        * `bidId` is the ID of the bid to take
        * `takeHighestBid` is set to `true` in case of taking the highest offer, otherwise set to `false`
8. In case of taking no offer, the seller can use `Marketplace.withdrawAuction(auctionId)` to withdraw the auction
9. When the sale expires for too long without further action, the marketplace owner can withdraw the sale using `Marketplace.withdrawAuction(auctionId)`
10. Failed buyers can withdraw all of his credits using `Marketplace.withdrawAllCredits()` to withdraw all cash transferred to the marketplace for making bids or offers

### Timed auction
**Ordinary working flow**.
1. NFT author creates NFT (if not available) with `ArtToken.create(initialOwner, initialSupply, uri, data)`
    * *Arguments*.
        * `initialOwner` is the address of the initial owner, i.e. if `initialOwner` is not zero, then an amount of `initialSupply` of the NFT is minted and assigned to `initialOwner`
        * `initialSupply` is the amount of initially minted NFTs
        * `uri` is the URI of the NFT metadata
        * `data` is a 64-byte binary string. Should be zero binary string
    * *Example*.

        ```js
        const ZERO_ADDRESS = web3.utils.padLeft(web3.utils.toHex(0), 40);
        const EMPTY_BYTES = web3.utils.padLeft(web3.utils.toHex(0), 64);
        const SAMPLE_URI = "https://web.skype.com/"
 
        receipt = await arttoken.create(
            ZERO_ADDRESS, 0, SAMPLE_URI, EMPTY_BYTES
        );
        ```

2. Seller create sale with `Marketplace.createNftAuction(artTokenContractAddress, tokenIds, quantities, minPrice, buyNowPrice, bidIncreasePercentage)`
    * *Arguments*.
        * `artTokenContractAddress` is the address of `ArtToken` contract
        * `tokenIds` is the IDs of the NFTs for sale
        * `quantities` is the quantities of each NFT for sale
        * `minPrice` is the reserve price for the auction
        * `buyNowPrice` is the buy-now price for the auction
        * `bidIncreasePercentage` is the minimum percentage increment allowed between successive bids
3. Buyer make a bid to the sale with `Marketplace.makeBid(auctionId, nftRecipient, tokenAmount, isOffer)`
    * *Arguments*.
        * `auctionId` is the ID of the sale to make bid or offer
        * `nftRecipient` is the address of the NFT recipient in case of successful purchase. Set to zero in case the buyer is the recipient
        * `tokenAmount` is the amount of WETH used for payment (should be non-zero for timed auction)
        * `isOffer` should be `false`
    * *Example*.

        ```js
        receipt = await marketplace.makeBid(auctionId, ZERO_ADDRESS, 10, false);
        ```

4. Buyer can withdraw bid using `Marketplace.withdrawBid(auctionId, bidId)`
5. In case no offer is taken before expiration, marketplace owner stops the sale using `Marketplace.stopAuction(auctionId)`
6. The seller can settle the sale using `Marketplace.settleAuction(auctionId, bidId, takeHighestBid)`
    * *Arguments*.
        * `auctionId` is the ID of the sale to make bid or offer
        * `bidId` is the ID of the bid to take
        * `takeHighestBid` is set to `true` in case of taking the highest offer, otherwise set to `false`
7. In case of taking no offer, the seller can use `Marketplace.withdrawAuction(auctionId)` to withdraw the auction
8. When the sale expires for too long without further action, the marketplace owner can withdraw the sale using `Marketplace.withdrawAuction(auctionId)`
9. Failed buyers can withdraw all of his credits using `Marketplace.withdrawAllCredits()` to withdraw all cash transferred to the marketplace for making bids or offers

### Declining-price sale
**Ordinary working flow**.
1. NFT author creates NFT (if not available) with `ArtToken.create(initialOwner, initialSupply, uri, data)`
    * *Arguments*.
        * `initialOwner` is the address of the initial owner, i.e. if `initialOwner` is not zero, then an amount of `initialSupply` of the NFT is minted and assigned to `initialOwner`
        * `initialSupply` is the amount of initially minted NFTs
        * `uri` is the URI of the NFT metadata
        * `data` is a 64-byte binary string. Should be zero binary string
    * *Example*.

        ```js
        const ZERO_ADDRESS = web3.utils.padLeft(web3.utils.toHex(0), 40);
        const EMPTY_BYTES = web3.utils.padLeft(web3.utils.toHex(0), 64);
        const SAMPLE_URI = "https://web.skype.com/"
 
        receipt = await arttoken.create(
            ZERO_ADDRESS, 0, SAMPLE_URI, EMPTY_BYTES
        );
        ```

2. Seller create sale with `Marketplace.createDecliningPriceSale(artTokenContractAddress, tokenIds, quantities, startPrice, endPrice, decrementDuration)`
    * *Arguments*.
        * `artTokenContractAddress` is the address of `ArtToken` contract
        * `tokenIds` is the IDs of the NFTs for sale
        * `quantities` is the quantities of each NFT for sale
        * `startPrice` is the starting price of the sale
        * `endPrice` is the ending price of the sale
        * `decrementDuration` is the duration required for starting price to decrease down to ending price
3. Buyer make a bid to the sale with `Marketplace.makeBid(auctionId, nftRecipient, tokenAmount, isOffer)`
    * *Arguments*.
        * `auctionId` is the ID of the sale to make bid or offer
        * `nftRecipient` is the address of the NFT recipient in case of successful purchase. Set to zero in case the buyer is the recipient
        * `tokenAmount` is the amount of WETH used for payment (should be non-zero for declining-price sale)
        * `isOffer` should be `false`
    * *Example*.

        ```js
        receipt = await marketplace.makeBid(auctionId, ZERO_ADDRESS, 10, false);
        ```

4. In case no offer is taken before expiration, marketplace owner stops the sale using `Marketplace.stopAuction(auctionId)`
5. In case of taking no offer, the seller can use `Marketplace.withdrawAuction(auctionId)` to withdraw the auction
6. When the sale expires for too long without further action, the marketplace owner can withdraw the sale using `Marketplace.withdrawAuction(auctionId)`

### Display functions
**Display item activity**. Each time a successful purchase is done, the following event is emitted

```js
event NFTTransferredAndSellerPaid(
    uint256 auctionId, 
    uint256 bidId,
    uint256[] tokenIds,
    uint256[] quantities,
    uint256 price,
    address to,
    address from,
    uint256 blockTimestamp
);
```

**Display token details**. Use `ArtToken.getTokenDetails(tokenId)` to get

```js
artTokenContractAddress, tokenId, tokenStandard, chainId, isMetadataFrozen
```

### Simple front-end for testing
**Environment setup**.

```bash
# Install packages
npm install

# Install http-server
npm install --global http-server
```

**Start the front-end**. Under the project root, run the following command

```bash
npx http-server
```

The `index.html` file is given at `frontend/` directory

## TODO
- [x] Minting
    - [x] Mint ERC1155 NFT tokens with following format JPG, PNG, GIF, SVG, MP4, WEBM, MP3, WAV, OGG, GLB, GLTF. Max size 100MB
    - [x] Function to for lazy minting
        * Solution: NFT creator must approve the marketplace for minting
    - [x] NFTs transfer at sale creation and mint at payment
- [x] Fixed-price sale
    - [x] Fixed price NFT sold in eth (TESTED)
    - [x] Reserve for a specfic buyer ie wallet address (TESTED)
    - [x] Function to settle the sale after expiration (TESTED)
    - [x] Function for buyer to make offer for NFT in eth or weth (TESTED)
        * This is when buyer does not want to buy at fixed price, and make their own offer to seller
        * This function has an expiration date and time for offer (BACKEND DO THIS)
    - [x] Function to accept offer (TESTED)
        * Solution: Save as ordinary bid
- [x] Timed auction sale, i.e. sell to the highest bidder
    - [x] Timed auction NFT sold in weth (TESTED)
    - [x] Reserve price option for auction (TESTED)
    - [x] Maintain multiple offers at a time (TESTED)
        * Solution:
            * For each auction, maintain a list of bidders and bid prices
            * If the highest bidder withdraws the bid, he must pay for picking the new highest bidder
            * If the highest bidder wins the auction, other bids will be saved to `failedTransferCredits`
- [x] Declining-price sale, i.e. allows the listing to reduce price until a buyer is found
    * Provide a function for backend to update buynow price
    - [x] Declining-price sale NFT sold in weth (TESTED)
- [x] Display function
    - [x] Display item activity, i.e. 
        - [x] Item name, price, quantity
        - [x] From username
        - [x] To username
        - [x] Time of transaction
    - [x] Function to display token details, i.e. 
        - [x] Contract address
        - [x] Token ID, Token Standard
        - [x] Blockchain
        - [x] If Metadata is editable
- [x] Function to transfer to another wallet option (TESTED)