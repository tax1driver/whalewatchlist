const Command = require('../command/command')
const Discord = require('discord.js')
const log = require('../log/log')
const DiscordServer = require('../models/DiscordServer')

const command = new Command({
    name: "list",
    description: "Lists watched adresses",
    usage: "<page>"
})

command.on('invoke', (e) => {
    if (typeof e.message.channel.guild === 'undefined') {
        e.message.channel.send("**Error:** Please use the command within a guild.")
        return;
    }

    var page = 0;

    if (e.arguments.length > 0) {
        page = e.arguments[0] - 1
        if (page < 0) {
            page = 0
        }
    }

    DiscordServer.findOne({
        snowflake: e.message.channel.guild.id
    }).then(document =>  {
        if (!document) return;

        if (document.addresses.length == 0) {
            e.message.channel.send("*There are no adresses in the watchlist.*")
            return;
        }

        const PAGE_SIZE = 15
        var totalPages = Math.ceil(document.addresses.length / PAGE_SIZE)

        if (page > totalPages - 1) {
             page = totalPages - 1
        }

        var message = "**Watchlist: ** *(page "+(page+1)+"/"+totalPages+")*"

        var addresses = document.addresses.slice(page * PAGE_SIZE, (page+1) * PAGE_SIZE)

        var listIndex = page * PAGE_SIZE + 1
        addresses.forEach(address => {
            message += `\n**${listIndex++}**. BTC - \`${address.address}\` - \`"${address.label}"\``
        })

        var addressesLeft = document.addresses.length - ((page + 1) * PAGE_SIZE)
        if (addressesLeft <= 0) { 
            message += `\n*... no more adresses ...*`
        } else {
            message += `\n*... ${addressesLeft} more (use +list ${page + 2} to see the next page) ...*`
        }

        
        e.message.channel.send(message)    
    })


})

module.exports = command