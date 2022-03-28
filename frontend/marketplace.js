let arttokenContract;
let marketplaceContract;
let weth10Contract;

const ARTTOKEN_ADDRESS = "0x3DE91Bcd7672c0006d560945e69D96B28e03885A";
const MARKETPLACE_ADDRESS = "0x5766DEf106CD3d09D4E7F53f6B46f39c0751dA21";
const WETH10_ADDRESS = "0x60BCEE3aA4CcA058eB9c096B33079f457A7CDdD0";

let ZERO_ADDRESS;
let EMPTY_BYTES;
let SAMPLE_URI;

let eventLogs = [];

const initWeb3 = async () => {
    console.log(window);
    if (window.ethereum) {
        await window.ethereum.request({
            method: "eth_requestAccounts",
        });
        window.web3 = new Web3(window.ethereum);
        return true;
    }
    return false;
};

const init = async () => {
    const result = await initWeb3();
    if (result) {
        ZERO_ADDRESS = web3.utils.padLeft(web3.utils.toHex(0), 40);
        EMPTY_BYTES = web3.utils.padLeft(web3.utils.toHex(0), 64);
        SAMPLE_URI = "https://web.skype.com/";
        
        initContracts();
    } else {
        console.log("Cannot init web3");
    }
};

// TESTED
const getCashBalances = async () => {
    let myAddress;
    if (document.getElementById('account-key') == null) {
        myAddress = web3.currentProvider.selectedAddress;
    } else {
        const privateKey = document.getElementById('account-key').value;
        const account = await web3.eth.accounts.privateKeyToAccount(privateKey);
        myAddress = account.address;
    }

    let weiBalance = await web3.eth.getBalance(myAddress);
    let wethBalance = await weth10Contract.methods.balanceOf(myAddress)
        .call({from: myAddress});
    return [weiBalance, wethBalance];
}

const connectToMetamask = async () => {
    const result = initWeb3();
    if (result) {
        console.log("account:", web3.currentProvider.selectedAddress);
        $("#metamask-status").text("Metamask status: Connected");
        $("#metamask-account").text(`Metamask account: ${web3.currentProvider.selectedAddress}`);
        $("#marketplace-address").text(`Marketplace address: ${MARKETPLACE_ADDRESS}`);
        $("#arttoken-address").text(`NFT contract address: ${ARTTOKEN_ADDRESS}`);
        $("#weth10-address").text(`WETH address: ${WETH10_ADDRESS}`);
        
        let [weiBalance, wethBalance] = await getCashBalances();
        $("#wei-balance").text(`Wei balance: ${weiBalance}`);
        $("#weth-balance").text(`WETH balance: ${wethBalance}`);
        
        renderAccountBoard();
        renderNftBoard();
        renderWethBoard();
        renderMarketplaceBoard();
    } else {
        console.log("cannot connect to metamask");
        $("#metamask-status").text("Metamask status: Disconnected");
    }
};

const initContracts = async () => {
    const arttokenResponse = $.getJSON({
        url: "../build/contracts/ArtToken.json",
        async: false,
    }).responseText;
    const arttokenJSON = JSON.parse(arttokenResponse);
    arttokenContract = new web3.eth.Contract(
        arttokenJSON.abi,
        ARTTOKEN_ADDRESS
    );

    const marketplaceResponse = $.getJSON({
        url: "../build/contracts/Marketplace.json",
        async: false,
    }).responseText;
    const marketplaceJSON = JSON.parse(marketplaceResponse);
    marketplaceContract = new web3.eth.Contract(
        marketplaceJSON.abi,
        MARKETPLACE_ADDRESS
    );

    const weth10Response = $.getJSON({
        url: "../build/contracts/WETH10.json",
        async: false,
    }).responseText;
    const weth10JSON = JSON.parse(weth10Response);
    weth10Contract = new web3.eth.Contract(
        weth10JSON.abi,
        WETH10_ADDRESS
    );
};

