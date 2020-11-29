const colors = require('colors')

const log = {
    info: function(a, ...b) {
        console.log("[*]".yellow, a, ...b);
    },
    error: function(a, ...b) {
        console.log("[-]".red, a, ...b);
    },
    ok: function(a, ...b) {
        console.log("[+]".green, a, ...b);
    }
}

module.exports = log;