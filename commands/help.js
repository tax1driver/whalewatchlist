const Command = require('../command/command')
const Discord = require('discord.js')
const log = require('../log/log')
const DiscordServer = require('../models/DiscordServer')

const command = new Command({
    name: "help",
    description: "Lists watched adresses",
    usage: "<page>"
})

command.on('invoke', (e) => {
    if (typeof e.message.channel.guild === 'undefined') {
        e.message.channel.send("**Error:** Please use the command within a guild.")
        return;
    }

    var message = `Whale Watchlist notifies you about recent transactions made by BTC addresses that you add to your watchlist.\n` +
                  `\`+add <address> <label>\` - *Adds an address to the server's watchlist.*\n` +
                  `\`+list [page]\` - *Lists addresses in the watchlist.*\n` +
                  `\`+remove <index/address>\` - *Removes an address from the server's watchlist.*\n` +
                  `\`+help\` - *Shows a command list.*\n` +
                  `\`+channel <channel>\` - *Sets the alert channel.*\n` +
                  `If you want to let users manage the watchlist, please make a role called \`Watchlist Manager\` and assign it to them.`
    
    e.message.channel.send(message)
    


})

module.exports = command