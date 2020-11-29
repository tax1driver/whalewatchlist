const { EventEmitter } =  require('events')


class Command extends EventEmitter {

    constructor(options) {
        super()

        var defaults = {
            aliases: [],
            description: "No description.",
            usage: ""
        }

        if (options.name == null) throw "name cannot be null";
        this.options = Object.assign({}, defaults, options)
    }

    invoke(parsed) {
        this.emit('invoke', parsed);
    }
}

module.exports = Command;