const renderAccountBoard = async () => {
    
    let html = "";
    $("#account-board").html(html);
    html += `
        <div id="functionality">`
    
    // Create NFT
    html += `
        <h4>Account to log-in (all subsequent function calls will use this account)</h4>
        <form>
            <label for="account-key">Account private key to log in:</label><br>
            <input type="text" id="account-key" name="account-key"><br>
        </form>
        <p>Cautions: Please switch Metamask to the corresponding account before moving on</p>
        <hr>
    `

    html += `
        </div>
    `;
    $("#account-board").html(html);
};

const renderNftBoard = async () => {
    let html = "";
    $("#nft-board").html(html);
    html += `
        <div id="functionality">`
    
    // Create NFT
    html += `
        <h4>Create NFT</h4>
        <form>
            <label for="nft-uri">NFT URI:</label><br>
            <input type="text" id="nft-uri" name="nft-uri"><br>
        </form>
        <button onClick="createNft()">Create NFT</button>
    `

    // Check NFT owner
    html += `
        <h4>Query NFT owner</h4>
        <form>
            <label for="nft-id-for-owner">Token ID:</label><br>
            <input type="text" id="nft-id-for-owner" name="nft-id-for-owner"><br>
        </form>
        <button onClick="getOwnerOf()">Get NFT owner</button>
        <p id="nft-owner-result">NFT Owner: </p>
    `

    // Check NFT balance
    html += `
        <h4>Query NFT balance</h4>
        <form>
            <label for="nft-id-for-balance">Token ID:</label><br>
            <input type="text" id="nft-id-for-balance" name="nft-id-for-balance"><br>
        </form>
        <button onClick="getBalanceOf()">Get NFT balance</button>
        <p id="nft-balance-result">NFT Balance: </p>
    `

    // Check NFT details
    html += `
        <h4>Query NFT details</h4>
        <form>
            <label for="nft-id-for-details">Token ID:</label><br>
            <input type="text" id="nft-id-for-details" name="nft-id-for-details"><br>
        </form>
        <button onClick="getDetailsOf()">Get NFT details</button>
        <p id="nft-details-result">NFT Details: </p>
    `

    // Freeze NFT metadata
    html += `
        <h4>Freeze NFT metadata</h4>
        <form>
            <label for="nft-id-for-freezing">Token ID:</label><br>
            <input type="text" id="nft-id-for-freezing" name="nft-id-for-freezing"><br>
        </form>
        <button onClick="freezeNftMetadata()">Freeze NFT metadata</button>
    `

    html += `
        </div>
    `;
    $("#nft-board").html(html);
};

async function updateEventLogs(receipt) {
    let html = "";
    for (const eventKey in receipt.events) {
        let eventObject = {
            eventKey: eventKey,
            returnValues: receipt.events[eventKey].returnValues
        }
        eventLogs.push(eventObject);
        html += `
            <div id="event-${receipt.events[eventKey].id}">
                <p>${JSON.stringify(eventObject)}</p>
                <hr>
            </div>
        `;
    }
    document.getElementById("event-board").innerHTML = 
        document.getElementById("event-board").innerHTML + html;
        
    let [weiBalance, wethBalance] = await getCashBalances();
    $("#wei-balance").text(`Wei balance: ${weiBalance}`);
    $("#weth-balance").text(`WETH balance: ${wethBalance}`);
}

// TESTED
const createNft = async () => {
    const privateKey = document.getElementById('account-key').value;
    const account = await web3.eth.accounts.privateKeyToAccount(privateKey);
    const myAddress = account.address;
    
    const uri = document.getElementById('nft-uri').value;
    receipt = await arttokenContract.methods.create(
        ZERO_ADDRESS, 0, uri, EMPTY_BYTES
    ).send({from: myAddress});
    await updateEventLogs(receipt);
};

// TESTED
const getBalanceOf = async () => {
    const privateKey = document.getElementById('account-key').value;
    const account = await web3.eth.accounts.privateKeyToAccount(privateKey);
    const myAddress = account.address;
    const tokenId = document.getElementById('nft-id-for-balance').value;
    receipt = await arttokenContract.methods
        .balanceOf(myAddress, tokenId)
        .call({from: myAddress});
    console.log(receipt);
    $("#nft-balance-result").text(`NFT Balance: ${receipt}`);
};

