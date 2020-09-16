module.exports = {
    name: "editgear",
    description: "Edit or update your gear in the archive",
    usage: "`<geartype>` **(geartype: weapon or wp to edit weapon, elements or ele to edit elements, nightmare or nm to edit nightmares)**",
    localUtil: {
        evalWeap: function (dmChannel, guildmate, localString) {

            switch (guildmate.position) {
                case "Vanguard":
                    dmChannel.send(localString.message_type_weapon_type_vanguard);
                    return {
                        'sword': guildmate.weapon.sword,
                        'heavy': guildmate.weapon.heavy,
                        'projectile': guildmate.weapon.projectile,
                        'polearm': guildmate.weapon.polearm
                    }
                case "Rearguard":
                    dmChannel.send(localString.message_type_weapon_type_rearguard);
                    return {
                        'instrument': guildmate.weapon.instrument,
                        'tome': guildmate.weapon.tome,
                        'staff': guildmate.weapon.staff
                    }
            }

        },
        evalArgs: function () {

        },
        submitGear: function (guildmate, message, guildRef, collector, localString) {
            guildRef.doc(message.author.id).set(guildmate).then(success => {
                message.channel.send(localString.success_edited_gear);
                collector.stop();
            }).catch(err => {
                message.channel.send(localString.err_general_network_error);
                console.error(err);
            })
        }
    },
    execute(message, args, client, FBAdmin) {
        const _ = require('lodash');
        const util = require('../util/util');
        const string = require('../util/string.json');
        const locStr = string.en;

        const db = FBAdmin.firestore();
        const guildRef = db.collection('guildmates');

        if (args.length < 1) {
            message.channel.send("Please provide the correct arguments for the command: " + this.usage);
        }

        const query = guildRef.doc(message.author.id).get();

        var wepObject = {};

        query.then(guildmate => {
            if (!guildmate.exists) {
                message.channel.send(`${message.author} you haven't filled out the gear archive form yet, run \`;submitgear\` to submit your gear!`);
                return;
            }

            let originalGear = guildmate.data();
            let modifiedGear = guildmate.data();

            message.channel.send(`${message.author} ${locStr.message_guide_through_the_process}`);

            message.author.createDM().then(dmChannel => {
                const filter = m => m.author.id === message.author.id;
                const collector = dmChannel.createMessageCollector(filter, {time: 120000})
                var weapObject;
                if (args[0] === "weapon" || args[0] === "wp") {
                    weapObject = this.localUtil.evalWeap(dmChannel, originalGear, locStr);
                }

                collector.on('collect', m => {
                    if (args[0] === "weapon" || args[0] === "wp") {

                        let wepArray = util.stripAndSplitStrWithCommas(m.content);

                        if (wepArray.length !== Object.keys(originalGear.weapon).length) {
                            m.channel.send(`${locStr.err_invalid_weapon_count}`);
                            return;
                        }

                        Object.keys(weapObject).forEach((key, index) => {
                            weapObject[key] = isNaN(parseInt(wepArray[index])) ? weapObject[key] : parseInt(wepArray[index]);
                        });

                        Object.keys(modifiedGear.weapon).forEach((key, index) => {
                            modifiedGear.weapon[key] = weapObject[key];
                        });

                        if(!_.isEqual(originalGear, modifiedGear)){
                            this.localUtil.submitGear(modifiedGear, m, guildRef, collector, locStr);
                        }else {
                            m.channel.send(locStr.err_no_changes);
                        }
                    }
                })
            })

        });
    }
}