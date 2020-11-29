const Discord = require('discord.js')
const log = require('../log/log')
const DiscordServer = require('../models/DiscordServer')

const WebSocket = require('ws')
const API_BITCOIN = "wss://ws.blockchain.info/inv";

const BitcoinListener = {
    addresses: [],
    txs: [],
    bot: null,
    fnsBound: false,
    init: function(bot) {
        try {
            log.ok(`Initializing Blockchain.info socket...`)
            this.ws = new WebSocket(API_BITCOIN)

            this.addresses = []
            this.txs = []
            this.bot = bot

            if (!this.fnsBound) {
                log.ok("Bound functions.")
                this.init = this.init.bind(this)
                this.onSocketOpen = this.onSocketOpen.bind(this)
                this.onSocketError = this.onSocketError.bind(this)
                this.onSocketClose = this.onSocketClose.bind(this)
                this.onSocketMessage = this.onSocketMessage.bind(this)
                this.fnsBound = true
            }


            this.ws.on('message', (message) => { this.onSocketMessage(message) })
            this.ws.on('error', (e) => { this.onSocketError(e) })
            this.ws.on('close', (e) => { this.onSocketClose(e) })
            this.ws.on('open', () => { this.onSocketOpen() })
            

        } catch(e) {
            log.error(e)
            log.info("Retrying in 5 seconds.")
            setTimeout(this.init, 5000, bot)
        }
        
    },

    removeAddressReference: function(address, serverID) {
        if (address in this.addresses) {
            var index = this.addresses[address].indexOf(serverID)
            if (index != -1) {
                this.addresses[address].splice(index, 1)
                log.ok("Removed discord server reference for:", address, "server:", serverID)

                if (this.addresses[address].length == 0) {
                    log.ok(`No more references for: ${address}, unsubscribing.`)
                    this.addresses.splice(this.addresses.indexOf(address))
                    this.unsubscribeAddress(address)
                }
            } else {
                log.info(`Tried to remove reference from address: ${address}, server: ${serverID}, but this server doesn't watch that address!`)
            }
        }
    },

    addAddressReference: function(address, serverID) {
        if (!(address in this.addresses)) {
            //log.ok(this.addresses)
            this.addresses[address] = []
            this.addresses[address].push(serverID)
            this.subscibeAddress(address)
            log.ok(`Subscribed to a new address: ${address} (${Object.keys(this.addresses).length} total)`)
        } else {
            this.addresses[address].push(serverID)
            log.ok("Added a reference for address:", address, "server:", serverID)
        }
    },

    subscibeAddress: function(address) {
        this.ws.send(JSON.stringify(
            {
                "op":"addr_sub", 
                "addr": address
            }
        ));
    },

    unsubscribeAddress: function(address) {
        this.ws.send(JSON.stringify(
            {
                "op":"addr_unsub", 
                "addr": address
            }
        ));
    },

    onTransactionReceived: function(tx) {
        try {
            var inputs = tx.x.inputs
            var outputs = tx.x.out
            //log.ok(inputs, outputs)
            var servers = []

            inputs.forEach((input, i) => {
                if (input.prev_out.addr in this.addresses) {
                    this.addresses[input.prev_out.addr].forEach((server) => {
                        if (servers.indexOf(server) == -1) {
                            servers.push(server)
                        }
                    })

                }
            });

            outputs.forEach(output => {
                if (output.addr in this.addresses) {
                    this.addresses[output.addr].forEach((server) => {
                        if (servers.indexOf(server) == -1) {
                            servers.push(server)
                            
                        }
                    })
                }
            });


            servers.forEach(serverID => {
                var server = this.bot.guilds.cache.get(serverID)
                if (server != null) {
                    DiscordServer.findOne({
                        snowflake: serverID
                    }).then(document => {
                        const MAX_INPUT_COUNT = 5
                        const MAX_OUTPUT_COUNT = 10

                        var input_count = 0
                        var out_count = 0

                        var inputsStr = ""
                        var outsStr = ""

                        inputs.forEach(input => {
                            var ref = document.addresses.find(x => x.address === input.prev_out.addr)
                            if (typeof ref !== 'undefined') {
                                if (input_count < MAX_INPUT_COUNT) {
                                    inputsStr += `\`${input.prev_out.addr} (${ref.label})\`\n`
                                    input_count++;
                                }
                            } else {
                                if (input_count < MAX_INPUT_COUNT) {
                                    inputsStr += `\`${input.prev_out.addr}\`\n`
                                    input_count++;
                                } 
                            }
                        });

                        outputs.sort((a, b) => b.value - a.value)
                        
                        outputs.forEach(output => {
                            var ref = document.addresses.find(x => x.address === output.addr)
                            if (typeof ref !== 'undefined') {
                                if (out_count < MAX_OUTPUT_COUNT) {
                                    outsStr +=  `\`${output.value / 100000000} ₿\` -> \`${output.addr} (${ref.label})\`\n`
                                    out_count++;
                                }
                            } else {
                                if (out_count < MAX_OUTPUT_COUNT) {
                                    outsStr +=  `\`${output.value / 100000000} ₿\` -> \`${output.addr}\`\n`
                                    out_count++;
                                }
                            }
                        });

                        if (out_count < outputs.length) {
                            outsStr +=  `*... ${outputs.length - out_count} more outputs ...*\n`
                        }

                        if (input_count < inputs.length) {
                            inputsStr +=  `*... ${inputs.length - input_count} more inputs ...*\n`
                        }


                        var channelID = document.alertChannel
                        var channel = server.channels.resolve(channelID)
                        if (channel) {
                            channel.send(`**New transaction for a watched address!**\nInputs:\n${inputsStr}Outputs:\n${outsStr}\n` +
                                        `https://blockchair.com/bitcoin/transaction/${tx.x.hash}`)
                        }
                    }).catch(e => {
                        log.error(e)
                    })
                }
            })

            log.ok(`Posting transactions to: ${servers}`)
        } catch(e) {
            log.error(e)
        }
    },

    onSocketMessage: function(message) {
        //log.ok(message)
        try {
            var tx = JSON.parse(message)
            if (tx.op != "utx") return; 

            // zapisanie hasha, bo z tego co widze to bc.info wysyla mi dwie powiadomienia dla jednej transakcji na raz.
            var hash = tx.x.hash
            if (this.txs.indexOf(hash) == -1) {
                log.ok(`New transaction, tx hash: ${hash}`)
                this.txs.push(hash)
                this.onTransactionReceived(tx)
            }
        } catch(e) {
            log.error(e)
        }

        
    },

    onSocketError: function(e) {
        log.error(`Blockchain.info socket error: ${e}`)
    },

    onSocketClose: function(e) {
        log.error(`Blockchain.info socket closed: ${e}`)
        setTimeout(this.init, 5000)
    },

    onSocketOpen: function() {
        log.ok(`Blockchain.info socket opened.`)
        DiscordServer.find({}).then(documents => {
            documents.forEach(document => {
                document.addresses.forEach(address => {
                    this.addAddressReference(address.address, document.snowflake)
                })
            });

            log.ok(`Subscribed to ${Object.keys(this.addresses).length} addresses.`)
        }).catch(e => {
            log.error(e)
        })
    }
}

module.exports = BitcoinListener