// TESTED
const getOwnerOf = async () => {
    const privateKey = document.getElementById('account-key').value;
    const account = await web3.eth.accounts.privateKeyToAccount(privateKey);
    const myAddress = account.address;
    const tokenId = document.getElementById('nft-id-for-owner').value;
    receipt = await arttokenContract.methods.creators(tokenId)
        .call({from: myAddress});
    $("#nft-owner-result").text(`NFT Balance: ${receipt}`);
};

// TESTED
const getDetailsOf = async () => {
    const privateKey = document.getElementById('account-key').value;
    const account = await web3.eth.accounts.privateKeyToAccount(privateKey);
    const myAddress = account.address;
    const tokenId = document.getElementById('nft-id-for-details').value;
    receipt = await arttokenContract.methods.getTokenDetails(tokenId)
        .call({from: myAddress});
    let nftDetailsObject = {
        nftContractAddress: receipt["0"], 
        tokenId: receipt["1"], 
        tokenStandard: receipt["2"], 
        chainId: receipt["3"], 
        isMetadataFrozen: receipt["4"]
    };
    $("#nft-details-result").text(`NFT Details: ${JSON.stringify(nftDetailsObject)}`);
};

// TESTED
const freezeNftMetadata = async () => {
    const privateKey = document.getElementById('account-key').value;
    const account = await web3.eth.accounts.privateKeyToAccount(privateKey);
    const myAddress = account.address;
    const tokenId = document.getElementById('nft-id-for-freezing').value;
    receipt = await arttokenContract.methods.freezeMetadata(tokenId)
        .send({from: myAddress});
    await updateEventLogs(receipt);
};

const renderWethBoard = async () => {
    let html = "";
    $("#weth-board").html(html);
    html += `
        <div id="functionality">`
    
    // Deposit Wei to WETH
    html += `
        <h4>Cast Wei to WETH</h4>
        <form>
            <label for="wei-to-weth-amount">Wei-to-WETH amount:</label><br>
            <input type="text" id="wei-to-weth-amount" name="wei-to-weth-amount"><br>
        </form>
        <button onClick="cast_wei2Weth()">Get WETH</button>
    `

    // Deposit WETH to Wei
    html += `
        <h4>Cast WETH to Wei</h4>
        <form>
            <label for="weth-to-weit-amount">WETH-to-Wei amount:</label><br>
            <input type="text" id="weth-to-weit-amount" name="weth-to-weit-amount"><br>
        </form>
        <button onClick="cast_weth2Wei()">Get Wei</button>
    `

    html += `
        </div>
    `;
    $("#weth-board").html(html);
};

// TESTED
const cast_wei2Weth = async () => {
    const privateKey = document.getElementById('account-key').value;
    const account = await web3.eth.accounts.privateKeyToAccount(privateKey);
    const myAddress = account.address;
    const amount = document.getElementById('wei-to-weth-amount').value;
    receipt = await weth10Contract.methods.deposit()
        .send({from: myAddress, value: amount});
    await updateEventLogs(receipt);
};

// TESTED
const cast_weth2Wei = async () => {
    const privateKey = document.getElementById('account-key').value;
    const account = await web3.eth.accounts.privateKeyToAccount(privateKey);
    const myAddress = account.address;
    const amount = document.getElementById('weth-to-weit-amount').value;
    receipt = await weth10Contract.methods.withdraw(amount)
        .send({from: myAddress});
    await updateEventLogs(receipt);
};

