const mongoose = require('mongoose')

var discordServerSchema = new mongoose.Schema({
    snowflake: String,
    alertChannel: String,
    addresses: [
        {
            blockchain: String,
            address: String,
            label: String
        }
    ]
})

const DiscordServer = mongoose.model('DiscordServer', discordServerSchema)

module.exports = DiscordServer