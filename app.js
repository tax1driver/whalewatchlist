const Discord = require('discord.js')
const fs = require('fs')
const log = require('./log/log')
const mongoose = require('mongoose')

const bot = new Discord.Client();

const Command = require('./command/command')
const cmdManager = require('./command/command_manager')

const DiscordServer = require('./models/DiscordServer')
const BitcoinListener = require('./blockchain')

var botOptions = {}


bot.on('ready', () => {
    log.ok('Successfully logged in')
    
    bot.user.setUsername(botOptions.name)
    bot.user.setStatus('online')
    bot.user.setActivity("the whales!", {
        type: "WATCHING",
    })
    bot.generateInvite(['ADMINISTRATOR'])
    .then(link => log.ok(`Invite link: ${link}`))
    .catch(log.error);

    cmdManager.setPrefix(botOptions.prefix)
    cmdManager.addAllCommands()

    mongoose.connect('mongodb://localhost/whalewatchlist')
    var db = mongoose.connection;


    db.on('error', console.error.bind(console, 'Connection error:'));
    db.once('open', function() {
        log.ok('Connected to MongoDB');
        BitcoinListener.init(bot)
    });
})

bot.on('message', (message) => {
    cmdManager.invokeCommand(message)
})

bot.on('guildCreate', (guild) =>  {
    DiscordServer.findOne({
        snowflake: guild.id
    }).then(server => {
        if (server == null) { 
            server = new DiscordServer({
                snowflake: guild.id,
                addresses: []
            })

            var message = `Whale Watchlist notifies you about recent transactions made by BTC addresses that you add to your watchlist.\n` +
                  `\`+add <address> <label>\` - *Adds an address to the server's watchlist.*\n` +
                  `\`+list [page]\` - *Lists addresses in the watchlist.*\n` +
                  `\`+remove <index/address>\` - *Removes an address from the server's watchlist.*\n` +
                  `\`+help\` - *Shows a command list.*\n` +
                  `\`+channel <channel>\` - *Sets the alert channel.*\n` +
                  `If you want to let users manage the watchlist, please make a role called \`Watchlist Manager\` and assign it to them.`


            var sent = false
            guild.channels.cache.forEach(channel => {
                if (channel instanceof Discord.TextChannel && !sent) {
                    channel.send(message)
                    sent = true
                    server.alertChannel = channel.id
                }
            })

            server.save()
            log.ok(`Created new database entry for server ${guild.id}!`)
        }
    }).catch(e => {
        log.error("Database error:", e)
    })

    


})


fs.readFile('config.json', null, (err, data) => {
    var defaults = {
        prefix: "!",
        name: "A discord bot",
    }

    var parsed = JSON.parse(data.toString())
    parsed = Object.assign({}, defaults, parsed)

    bot.login(parsed.token)
        .catch((e) => {
            console.error(e)
            process.exit(1)
        })

    botOptions = parsed
})