const renderMarketplaceBoard = async () => {
    let html = "";
    $("#marketplace-board").html(html);
    html += `
        <div id="functionality">`
    
    html += `
        <h4>Display auction or sale info</h4>
        <form>
            <label for="auction-id-to-display">Auction ID to investigate:</label><br>
            <input type="text" id="auction-id-to-display" name="auction-id-to-display"><br>
        </form>
        <button onClick="displayAuctionInfo()">Display auction details</button>
        <p id="auction-details">Auction Details:</p>
    `
    
    // Create NFT auctions or sales
    html += `
        <h4>Create sale</h4>
        <form>
            <label for="sale-token-ids">NFT IDs for sale (separated by comma), e.g. 1,3,4,7:</label><br>
            <input type="text" id="sale-token-ids" name="sale-token-ids"><br>
            
            <label for="sale-quantities">NFT quantities for sale (separated by comma), e.g. 10,1,15,9:</label><br>
            <input type="text" id="sale-quantities" name="sale-quantities"><br>
            
            <label for="sale-min-price">Reserve price for timed auction (or ending price for declining-price sale):</label><br>
            <input type="text" id="sale-min-price" name="sale-min-price"><br>
            
            <label for="sale-buy-now-price">Buy-now price for timed auction and fixed-price sale (or starting price for declining-price sale):</label><br>
            <input type="text" id="sale-buy-now-price" name="sale-buy-now-price"><br>

            <label for="sale-bid-incre-percentage">Bid increase percentage (100 for 1% increment) (for timed auction):</label><br>
            <input type="text" id="sale-bid-incre-percentage" name="sale-bid-incre-percentage"><br>

            <label for="sale-whitelisted-buyer">White-listed buyer (for fixed-price sale). Left empty if no whitelisted buyer is indicated:</label><br>
            <input type="text" id="sale-whitelisted-buyer" name="sale-whitelisted-buyer"><br>

            <label for="sale-decrement-duration">Price decrement duration (for declining-price sale) in seconds:</label><br>
            <input type="text" id="sale-decrement-duration" name="sale-decrement-duration"><br>
        </form>
        <button onClick="createFixedPriceSale()">Create fixed-price sale</button>
        <button onClick="createTimedAuction()">Create timed auction sale</button>
        <button onClick="createDecliningPriceSale()">Create declining-price sale</button>
    `

    // Make or withdraw bid
    html += `
        <h4>Make or withdraw bid</h4>
        <form>
            <label for="make-bid-auction-id">Auction ID to bid or withdraw bid:</label><br>
            <input type="text" id="make-bid-auction-id" name="make-bid-auction-id"><br>

            <label for="make-bid-bid-id">Bid ID to withdraw (if desired):</label><br>
            <input type="text" id="make-bid-bid-id" name="make-bid-bid-id"><br>

            <label for="bid-amount">Amount to bid:</label><br>
            <input type="text" id="bid-amount" name="bid-amount"><br>

            <label for="make-bid-recipient">NFT recipient upon successful purchase (for making bid). Left empty if buyer is the recipient:</label><br>
            <input type="text" id="make-bid-recipient" name="make-bid-recipient"><br>

            <label for="make-bid-is-offer">Is offer (for making bid to fixed-price sale only):</label><br>
            <input type="checkbox" id="make-bid-is-offer" name="make-bid-is-offer"><br>
        </form>
        <button onClick="makeBid()">Make bid to auction</button>
        <button onClick="withdrawBid()">Withdraw bid from auction</button>
    `

    // Withdraw all credits
    html += `
        <h4>Withdraw all credits</h4>
        <button onClick="withdrawAllCredits()">Withdraw all credited cash from marketplace</button>
    `

    // Update auction info
    html += `
        <h4>Update auction information</h4>
        <form>
            <label for="auction-id-to-update">Auction ID to update information:</label><br>
            <input type="text" id="auction-id-to-update" name="auction-id-to-update"><br>
        </form>

        <form>
            <label for="update-whitelisted-buyer">New whitelisted buyer address:</label><br>
            <input type="text" id="update-whitelisted-buyer" name="update-whitelisted-buyer"><br>
        </form>
        <button onClick="updateWhitelistedBuyer()">Update whitelisted buyer</button>

        <form>
            <label for="update-min-price">New reverse price for timed auction:</label><br>
            <input type="text" id="update-min-price" name="update-min-price"><br>
        </form>
        <button onClick="updateMinPrice()">Update reserve price</button>

        <form>
            <label for="update-buy-now-price">New buy-now price for timed auction and fixed-price sale:</label><br>
            <input type="text" id="update-buy-now-price" name="update-buy-now-price"><br>
        </form>
        <button onClick="updateBuyNowPrice()">Update buy-now price</button>
    `

    // Stop and terminate auction
    html += `
        <h4>Take offer and terminate auction or sale</h4>
        <form>
            <label for="auction-id-to-take-offer">Auction ID to take offer:</label><br>
            <input type="text" id="auction-id-to-take-offer" name="auction-id-to-take-offer"><br>

            <label for="bid-id-to-take">Bid ID to take:</label><br>
            <input type="text" id="bid-id-to-take" name="bid-id-to-take"><br>
        </form>
        <button onClick="takeOffer()">Take offer and terminate auction or sale</button>

        <h4>Stop auction</h4>
        <form>
            <label for="sale-id-to-stop">Sale or auction ID to stop:</label><br>
            <input type="text" id="sale-id-to-stop" name="sale-id-to-stop"><br>
        </form>
        <button onClick="stopAuction()">Stop auction</button>

        <h4>Settle a stopped auction</h4>
        <form>
            <label for="auction-id-to-settle">Auction ID to settle:</label><br>
            <input type="text" id="auction-id-to-settle" name="auction-id-to-settle"><br>

            <label for="bid-id-to-settle">Bid ID to settle:</label><br>
            <input type="text" id="bid-id-to-settle" name="bid-id-to-settle"><br>

            <label for="is-settle-highest-bid">Pick highest bid:</label><br>
            <input type="checkbox" id="is-settle-highest-bid" name="is-settle-highest-bid"><br>
        </form>
        <button onClick="settleAuction()">Settle auction by taking a bid</button>

        <h4>Withdraw an auction</h4>
        <form>
            <label for="auction-id-to-withdraw">Auction ID to withdraw:</label><br>
            <input type="text" id="auction-id-to-withdraw" name="auction-id-to-withdraw"><br>
        </form>
        <button onClick="withdrawAuction()">Withdraw auction from marketplace</button>
    `

    html += `
        </div>
    `;
    $("#marketplace-board").html(html);
}

