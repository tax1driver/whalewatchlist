const Command = require('../command/command')
const Discord = require('discord.js')
const log = require('../log/log')
const DiscordServer = require('../models/DiscordServer')
const BitcoinListener = require('../blockchain')

const command = new Command({
    name: "add",
    description: "Adds an address to the watchlist",
    usage: "<address> <label>"
})

command.on('invoke', (e) => {
    if (typeof e.message.channel.guild === 'undefined') {
        e.message.channel.send("**Error:** Please use the command within a guild.")
        return;
    }

    let guild = e.message.channel.guild
    var member = null;

    guild.members.fetch(e.message.author.id, true).then(function(guildMember) {
        member = guildMember
        const hasRoleWithName = function(who, name) {
            return new Promise((resolve, reject) => {
                var found = false
                for (var i = 0; i < who["_roles"].length; i++) {
                    var j = i
                    
                    var role = guild.roles.cache.get(who["_roles"][i])
                    if (role.name == name) {
                        return resolve(true)
                    }
                }             
                return resolve(false)
            })
        }

        return hasRoleWithName(member, "Watchlist Manager")
    }).then(hasRole => {
        if (!hasRole && !member.hasPermission(Discord.Permissions.FLAGS.ADMINISTRATOR)) {
            e.message.channel.send("**Error:** You need to be either a server administrator or have a role named `Watchlist Manager`.")
            return;
        }

        if (e.arguments.length < 2) {
            e.message.channel.send("**Usage:** +add <address> <label>")
            return;
        }
    
        var address = e.arguments[0]
        var label = e.arguments.slice(1).join(" ")
    
        const regex = /^[13][a-km-zA-HJ-NP-Z0-9]{26,33}$/igm;
        if (!regex.test(address)) {
            e.message.channel.send("**Error:** The address provided is not a valid BTC address.")
            return;
        }


        DiscordServer.findOne({
            snowflake: guild.id
        }).then(document => {
            if (!document) return;

            var alreadyExists = false

            document.addresses.forEach(value => {
                if (value.address == address) {
                    alreadyExists = true
                }                
            })

            if (alreadyExists) {
                e.message.channel.send("**Error:** The address provided already exists in the watchlist.")
                return;
            }

            document.addresses.push({
                blockchain: "BTC",
                address: address,
                label: label
            })

            document.save()

            BitcoinListener.addAddressReference(address, guild.id)
            e.message.channel.send("**Success!** Now watching BTC address `"+address+"`. The label for that address is set as `"+label+"`.")
        }).catch(e => {
            e.message.channel.send("**Error:** Database error.")
            return;
        })
    }).catch(e => {
        e.message.channel.send("**Error:** Internal error.")
        return;
    })

    

    
})

module.exports = command