import {DatabaseCollections, APIErrors, getDB, uuidv4, checkCredentials, errorhandler, SocketEvents, WagerStates, moment} from '../../../index.js';
export default async function (fastify, opts, done) {
    fastify.get('/api/v1/wagers/:id/ready', async (req, res) => {
        const user = await checkCredentials(req, res);
        if (!user) return errorhandler({req, res, errors: [APIErrors.UnknownUser]});
        if (user.banned.status) res.redirect('https://gamermatch.gg');
        if (!user.verified.status) return errorhandler({req, res, errors: [APIErrors.VerifiedMail]});
        const wager = await getDB(DatabaseCollections.Wagers).findOne({id: req.params.id});
        if (!wager) return errorhandler({req, res, errors: [APIErrors.WagerUnknown]});
        if (wager.state == WagerStates.Cancelled) return errorhandler({req, res, errors: [APIErrors.WagerCancelled]});
        if (wager.teamids.joined.length != 2) return errorhandler({req, res, errors: [APIErrors.WagerNotActive]});
        if (!wager.members.some(i => i.id == user.id)) return errorhandler({req, res, errors: [APIErrors.NotInWagerUser]});
        if (wager.members.some(i => i.id == user.id) && wager.members.find(i => i.id == user.id).ready)
            return errorhandler({req, res, errors: [APIErrors.UserAlreadyReady]});
        const team = wager.teamids.joined.find(i => i.id == wager.members.find(k => k.id == user.id).team);
        if (wager.fee > user.balance && !team.cover) return errorhandler({req, res, errors: [APIErrors.NotEnoughMoney]});
        await getDB(DatabaseCollections.Wagers).updateOne(
            {id: wager.id},
            {$set: {'members.$[user].ready': true}, $push: {events: {id: user.id, date: new Date(), type: SocketEvents.WagerReady}}},
            {arrayFilters: [{'user.id': user.id}]}
        );
        let wager_member = wager.members.find(i => i.id == user.id);
        wager_member.ready = true;
        wager.members.find(i => i.id == user.id).ready = true;
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
        if (wager.teamids.joined.length == 2 && wager.members.filter(i => i.id != user.id).every(i => i.ready)) {
            const host = Math.floor(Math.random() * 2);
            const host_team = await getDB(DatabaseCollections.Teams).findOne({id: wager.teamids.joined[host].id});
            await getDB(DatabaseCollections.Wagers).updateOne(
                {id: wager.id},
                {
                    $set: {state: WagerStates.Running, timer: null},
                    $push: {
                        chat: {
                            id: 'SYSTEM',
                            username: 'SYSTEM',
                            avatar: null,
                            message: `${host_team.name} is the Lobby Host`,
                            type: 'SYSTEM',
                            date: {
                                raw: new Date(),
                                formatted: moment(new Date()).format('LLLL'),
                            },
                        },
                    },
                }
            );
            if (readyclients.length) {
                fastify.io.to(readyclients).emit(SocketEvents.NewChat, {
                    id: 'SYSTEM',
                    username: 'SYSTEM',
                    avatar: null,
                    message: `${host_team.name} is the Lobby Host`,
                    type: 'SYSTEM',
                    date: {
                        raw: new Date(),
                        formatted: moment(new Date()).format('LLLL'),
                    },
                });
                fastify.io.to(readyclients).emit(SocketEvents.WagerRunning, {
                    state: WagerStates.Running,
                });
            }
        }
        if (!team.cover)
            await getDB(DatabaseCollections.Users).updateOne(
                {id: user.id},
                {
                    $inc: {balance: -wager.fee},
                    $push: {
                        balance_update: {
                            amount: -wager.fee,
                            date: new Date(),
                            wager: wager.id,
                            event: SocketEvents.WagerReady,
                        },
                    },
                }
            );
        const members = [];
        if (wager.members.filter(i => i.team == wager_member.team).every(i => i.ready)) {
            const enemy_members = wager.members.filter(i => i.team != wager_member.team);
            for (let i = 0; enemy_members.length > i; i++) {
                const userdb = await getDB(DatabaseCollections.Users).findOne({id: enemy_members[i].id});
                members.push({
                    id: userdb.id,
                    username: userdb.username,
                    avatar: userdb.avatar,
                    connections: userdb.connections,
                    ready: enemy_members[i].ready,
                    team: enemy_members[i].team,
                    hidden: false,
                });
            }
            fastify.io.to(readyclients).emit(SocketEvents.WagerReady, {
                id: user.id,
                enemys: wager.teamids.joined.some(i => i.id != wager_member.team)
                    ? {
                          team: wager.teamids.joined.find(i => i.id != wager_member.team).id,
                          members,
                      }
                    : null,
            });
        } else {
            fastify.io.to(readyclients).emit(SocketEvents.WagerReady, {
                id: user.id,
                enemys: null,
            });
        }
        return res.code(200).send({success: true});
    });
}