// TESTED
const displayAuctionInfo = async () => {
    const privateKey = document.getElementById('account-key').value;
    const account = await web3.eth.accounts.privateKeyToAccount(privateKey);
    const myAddress = account.address;
    const auctionId = document.getElementById('auction-id-to-display').value;
    receipt = await marketplaceContract.methods.idToAuction(auctionId).call({from: myAddress});
    console.log(receipt);
    $("#auction-details").text(`Auction Details: ${JSON.stringify(receipt)}`);
};

// TESTED
const createFixedPriceSale = async () => {
    const privateKey = document.getElementById('account-key').value;
    const account = await web3.eth.accounts.privateKeyToAccount(privateKey);
    const myAddress = account.address;

    let tokenIds = document.getElementById('sale-token-ids').value.match(/[^\s,]+/g);
    tokenIds = Array.from(tokenIds, Number);
    let quantities = document.getElementById('sale-quantities').value.match(/[^\s,]+/g);
    quantities = Array.from(quantities, Number);
    let price = document.getElementById('sale-buy-now-price').value;
    let whitelistedBuyer = document.getElementById('sale-whitelisted-buyer').value;
    if (whitelistedBuyer.length == 0)
        whitelistedBuyer = ZERO_ADDRESS;
    
    console.log(`Token IDs: ${tokenIds}`);
    console.log(`Token quantities: ${quantities}`);
    console.log(`Price: ${price}`);
    console.log(`Whitelisted buyer: ${whitelistedBuyer}`);

    receipt = await arttokenContract.methods.setApprovalForAll(
        MARKETPLACE_ADDRESS, true
    ).send({from: myAddress});
    await updateEventLogs(receipt);
    
    receipt = await marketplaceContract.methods.createSale(
        ARTTOKEN_ADDRESS, tokenIds, quantities, price, whitelistedBuyer
    ).send({from: myAddress});
    await updateEventLogs(receipt);
};

