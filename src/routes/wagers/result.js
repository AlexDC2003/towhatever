import {
    DatabaseCollections,
    APIErrors,
    getDB,
    ComponentType,
    ButtonStyle,
    checkCredentials,
    webhookClient,
    errorhandler,
    SocketEvents,
    WagerStates,
    moment,
    api_v1_wagers_result,
} from '../../../index.js';
export default async function (fastify, opts, done) {
    fastify.post('/api/v1/wagers/:id/results', {schema: {body: api_v1_wagers_result}}, async (req, res) => {
        const user = await checkCredentials(req, res);
        if (!user) return errorhandler({req, res, errors: [APIErrors.UnknownUser]});
        if (user.banned.status) res.redirect('https://gamermatch.gg');
        if (!user.verified.status) return errorhandler({req, res, errors: [APIErrors.VerifiedMail]});
        const wager = await getDB(DatabaseCollections.Wagers).findOne({id: req.params.id});
        if (!wager) return errorhandler({req, res, errors: [APIErrors.WagerUnknown]});
        if (wager.state != WagerStates.Running) return errorhandler({req, res, errors: [APIErrors.WagerCancelled]});
        if (wager.state == WagerStates.Disputed) return errorhandler({req, res, errors: [APIErrors.WagerDisputed]});
        if (!wager.members.some(i => i.id == user.id)) return errorhandler({req, res, errors: [APIErrors.NotInWagerUser]});
        const team = await getDB(DatabaseCollections.Teams).findOne({id: req.body.winner});
        if (!team) return errorhandler({req, res, errors: [APIErrors.UnknownTeam]});
        result({wager, fastify, winner: req.body.winner, user, req, res});
        return res.code(200).send({success: true});
    });
}

