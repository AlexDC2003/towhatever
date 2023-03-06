import {DatabaseCollections, APIErrors, getDB, checkCredentials, errorhandler, SocketEvents, WagerStates, api_v1_wagers_join, moment} from '../../../index.js';
export default async function (fastify, opts, done) {
    fastify.post('/api/v1/wagers/:id/join', {schema: {body: api_v1_wagers_join}}, async (req, res) => {
        const user = await checkCredentials(req, res);
        if (!user) return errorhandler({req, res, errors: [APIErrors.UnknownUser]});
        if (user.banned.status) res.redirect('https://gamermatch.gg');
        if (!user.verified.status) return errorhandler({req, res, errors: [APIErrors.VerifiedMail]});
        if (!user.teams.some(i => i.id == req.body.team)) return errorhandler({req, res, errors: [APIErrors.NotInTeam]});
        const wager = await getDB(DatabaseCollections.Wagers).findOne({id: req.params.id});
        if (!wager) return errorhandler({req, res, errors: [APIErrors.WagerUnknown]});
        if (wager.state == WagerStates.Cancelled) return errorhandler({req, res, errors: [APIErrors.WagerCancelled]});
        if (wager.teamids.joined.length >= 2) return errorhandler({req, res, errors: [APIErrors.WagerFull]});
        if (wager.teamids.created == req.body.team) return errorhandler({req, res, errors: [APIErrors.WagerJoinSelf]});
        if (wager.members.some(i => i.id == user.id))
            if (!user.connections.some(i => i.game == wager.game)) return errorhandler({req, res, errors: [APIErrors.NoConnectionForGame]});
        const team = await getDB(DatabaseCollections.Teams).findOne({id: req.body.team});
        if (!team) return errorhandler({req, res, errors: [APIErrors.UnknownTeam]});
        if (team.wager_state.running) return errorhandler({req, res, errors: [APIErrors.TeamInWager]});
        if (wager.size != team.members.length) return errorhandler({req, res, errors: [APIErrors.WagerSizeMismatch]});
        let balance = 0;
        const banned = [];
        const connection = [];
        const balance_miss = [];
        const users = [];
        const disputed = [];
        for (let i = 0; team.members.length > i; i++) {
            if (wager.members.some(k => k.id == team.members[i].id)) return errorhandler({req, res, errors: [APIErrors.WagerUserJoinSelf]});
            const userdb = await getDB(DatabaseCollections.Users).findOne({id: team.members[i].id});
            if (!userdb) continue;
            if (userdb.banned.status) banned.push(userdb.username);
            if (!userdb.connections.some(k => k.game == wager.game)) connection.push(userdb.username);
            if (userdb.matches.some(k => k.disputed)) disputed.push(userdb.username);
            if (wager.fee > userdb.balance) balance_miss.push(userdb.username);
            balance += userdb.balance;
            users.push(userdb);
        }
        if (banned.length) return errorhandler({req, res, errors: [{...APIErrors.BannedMemberInTeam, data: banned}]});
        if (connection.length) return errorhandler({req, res, errors: [{...APIErrors.NoConnectionInTeam, data: connection}]});
        if (disputed.length) return errorhandler({req, res, errors: [{...APIErrors.UserInDisputedMatch, data: connection}]});
        if (balance_miss.length) return errorhandler({req, res, errors: [{...APIErrors.NotEnoughMoneyInTeam, data: balance_miss}]});
        if (wager.fee > balance && !req.body.cover) return errorhandler({req, res, errors: [APIErrors.TeamNotEnoughBalance]});
        if (req.body.cover) {
            if (team.members.length * wager.fee > user.balance) return errorhandler({req, res, errors: [APIErrors.NotEnoughMoneyCover]});
            getDB(DatabaseCollections.Users).updateOne(
                {id: user.id},
                {
                    $inc: {balance: -(team.members.length * wager.fee)},
                    $push: {
                        balance_update: {
                            amount: -(team.members.length * wager.fee),
                            date: new Date(),
                            wager: wager.id,
                            event: SocketEvents.WagerJoined,
                        },
                    },
                }
            );
        }
        for (let i = 0; team.members.length > i; i++) {
            getDB(DatabaseCollections.Users).updateOne(
                {id: team.members[i].id},
                {
                    $push: {
                        matches: {
                            id: wager.id,
                            size: wager.size,
                            fee: wager.fee,
                            region: wager.region,
                            platforms: wager.platforms,
                            type: wager.type,
                            win: null,
                            cancelled: wager.state == WagerStates.Cancelled ? true : false,
                            disputed: wager.state == WagerStates.Disputed ? true : false,
                        },
                    },
                }
            );
        }
        await getDB(DatabaseCollections.Wagers).updateOne(
            {id: wager.id},
            {
                $set: {timer: new Date((moment().unix() + 120) * 1000)},
                $push: {
                    'teamids.joined': {id: team.id, cover: req.body.cover ? user.id : null},
                    events: {id: team.id, date: new Date(), type: SocketEvents.WagerJoined},
                    members: {
                        $each: team.members.map(i => {
                            return {ready: false, id: i.id, team: team.id};
                        }),
                    },
                },
            }
        );
        await getDB(DatabaseCollections.Teams).updateOne(
            {id: team.id},
            {
                $set: {'wager_state.running': true, 'wager_state.id': wager.id},
                $push: {
                    events: {id: wager.id, date: new Date(), type: SocketEvents.WagerJoined},
                    matches: {
                        id: wager.id,
                        size: wager.size,
                        fee: wager.fee,
                        region: wager.region,
                        platforms: wager.platforms,
                        type: wager.type,
                        win: null,
                        cancelled: wager.state == WagerStates.Cancelled ? true : false,
                        disputed: wager.state == WagerStates.Disputed ? true : false,
                    },
                },
            }
        );
        const clients = [];
        for (const [k, v] of [...fastify.io.sockets.sockets]) {
            const lookup = await getDB(DatabaseCollections.Authentication).findOne({uuid: v.handshake.auth.auth});
            if (
                wager.members.some(i => v.handshake.auth.user_id == i.id && v.handshake.auth.id == wager.id) ||
                (lookup && lookup.role == 'admin' && v.handshake.auth.id == wager.id)
            ) {
                const wager_member = wager.members.find(i => i.id == v.handshake.auth.user_id);
                const team_members = wager_member ? wager.members.filter(i => i.team == wager_member.team) : null;
                if (lookup.user_id == v.handshake.auth.user_id || (lookup && (lookup.role == 'admin' || lookup.role == 'mod')))
                    clients.push({
                        socket: k,
                        hide:
                            (wager_member && team_members && team_members.every(i => i.ready)) || (lookup && (lookup.role == 'admin' || lookup.role == 'mod'))
                                ? false
                                : true,
                    });
            }
        }
        if (clients.length) {
            for (let i = 0; clients.length > i; i++) {
                fastify.io.to(clients[i].socket).emit(SocketEvents.WagerJoined, {
                    members: clients[i].hide
                        ? users.map(k => {
                              return {
                                  id: 'Hidden',
                                  username: 'Hidden',
                                  avatar: 'Hidden',
                                  connections: [],
                                  ready: false,
                                  team: team.id,
                                  hidden: true,
                              };
                          })
                        : users.map(k => {
                              return {
                                  id: k.id,
                                  username: k.username,
                                  avatar: k.avatar,
                                  connections: k.connections,
                                  ready: false,
                                  team: team.id,
                                  hidden: false,
                              };
                          }),
                    team: {id: team.id, name: team.name},
                    timer: new Date((moment().unix() + 120) * 1000),
                });
            }
        }
        const overview_clients = [];
        for (const [k, v] of [...fastify.io.sockets.sockets]) {
            if (v.handshake.auth.type == 'cash-matches') overview_clients.push(k);
        }
        fastify.io.to(overview_clients).emit(SocketEvents.WagerJoined, {
            id: wager.id,
        });
        return res.code(200).send({success: true, joined: wager});
    });
}
