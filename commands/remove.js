const Command = require('../command/command')
const Discord = require('discord.js')
const log = require('../log/log')
const DiscordServer = require('../models/DiscordServer')
const BitcoinListener = require('../blockchain')

const command = new Command({
    name: "remove",
    description: "Removes an address",
    usage: "<index/address>"
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

        if (e.arguments.length < 1) {
            e.message.channel.send("**Usage:** +remove <index/address>")
            return;
        }
    
        //var address = e.arguments[0]
        return DiscordServer.findOne({
            snowflake: guild.id
        })
    }).then(document => {
        const isNumeric = function(value) {
            return /^-{0,1}\d+$/.test(value);
        }

        var indexToRemove = -1;

        if (!isNumeric(e.arguments[0])) {
            document.addresses.forEach((value, index) => {
                if (value.address == e.arguments[0]) {
                    indexToRemove = index
                }
            })
        } else {
            if (e.arguments[0] >= 0 && e.arguments[0] <= document.addresses.length) {
                indexToRemove = e.arguments[0] - 1
            }
        }

        if (indexToRemove != -1) {
            var address = document.addresses[indexToRemove].address
            var label = document.addresses[indexToRemove].label
            e.message.channel.send(`**Success!** Removed address #${indexToRemove+1} - \`${address}\` - \`"${label}"\` from the list.`)
            document.addresses.splice(indexToRemove, 1)
            document.save()
            BitcoinListener.removeAddressReference(address, guild.id)
            return;
        } else {
            e.message.channel.send(`**Error:** Not found.`)
            return;
        }
    }).catch(e => {
        e.message.channel.send("**Error:** Internal error.")
        return;
    })
})

module.exports = command