export async function result({wager, fastify, winner, user, req, res} = {}) {
    const clients = [];
    const readyclients = [];
    for (const [k, v] of [...fastify.io.sockets.sockets]) {
        const lookup = await getDB(DatabaseCollections.Authentication).findOne({uuid: v.handshake.auth.auth});
        if (
            wager.members.some(i => v.handshake.auth.user_id == i.id && v.handshake.auth.id == wager.id) ||
            (lookup && lookup.role == 'admin' && v.handshake.auth.id == wager.id)
        ) {
            if (lookup.user_id == v.handshake.auth.user_id || (lookup && (lookup.role == 'admin' || lookup.role == 'mod'))) clients.push(k);
        }
        if (
            wager.members.some(i => v.handshake.auth.user_id == i.id && i.ready && v.handshake.auth.id == wager.id) ||
            (lookup && lookup.role == 'admin' && v.handshake.auth.id == wager.id)
        ) {
            if (lookup.user_id == v.handshake.auth.user_id || (lookup && (lookup.role == 'admin' || lookup.role == 'mod'))) readyclients.push(k);
        }
    }
    if (!wager.winner.length) {
        await getDB(DatabaseCollections.Wagers).updateOne(
            {id: wager.id},
            {
                $set: {timer: new Date((moment().unix() + 600) * 1000)},
                $push: {winner: {id: winner, date: new Date()}},
            }
        );
        if (clients.length)
            fastify.io.to(clients).emit(SocketEvents.WagerTimer, {
                timer: new Date((moment().unix() + 600) * 1000),
            });
        if (readyclients.length) {
            const team = await getDB(DatabaseCollections.Teams).findOne({id: winner});
            await getDB(DatabaseCollections.Wagers).updateOne(
                {id: wager.id},
                {
                    $push: {
                        chat: {
                            id: 'SYSTEM',
                            username: 'SYSTEM',
                            avatar: null,
                            message: `${team.name} marked match as won, timer started`,
                            type: 'SYSTEM',
                            date: {
                                raw: new Date(),
                                formatted: moment(new Date()).format('LLLL'),
                            },
                        },
                    },
                }
            );
            fastify.io.to(readyclients).emit(SocketEvents.NewChat, {
                id: 'SYSTEM',
                username: 'SYSTEM',
                avatar: null,
                message: `${team.name} marked match as won, timer started`,
                type: 'SYSTEM',
                date: {
                    raw: new Date(),
                    formatted: moment(new Date()).format('LLLL'),
                },
            });
        }
    }
    if (wager.winner.length == 1 || user.role == 'admin') {
        if (wager.winner.length && wager.winner[0].id != winner && user.role != 'admin') {
            await getDB(DatabaseCollections.Wagers).updateOne(
                {id: wager.id},
                {
                    $set: {state: WagerStates.Disputed, timer: null},
                    $push: {
                        winner: {id: winner, date: new Date()},
                        events: {id: user.id, date: new Date(), type: SocketEvents.WagerDisputed},
                    },
                }
            );
            for (let i = 0; wager.members.length > i; i++) {
                await getDB(DatabaseCollections.Users).updateOne(
                    {id: wager.members[i].id},
                    {
                        $set: {'matches.$[match].disputed': true},
                    },
                    {arrayFilters: [{'match.id': wager.id}]}
                );
            }
            if (clients.length)
                fastify.io.to(clients).emit(SocketEvents.WagerDisputed, {
                    state: WagerStates.Disputed,
                });
            webhookClient.send({
                embeds: [{title: 'New Disputed Match', color: 0xff4654, fields: [{name: 'URL', value: `https://gamermatch.gg/games?id=${wager.id}`}]}],
                components: [
                    {
                        type: ComponentType.ActionRow,
                        components: [{type: ComponentType.Button, style: ButtonStyle.Link, label: 'Link to Match', url: `https://gamermatch.gg/games?id=${wager.id}`}],
                    },
                ],
            });
            if (req) return errorhandler({req, res, errors: [APIErrors.Disputed]});
            return;
        }
        await getDB(DatabaseCollections.Wagers).updateOne(
            {id: wager.id},
            {
                $set: {state: WagerStates.Ended, timer: null},
                $push: {
                    winner: {id: winner, date: new Date()},
                    events: {id: user.id, date: new Date(), type: SocketEvents.WagerEnded},
                },
            }
        );
        for (let i = 0; wager.teamids.joined.length > i; i++) {
            if (wager.teamids.joined[i].id == winner)
                await getDB(DatabaseCollections.Teams).updateOne(
                    {id: wager.teamids.joined[i].id},
                    {
                        $set: {'wager_state.running': false, 'wager_state.id': null, 'matches.$[match].win': true, 'matches.$[match].disputed': false},
                        $inc: {'stats.win': 1, 'stats.matches': 1},
                        $push: {events: {id: wager.id, date: new Date(), type: SocketEvents.WagerEnded}},
                    },
                    {arrayFilters: [{'match.id': wager.id}]}
                );
            else
                await getDB(DatabaseCollections.Teams).updateOne(
                    {id: wager.teamids.joined[i].id},
                    {
                        $set: {'wager_state.running': false, 'wager_state.id': null, 'matches.$[match].win': false, 'matches.$[match].disputed': false},
                        $inc: {'stats.loss': 1, 'stats.matches': 1},
                        $push: {events: {id: wager.id, date: new Date(), type: SocketEvents.WagerEnded}},
                    },
                    {arrayFilters: [{'match.id': wager.id}]}
                );
        }
        for (let i = 0; wager.members.length > i; i++) {
            const wager_team = wager.teamids.joined.find(k => k.id == wager.members[i].team);
            if (wager.members[i].team == winner)
                await getDB(DatabaseCollections.Users).updateOne(
                    {id: wager.members[i].id},
                    {
                        $inc: {'stats.win': 1, 'stats.matches': 1},
                        $set: {'matches.$[match].win': true, 'matches.$[match].disputed': false},
                    },
                    {arrayFilters: [{'match.id': wager.id}]}
                );
            if (wager.members[i].team != winner)
                await getDB(DatabaseCollections.Users).updateOne(
                    {id: wager.members[i].id},
                    {
                        $inc: {'stats.loss': 1, 'stats.matches': 1},
                        $set: {'matches.$[match].win': false, 'matches.$[match].disputed': false},
                    },
                    {arrayFilters: [{'match.id': wager.id}]}
                );
            if (wager.members[i].team == winner && !wager_team.cover)
                getDB(DatabaseCollections.Users).updateOne(
                    {id: wager.members[i].id},
                    {
                        $push: {balance_update: {amount: wager.fee + wager.fee * 0.6, date: new Date(), wager: wager.id, event: SocketEvents.WagerEnded}},
                        $inc: {balance: wager.fee + wager.fee * 0.6, earnings: wager.fee * 0.6},
                    }
                );
            if (wager.members[i].team == winner && wager_team.cover && wager_team.cover == wager.members[i].id)
                getDB(DatabaseCollections.Users).updateOne(
                    {id: wager.members[i].id},
                    {
                        $push: {balance_update: {amount: wager.fee * wager.size * wager.size * 0.6, date: new Date(), wager: wager.id, event: SocketEvents.WagerEnded}},
                        $inc: {balance: wager.fee * wager.size * wager.size * 0.6, earnings: wager.fee},
                    },
                    {arrayFilters: [{'match.id': wager.id}]}
                );
        }
        getDB(DatabaseCollections.Admin).updateOne({id: 'profit'}, {$inc: {profit: wager.fee * 2 * wager.size * 0.2}});
        if (clients.length)
            fastify.io.to(clients).emit(SocketEvents.WagerEnded, {
                state: WagerStates.Ended,
                winner: winner,
            });
        if (readyclients.length) {
            const team = await getDB(DatabaseCollections.Teams).findOne({id: winner});
            await getDB(DatabaseCollections.Wagers).updateOne(
                {id: wager.id},
                {
                    $push: {
                        chat: {
                            id: 'SYSTEM',
                            username: 'SYSTEM',
                            avatar: null,
                            message: `${team.name} won`,
                            type: 'SYSTEM',
                            date: {
                                raw: new Date(),
                                formatted: moment(new Date()).format('LLLL'),
                            },
                        },
                    },
                }
            );
            fastify.io.to(readyclients).emit(SocketEvents.NewChat, {
                id: 'SYSTEM',
                username: 'SYSTEM',
                avatar: null,
                message: `${team.name} won`,
                type: 'SYSTEM',
                date: {
                    raw: new Date(),
                    formatted: moment(new Date()).format('LLLL'),
                },
            });
        }
    }
}
