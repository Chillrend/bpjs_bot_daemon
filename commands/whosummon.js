module.exports = {
    name: 'whosummon',
    description: 'See who summons the specified nightmare in the guild',
    usage: `<nightmare name>`,
    execute(message, args, client, FBAdmin) {
        const util = require('../util/util');
        const Discord = require('discord.js');

        const string = require('../util/string.json');
        const locStr = string.en;

        const db = FBAdmin.firestore();
        const nmRef = db.collection('nightmares');

        if (args.length < 1) {
            message.channel.send(`${locStr.err_general_usage_error} ${this.usage}`);
            return;
        }

        util.getNightmaresList(args, nmRef, message).then(nightmares => {
            if(nightmares.length < 1){
                message.channel.send('No nightmares matched ' + args.join(' ') + ' found!')
                return;
            }

            let nightmare = util.getTrueNightmare(args, nightmares);

            let guildRef = db.collection('guildmates');
            let queries = guildRef.where('summonJob', '==', nightmare.name);

            queries.get().then(guildmate => {
                if(guildmate.empty){
                    message.channel.send(`None of our members are summoning ${nightmare.name}!`);
                    return;
                }

                let membersNickname = [];
                guildmate.forEach(member => {
                    membersNickname.push(client.users.cache.get(member.id));
                });

                if(membersNickname.length < 1){
                    message.channel.send(`None of our members are summoning ${nightmare.name}!`);
                    return;
                }

                message.channel.send(`**This following member(s) summons ${nightmare.name} in the colosseum:**\n${membersNickname.join(', ')}`);

            })
        })
    }
}