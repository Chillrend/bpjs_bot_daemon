const { settings } = require("cluster");
const fs = require("fs");
const bot_config = require('../bot.config.json');
const prefix = bot_config.bot_config.prefix;
let streng = [];
fs.readdir("./commands/", (err, files) => {
    if(err) console.error(err);

    let jsfiles = files.filter(f => f.split(".").pop() === "js");
    if(jsfiles.length <= 0) {
        console.log("No commands to load!");
        return;
    }

  
    let result = jsfiles.forEach((f, i) => {
        let props = require(`./${f}`);
        let filesArray = {name: prefix+' '+props.name, value: props.description};
        streng.push(filesArray);
        
    });
 

});
module.exports = {
    name: 'help',
    description: 'Get information about kurebot commands',
    execute(message, args, client) {
        const Discord = require('discord.js');
        const emsg = new Discord.MessageEmbed()
            .setColor('#0099ff')
            .setTitle('Kurebot Command list')
            .addFields(streng)
        
        message.channel.send(emsg);

    }
}