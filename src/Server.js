const log4js = require("log4js");

const Web3 = require("web3");
const {Indexer} = require("./indexer/Indexer")
const {Contract} = require("./contract/Contract")
const fs = require("fs");

let blockCounter = 0
let totalSpentMs = 0
let totalTransactionCount = 0
let totalUncleCount = 0

class Server {
    constructor(config) {
        this.logger = log4js.getLogger("Server")

        this.web3 = new Web3(new Web3.providers.WebsocketProvider(
            config.websocketEndpoint,
            {
                clientConfig: {
                    maxReceivedFrameSize: 100000000,
                    maxReceivedMessageSize: 100000000,
                }
            }))

        this.pollInterval = config.pollInterval
        this.stateFilePath = config.stateFilenameAbsPath
        this.state = {}

        if(fs.existsSync(this.stateFilePath))
            this.state = require(this.stateFilePath)

        this.state["nextBlock"] = this.state["nextBlock"] || 0
        this.indexer = new Indexer()

        for(let contractConfig of config.contracts) {
            const contract = new Contract(contractConfig.address, contractConfig.pubSubTopic, contractConfig.firstBlock)
            this.indexer.registerContract(contract)
        }

        this.startBlock = this.state["nextBlock"] || this.indexer.firstRelevantBlock()

        this.headOfChainBlockNumber = 0
        this.exit = false
    }

    start() {
        this.web3.eth.getBlockNumber()
            .then(number => this.headOfChainBlockNumber = number)

        setTimeout(async () => this.fetchNextBlock(this.startBlock), 0)
    }

    async fetchNextBlock(blockNumber) {
        if (this.exit) {
            this.logger.info(`Exiting..`)
            return
        }

        const startStamp = Date.now()

        let nextBlockNumber = blockNumber
        let transactionCount = 0
        let uncleTransactionCount = 0

        const block = await this.web3.eth.getBlock(blockNumber, true)

        if (block && block.number === blockNumber) {
            transactionCount = this.processBlock(block)
            for (let uncleHash of block.uncles) {
                const uncleBlock = await this.web3.eth.getBlock(uncleHash, true)
                if (uncleBlock)
                    uncleTransactionCount += this.processBlock(uncleBlock)
                else
                    this.logger.warn(`Got an uncle hash, but no block ${uncleHash}`)
            }

            const spentMs = Date.now() - startStamp
            blockCounter++
            totalSpentMs += spentMs
            totalTransactionCount += transactionCount
            totalUncleCount += uncleTransactionCount

            this.logger.info(`Processed block ${blockNumber} in ${spentMs} ms with ${transactionCount} transactions and ${uncleTransactionCount} uncle transactions`)
            this.logger.info(`${(totalSpentMs / blockCounter).toFixed(0)} ms avg over ${blockCounter} blocks with ${totalTransactionCount} transactions and ${totalUncleCount} uncle transactions` )

            nextBlockNumber++
            this.updateState(nextBlockNumber)
        }

        let timeout = this.pollInterval
        if(nextBlockNumber < this.headOfChainBlockNumber)
            timeout = 0

        setTimeout(async () => this.fetchNextBlock(nextBlockNumber),
            timeout)
    }

    processBlock(block) {
        let processedTransactions = 0
        for (let transaction of block.transactions) {
            if (this.indexer.processTransaction(transaction))
                processedTransactions++
        }

        return processedTransactions
    }

    updateState(block) {
        this.state["nextBlock"] = block

        fs.writeFileSync(this.stateFilePath, JSON.stringify(this.state)+"\n")
    }
}


module.exports = {
    Server
}