const Command = require('./command')
const parser = require('discord-command-parser')
const fs = require('fs')
const path = require('path')
const log = require('../log/log')

var command_manager = {
    commands: [], 
    prefix: '?',

    addAllCommands: function() {
        fs.promises.readdir(path.join(path.dirname(require.main.filename), "commands")).then((files) => {
            files.forEach((file, i) => {
                var cmd = require(path.resolve(path.join(path.dirname(require.main.filename), "commands"), file))
                this.addCommand(cmd)
                log.ok(`Loaded command: ${cmd.options.name} (${file})`)
            })
        })
    },

    addCommand: function(command) {
        if (!(command instanceof Command)) throw "command must be an instance of Command";

        this.commands.push(command)
    },

    invokeCommand: function(message) {
        const parsed = parser.parse(message, this.prefix);
        if (!parsed.success) return;
        

        this.commands.forEach((command, index) => {
            if (command.options.name.toLowerCase() === parsed.command.toLowerCase() 
                || command.options.aliases.indexOf(parsed.command.toLowerCase()) != -1) {
                command.invoke(parsed);
            }
        })


    },

    getCommands: function() {
        return this.commands;
    },

    setPrefix: function(prefix) {
        if (!(typeof prefix === 'string')) throw "Prefix must be a string";

        this.prefix = prefix;
    }

}

module.exports = command_manager