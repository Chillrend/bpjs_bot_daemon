module.exports = {
    name: "editgear",
    description: "Edit or update your gear in the archive",
    usage: "`<geartype>` **(geartype: `weapon` or `wp` to edit weapon, `elements` or `ele` to edit elements, `nightmare` or `nm` to edit nightmares, `summon` to edit your summon job)**",
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
            return;
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
                }else if(args[0] === "element" || args[0] === "ele"){
                    dmChannel.send(locStr.message_type_ele);
                }else if(args[0] === "nightmare" || args[0] === "nm"){
                    dmChannel.send(locStr.message_type_nm);
                }else if(args[0] === "summon"){
                    dmChannel.send(locStr.message_type_summon_job);
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
                    else if(args[0] === "element" || args[0] === "ele"){
                        let eleArr = util.stripAndSplitStrWithCommas(m.content);
                        let eleObj = {fire: originalGear.element.fire, water: originalGear.element.water, wind: originalGear.element.wind};


                        if(eleArr.length !== Object.keys(eleObj).length){
                            m.channel.send(`${locStr.err_invalid_ele_count}`);
                            return;
                        }

                        Object.keys(eleObj).forEach((key, index) => {
                            eleObj[key] = isNaN(parseInt(eleArr[index])) ? eleObj[key] : parseInt(eleArr[index]);
                            modifiedGear.element[key] = eleObj[key];
                        })

                        if(!_.isEqual(originalGear, modifiedGear)){
                            this.localUtil.submitGear(modifiedGear, m, guildRef, collector, locStr);
                        }else {
                            m.channel.send(locStr.err_no_changes);
                        }
                    }
                    else if(args[0] === "nightmare" || args[0] === "nm"){
                        let nmArray = util.stripAndSplitStrWithCommas(m.content);

                        if(nmArray.length < 1){
                            m.channel.send(`${locStr.err_invalid_nm_count}`);
                            return;
                        }

                        let nmRef = db.collection('nightmares');
                        let result = util.getNightmare(nmRef, nmArray, m);

                        Promise.all(result).then(nm => {
                            let validNightmares= [];
                            nm.map(nightmare => {
                                if(typeof nightmare != 'undefined') {
                                    validNightmares.push(nightmare.name);
                                }
                            })

                            if(validNightmares.length < 1){
                                m.channel.send('No nightmare(s) found based on your search query, please try again');
                                return;
                            }

                            modifiedGear.nightmares = validNightmares;
                            m.channel.send(`We found ${validNightmares.join(' - ')}`);

                            if(!_.isEqual(originalGear, modifiedGear)){
                                this.localUtil.submitGear(modifiedGear, m, guildRef, collector, locStr);
                            }else {
                                m.channel.send(locStr.err_no_changes);
                            }
                        });
                    }
                    else if(args[0] === "summon"){
                        let nightmare = util.findNeedle(m.content.trim(), originalGear.nightmares);

                        if(nightmare.length < 1){
                            m.channel.send(`There is no nightmare matching ${m.content} in your nightmare list, please try again`);
                            return;
                        }

                        modifiedGear.summonJob = nightmare[0];
                        m.channel.send(`You are summoning ${modifiedGear.summonJob} in the colosseum, please remember your nightmare name and don't be late!`);

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