// TESTED
const createTimedAuction = async () => {
    const privateKey = document.getElementById('account-key').value;
    const account = await web3.eth.accounts.privateKeyToAccount(privateKey);
    const myAddress = account.address;

    let tokenIds = document.getElementById('sale-token-ids').value.match(/[^\s,]+/g);
    tokenIds = Array.from(tokenIds, Number);
    let quantities = document.getElementById('sale-quantities').value.match(/[^\s,]+/g);
    quantities = Array.from(quantities, Number);
    let minPrice = document.getElementById('sale-min-price').value;
    let buyNowPrice = document.getElementById('sale-buy-now-price').value;
    let bidIncreasePercentage = document.getElementById('sale-bid-incre-percentage').value;
    
    console.log(`Token IDs: ${tokenIds}`);
    console.log(`Token quantities: ${quantities}`);
    console.log(`Minimum price: ${minPrice}`);
    console.log(`Buy-now price: ${buyNowPrice}`);
    console.log(`Bid increase percentage: ${bidIncreasePercentage}`);

    receipt = await arttokenContract.methods.setApprovalForAll(
        MARKETPLACE_ADDRESS, true
    ).send({from: myAddress});
    await updateEventLogs(receipt);
    
    receipt = await marketplaceContract.methods.createNftAuction(
        ARTTOKEN_ADDRESS, tokenIds, quantities, minPrice, buyNowPrice, bidIncreasePercentage
    ).send({from: myAddress});
    await updateEventLogs(receipt);
};

// TESTED
const createDecliningPriceSale = async () => {
    const privateKey = document.getElementById('account-key').value;
    const account = await web3.eth.accounts.privateKeyToAccount(privateKey);
    const myAddress = account.address;

    let tokenIds = document.getElementById('sale-token-ids').value.match(/[^\s,]+/g);
    tokenIds = Array.from(tokenIds, Number);
    let quantities = document.getElementById('sale-quantities').value.match(/[^\s,]+/g);
    quantities = Array.from(quantities, Number);
    let endingPrice = document.getElementById('sale-min-price').value;
    let startPrice = document.getElementById('sale-buy-now-price').value;
    let decrementDuration = document.getElementById('sale-decrement-duration').value;
    
    console.log(`Token IDs: ${tokenIds}`);
    console.log(`Token quantities: ${quantities}`);
    console.log(`Ending price: ${endingPrice}`);
    console.log(`Starting price: ${startPrice}`);
    console.log(`Decrement duration: ${decrementDuration}`);

    receipt = await arttokenContract.methods.setApprovalForAll(
        MARKETPLACE_ADDRESS, true
    ).send({from: myAddress});
    await updateEventLogs(receipt);
    
    receipt = await marketplaceContract.methods.createDecliningPriceSale(
        ARTTOKEN_ADDRESS, tokenIds, quantities, startPrice, endingPrice, decrementDuration
    ).send({from: myAddress});
    await updateEventLogs(receipt);
};

// TESTED FOR FIXED-PRICE SALE, DECLINING-PRICE SALE, TIMED AUCTION
const makeBid = async () => {
    const privateKey = document.getElementById('account-key').value;
    const account = await web3.eth.accounts.privateKeyToAccount(privateKey);
    const myAddress = account.address;

    const auctionId = document.getElementById('make-bid-auction-id').value;
    const bidAmount = document.getElementById('bid-amount').value;
    let nftRecipient = document.getElementById('make-bid-recipient').value;
    if (nftRecipient.length == 0)
        nftRecipient = ZERO_ADDRESS;
    let isOffer = document.querySelector('#make-bid-is-offer').checked;

    console.log(`Auction ID: ${auctionId}`);
    console.log(`Bid amount: ${bidAmount}`);
    console.log(`NFT recipient: ${nftRecipient}`);
    console.log(`Is offer: ${isOffer}`);
    
    let auction = await marketplaceContract.methods.idToAuction(auctionId)
        .call({from: myAddress});
    console.log(`Auction type: ${auction}`);
    if (auction["auctionType"] != "0") {
        receipt = await weth10Contract.methods.approve(
            MARKETPLACE_ADDRESS, bidAmount
        ).send({from: myAddress});
        await updateEventLogs(receipt);

        receipt = await marketplaceContract.methods.makeBid(
            auctionId, nftRecipient, bidAmount, isOffer
        ).send({from: myAddress});
    } else {
        receipt = await marketplaceContract.methods.makeBid(
            auctionId, nftRecipient, 0, isOffer 
        ).send({from: myAddress, value: bidAmount});
    }
    await updateEventLogs(receipt);
};

// TESTED
const withdrawBid = async () => {
    const privateKey = document.getElementById('account-key').value;
    const account = await web3.eth.accounts.privateKeyToAccount(privateKey);
    const myAddress = account.address;

    const auctionId = document.getElementById('make-bid-auction-id').value;
    const bidId = document.getElementById('make-bid-bid-id').value;
    receipt = await marketplaceContract.methods.withdrawBid(auctionId, bidId)
        .send({from: myAddress});
    await updateEventLogs(receipt);
};

