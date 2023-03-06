import {checkCredentials, APIErrors, __dirname, errorhandler, getDB, DatabaseCollections, SocketEvents, WagerStates, moment} from '../../../index.js';
import {result} from '../wagers/result.js';
export default async function (fastify, opts, done) {
    fastify.patch('/admin/wagers/:id/reset', async (req, res) => {
        const user = await checkCredentials(req, res);
        if (!['admin'].some(i => i == user.role) || user.banned.status) res.redirect('https://gamermatch.gg');
        const wager = await getDB(DatabaseCollections.Wagers).findOne({id: req.params.id});
        if (!wager) return errorhandler({req, res, errors: [APIErrors.WagerUnknown]});
        if (![WagerStates.Disputed, WagerStates.Ended].some(i => i == wager.state)) return errorhandler({req, res, errors: [APIErrors.WagerNotDisputedNorEnded]});
        const clients = [];
        for (const [k, v] of [...fastify.io.sockets.sockets]) {
            const lookup = await getDB(DatabaseCollections.Authentication).findOne({uuid: v.handshake.auth.auth});
            if (
                wager.members.some(i => v.handshake.auth.user_id == i.id && v.handshake.auth.id == wager.id) ||
                (lookup && lookup.role == 'admin' && v.handshake.auth.id == wager.id)
            ) {
                if (lookup.user_id == v.handshake.auth.user_id || (lookup && (lookup.role == 'admin' || lookup.role == 'mod'))) clients.push(k);
            }
        }
        if (wager.state == WagerStates.Ended) {
            await getDB(DatabaseCollections.Wagers).updateOne(
                {id: wager.id},
                {
                    $set: {state: WagerStates.Running, winner: []},
                    $push: {
                        events: {id: user.id, date: new Date(), type: SocketEvents.WagerReset},
                    },
                }
            );
            for (let i = 0; wager.teamids.joined.length > i; i++) {
                await getDB(DatabaseCollections.Teams).updateOne(
                    {id: wager.teamids.joined[i].id},
                    {
                        $set: {'wager_state.running': true, 'wager_state.id': wager.id, 'matches.$[match].win': null, 'matches.$[match].disputed': false},
                        $inc: {'stats.win': -1, 'stats.matches': -1},
                        $push: {events: {id: wager.id, date: new Date(), type: SocketEvents.WagerReset}},
                    },
                    {arrayFilters: [{'match.id': wager.id}]}
                );
            }
            for (let i = 0; wager.members.length > i; i++) {
                const wager_team = wager.teamids.joined.find(k => k.id == wager.members[i].team);
                if (wager.members[i].team == wager.winner[0]?.id)
                    await getDB(DatabaseCollections.Users).updateOne(
                        {id: wager.members[i].id},
                        {
                            $inc: {'stats.win': -1, 'stats.matches': -1},
                            $set: {'matches.$[match].win': null, 'matches.$[match].disputed': false},
                        },
                        {arrayFilters: [{'match.id': wager.id}]}
                    );
                if (wager.members[i].team != wager.winner[0]?.id)
                    await getDB(DatabaseCollections.Users).updateOne(
                        {id: wager.members[i].id},
                        {
                            $inc: {'stats.loss': -1, 'stats.matches': -1},
                            $set: {'matches.$[match].win': null, 'matches.$[match].disputed': false},
                        },
                        {arrayFilters: [{'match.id': wager.id}]}
                    );
                if (wager.members[i].team == wager.winner[0]?.id && !wager_team.cover && wager.state == WagerStates.Ended)
                    getDB(DatabaseCollections.Users).updateOne(
                        {id: wager.members[i].id},
                        {
                            $push: {balance_update: {amount: -(wager.fee * 2 * 0.8), date: new Date(), wager: wager.id, event: SocketEvents.WagerReset}},
                            $inc: {balance: -(wager.fee * 2 * 0.8), earnings: -wager.fee},
                        }
                    );
                if (wager.members[i].team == wager.winner[0]?.id && wager_team.cover && wager_team.cover == wager.members[i].id && wager.state == WagerStates.Ended)
                    getDB(DatabaseCollections.Users).updateOne(
                        {id: wager.members[i].id},
                        {
                            $push: {balance_update: {amount: -(wager.fee * 2 * wager.size * 0.8), date: new Date(), wager: wager.id, event: SocketEvents.WagerReset}},
                            $inc: {balance: -(wager.fee * 2 * wager.size * 0.8), earnings: -wager.fee},
                        },
                        {arrayFilters: [{'match.id': wager.id}]}
                    );
            }
            getDB(DatabaseCollections.Admin).updateOne({id: 'profit'}, {$inc: {profit: -(wager.fee * 2 * wager.size * 0.2)}});
            if (clients.length)
                fastify.io.to(clients).emit(SocketEvents.WagerReset, {
                    state: WagerStates.Running,
                });
        } else {
            await getDB(DatabaseCollections.Wagers).updateOne(
                {id: wager.id},
                {
                    $set: {state: WagerStates.Running, winner: []},
                    $push: {
                        events: {id: user.id, date: new Date(), type: SocketEvents.WagerReset},
                    },
                }
            );
            if (clients.length)
                fastify.io.to(clients).emit(SocketEvents.WagerReset, {
                    state: WagerStates.Running,
                });
        }
        const readyclients = [];
        for (const [k, v] of [...fastify.io.sockets.sockets]) {
            const lookup = await getDB(DatabaseCollections.Authentication).findOne({uuid: v.handshake.auth.auth});
            if (
                wager.members.some(i => v.handshake.auth.user_id == i.id && i.ready && v.handshake.auth.id == wager.id) ||
                (lookup && lookup.role == 'admin' && v.handshake.auth.id == wager.id)
            ) {
                if (lookup.user_id == v.handshake.auth.user_id || (lookup && (lookup.role == 'admin' || lookup.role == 'mod'))) readyclients.push(k);
            }
        }
        if (readyclients.length) {
            fastify.io.to(readyclients).emit(SocketEvents.NewChat, {
                id: 'SYSTEM',
                username: 'SYSTEM',
                avatar: null,
                message: `Match was reset by ${user.username}`,
                type: 'SYSTEM',
                date: {
                    raw: new Date(),
                    formatted: moment(new Date()).format('LLLL'),
                },
            });
            await getDB(DatabaseCollections.Wagers).updateOne(
                {id: wager.id},
                {
                    $push: {
                        chat: {
                            id: 'SYSTEM',
                            username: 'SYSTEM',
                            avatar: null,
                            message: `Match was reset by ${user.username}`,
                            type: 'SYSTEM',
                            date: {
                                raw: new Date(),
                                formatted: moment(new Date()).format('LLLL'),
                            },
                        },
                    },
                }
            );
        }
        res.send({success: true});
    });
}
