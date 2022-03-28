const ZERO_ADDRESS = web3.utils.padLeft(web3.utils.toHex(0), 40);
const EMPTY_BYTES = web3.utils.padLeft(web3.utils.toHex(0), 64);
const SAMPLE_URI = "https://web.skype.com/";


module.exports = {
    ZERO_ADDRESS,
    EMPTY_BYTES,
    SAMPLE_URI
}