// TESTED
const withdrawAllCredits = async () => {
    const privateKey = document.getElementById('account-key').value;
    const account = await web3.eth.accounts.privateKeyToAccount(privateKey);
    const myAddress = account.address;

    receipt = await marketplaceContract.methods.withdrawAllCredits()
        .send({from: myAddress});
    await updateEventLogs(receipt);
};

// TESTED
const updateWhitelistedBuyer = async () => {
    const privateKey = document.getElementById('account-key').value;
    const account = await web3.eth.accounts.privateKeyToAccount(privateKey);
    const myAddress = account.address;

    const auctionId = document.getElementById('auction-id-to-update').value;
    const newValue = document.getElementById('update-whitelisted-buyer').value;
    receipt = await marketplaceContract.methods.updateWhitelistedBuyer(
        auctionId, newValue
    ).send({from: myAddress});
    await updateEventLogs(receipt);
};

// TESTED
const updateMinPrice = async () => {
    const privateKey = document.getElementById('account-key').value;
    const account = await web3.eth.accounts.privateKeyToAccount(privateKey);
    const myAddress = account.address;

    const auctionId = document.getElementById('auction-id-to-update').value;
    const newValue = document.getElementById('update-min-price').value;
    receipt = await marketplaceContract.methods.updateMinimumPrice(
        auctionId, newValue
    ).send({from: myAddress});
    await updateEventLogs(receipt);
};

// TESTED
const updateBuyNowPrice = async () => {
    const privateKey = document.getElementById('account-key').value;
    const account = await web3.eth.accounts.privateKeyToAccount(privateKey);
    const myAddress = account.address;

    const auctionId = document.getElementById('auction-id-to-update').value;
    const newValue = document.getElementById('update-buy-now-price').value;
    receipt = await marketplaceContract.methods.updateBuyNowPrice(
        auctionId, newValue
    ).send({from: myAddress});
    await updateEventLogs(receipt);
};

// TESTED
const takeOffer = async () => {
    const privateKey = document.getElementById('account-key').value;
    const account = await web3.eth.accounts.privateKeyToAccount(privateKey);
    const myAddress = account.address;

    const auctionId = document.getElementById('auction-id-to-take-offer').value;
    const bidId = document.getElementById('bid-id-to-take').value;
    receipt = await marketplaceContract.methods.takeOffer(
        auctionId, bidId
    ).send({from: myAddress});
    await updateEventLogs(receipt);
};

// TESTED
const stopAuction = async () => {
    const privateKey = document.getElementById('account-key').value;
    const account = await web3.eth.accounts.privateKeyToAccount(privateKey);
    const myAddress = account.address;

    const auctionId = document.getElementById('sale-id-to-stop').value;
    receipt = await marketplaceContract.methods.stopAuction(auctionId)
        .send({from: myAddress});
    await updateEventLogs(receipt);
};

// TESTED
const settleAuction = async () => {
    const privateKey = document.getElementById('account-key').value;
    const account = await web3.eth.accounts.privateKeyToAccount(privateKey);
    const myAddress = account.address;

    const auctionId = document.getElementById('auction-id-to-settle').value;
    const bidId = document.getElementById('bid-id-to-settle').value;
    const takeHighestBid = document.querySelector('#is-settle-highest-bid').checked;
    receipt = await marketplaceContract.methods.settleAuction(
        auctionId, bidId, takeHighestBid
    ).send({from: myAddress});
    await updateEventLogs(receipt);
};

// TESTED
const withdrawAuction = async () => {
    const privateKey = document.getElementById('account-key').value;
    const account = await web3.eth.accounts.privateKeyToAccount(privateKey);
    const myAddress = account.address;
    
    const auctionId = document.getElementById('auction-id-to-withdraw').value;
    receipt = await marketplaceContract.methods.withdrawAuction(auctionId)
        .send({from: myAddress});
    await updateEventLogs(receipt);
};

const refresh = async () => {
  renderNftBoard();
  renderWethBoard();
  renderMarketplaceBoard();
};

init();