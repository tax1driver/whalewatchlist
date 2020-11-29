const Command = require('../command/command')
const Discord = require('discord.js')
const log = require('../log/log')
const DiscordServer = require('../models/DiscordServer')
const BitcoinListener = require('../blockchain')

const command = new Command({
    name: "channel",
    description: "Sets the alert channel",
    usage: "<channel>"
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
            e.message.channel.send("**Usage:** +channel <channel>")
            return;
        }

        const regex = /<#([0-9]*)>/;
        var channelRef = e.arguments[0]

        if (!regex.test(channelRef)) {
            e.message.channel.send("**Error:** The value provided is not a valid channel reference.")
            return;
        }

        var channelID = regex.exec(channelRef)[1]
        var channel = guild.channels.resolve(channelID)
        if (channel == null) {
            e.message.channel.send("**Error:** The value references a channel that does not exist anymore.")
            return;
        }

        // valid channel.
        DiscordServer.findOne({
            snowflake: guild.id
        }).then(document => {
            if (!document) return;

            document.alertChannel = channel.id
            document.save();

            e.message.channel.send(`**Success!** The alert channel was set to <#${channel.id}>`)
        }).catch(e => {
            e.message.channel.send("**Error:** Database error.")
            return;
        })


    })
})

module.exports = command