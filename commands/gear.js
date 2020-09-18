module.exports = {
    name: 'gear',
    description: 'List all member\'s gear summary, or someone\'s gear summary',
    usage: 'No arguments, or `@mentions` someone to get his/her gear summary',
    execute(message, args, client, FBAdmin){
        const Discord = require('discord.js');
        const util = require('../util/util');
        const string = require('../util/string.json');
        const locStr = string.en;

        const db = FBAdmin.firestore();
        const gearRef = db.collection('guildmates');

        var weaponObject = {
            sword: {
                amount: 0,
                emojiId: '753833365118910494',
            },
            heavy: {
                amount: 0,
                emojiId: '753811624011366460',
            },
            projectile: {
                amount: 0,
                emojiId: '753833334852812903',
            },
            polearm: {
                amount: 0,
                emojiId: '753833319254196305',
            },
            instrument: {
                amount: 0,
                emojiId: '753833301399306280',
            },
            tome: {
                amount: 0,
                emojiId: '753833378478030848',
            },
            staff: {
                amount: 0,
                emojiId: '753833351080575037',
            }
        };
        var elements = {
            fire: 0,
            water: 0,
            wind: 0
        };

        if(args.length > 0){
            let users = util.getMention(args[0], client);
            if(!users){
                message.channel.send(`${locStr.err_general_usage_error} ${this.usage}`)
                return;
            }
            gearRef.doc(users.id).get().then(guildmate => {
                if(!guildmate.exists){
                    message.channel.send(locStr.err_no_members);
                    return;
                }

                let gear = guildmate.data();

                let job = util.getJobFromWeapon(client, gear.weapon);

                let weaponString = '';
                Object.keys(gear.weapon).forEach((key, index) => {
                    weaponString += ` ${client.emojis.cache.get(weaponObject[key].emojiId)} ${gear.weapon[key]} `
                });

                let elementString= '';
                Object.keys(elements).forEach((key, index) => {
                    elements[key] = gear.element[key];
                    elementString += ` ${util.evalAttribute(key, client)} ${elements[key]} `;
                });

                //Start building embeds
                let dsEmbeds = new Discord.MessageEmbed();
                dsEmbeds.setTitle(`Member\u2000 ${client.emojis.cache.get(job.emojiId)}  ${users.username} Gear summary`);
                dsEmbeds.setDescription(`${users.username}, Tempest's ${job.job}`);
                dsEmbeds.setColor(7506394);

                dsEmbeds.addField('Weapons', weaponString);
                dsEmbeds.addField('Elements', elementString);
                dsEmbeds.addField('Owned important nightmares', gear.nightmares.join('\n'));
                dsEmbeds.addField('Summon Job', gear.summonJob ? gear.summonJob : 'None');

                message.channel.send(dsEmbeds);
            })
        }else{
            gearRef.get().then(gearSnapshot => {

                if(gearSnapshot.empty){
                    message.channel.send("No members found");
                }

                let globalMember = [];
                let memberPromises = [];
                let nightmares = {};

                gearSnapshot.forEach(gear => {
                    let gearData = gear.data();

                    let members = {};
                    members.job = util.getJobFromWeapon(client, gearData.weapon);
                    members.id = gear.id;

                    globalMember.push(members);
                    memberPromises.push(client.users.fetch(gear.id));

                    Object.keys(gearData.element).forEach((key, index) => {
                        elements[key] += gearData.element[key];
                    })

                    Object.keys(gearData.weapon).forEach((key, index) => {
                        weaponObject[key].amount += gearData.weapon[key];
                    })

                    for (let i = 0; i < gearData.nightmares.length; i++) {
                        if(nightmares.hasOwnProperty(gearData.nightmares[i])){
                            nightmares[gearData.nightmares[i]].total += 1;
                        }else{
                            nightmares[gearData.nightmares[i]] = {
                                total: 1,
                            }
                        }
                    }

                    if(gearData.hasOwnProperty('summonJob')){
                        nightmares[gearData.summonJob].summonJob = gear.id;
                    }
                });

                Promise.all(memberPromises).then(members => {
                    let membersObj = {};

                    members.forEach(member => {
                        membersObj[member.id] = member.username;
                    })

                    globalMember = globalMember.sort((a, b) => a.job.priority > b.job.priority ? 1 : -1);

                    let memberString = "";
                    for (let i = 0; i < globalMember.length; i++) {
                        let guildmate = globalMember[i];
                        memberString += `${client.emojis.cache.get(guildmate.job.emojiId)} ${membersObj[guildmate.id]} \n`
                    }

                    let weapString = "";
                    Object.keys(weaponObject).forEach((key, index) => {
                        weapString += `${client.emojis.cache.get(weaponObject[key].emojiId)} ${weaponObject[key].amount} `
                        if(index === 3) weapString += '\n';
                    });

                    let elementString = "";
                    Object.keys(elements).forEach((key, index) => {
                        elementString += `${util.evalAttribute(key, client)} ${elements[key]} `;
                    });

                    let nightmareString = "";
                    Object.keys(nightmares).forEach((key, index) => {
                        nightmareString += `${key} (${nightmares[key].total}) `;
                        if(nightmares[key].hasOwnProperty('summonJob')) nightmareString += `(${membersObj[nightmares[key].summonJob]})`;
                        nightmareString += '\n';
                    })

                    //Start building embeds
                    let dsEmbeds = new Discord.MessageEmbed();
                    dsEmbeds.setTitle('Tempest - Guild member gear summary');
                    dsEmbeds.setDescription('The following are all of the member\'s gear summary');
                    dsEmbeds.setColor(7506394);

                    dsEmbeds.addField('Members', memberString);
                    dsEmbeds.addField('Weapons', weapString);
                    dsEmbeds.addField('Elements', elementString);
                    dsEmbeds.addField('Nightmares', nightmareString);

                    message.channel.send(dsEmbeds);


                }).catch(err => console.error(err));

            }).catch(err => console.error(err))
        }

    }
}