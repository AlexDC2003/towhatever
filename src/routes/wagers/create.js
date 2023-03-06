import {DatabaseCollections, APIErrors, getDB, uuidv4, checkCredentials, api_v1_wagers_create, errorhandler, SocketEvents, WagerStates} from '../../../index.js';
export default async function (fastify, opts, done) {
    fastify.post('/api/v1/wagers/create', {schema: {body: api_v1_wagers_create}}, async (req, res) => {
        const user = await checkCredentials(req, res);
        if (!user) return errorhandler({req, res, errors: [APIErrors.UnknownUser]});
        if (user.banned.status) res.redirect('https://gamermatch.gg');
        if (!user.verified.status) return errorhandler({req, res, errors: [APIErrors.VerifiedMail]});
        if (!user.teams.some(i => i.id == req.body.team)) return errorhandler({req, res, errors: [APIErrors.NotInTeam]});
        if (!user.connections.some(i => i.game == req.body.game)) return errorhandler({req, res, errors: [APIErrors.NoConnectionForGame]});
        //Zu klären
        const team = await getDB(DatabaseCollections.Teams).findOne({id: req.body.team});
        if (!team) return errorhandler({req, res, errors: [APIErrors.UnknownTeam]});
        if (team.wager_state.running) return errorhandler({req, res, errors: [APIErrors.TeamInWager]});
        let balance = 0;
        const banned = [];
        const connection = [];
        const disputed = [];
        for (let i = 0; team.members.length > i; i++) {
            const userdb = await getDB(DatabaseCollections.Users).findOne({id: team.members[i].id});
            if (!userdb) continue;
            if (userdb.banned.status) banned.push(userdb.username);
            if (!userdb.connections.some(k => k.game == req.body.game)) connection.push(userdb.username);
            if (userdb.matches.some(k => k.disputed)) disputed.push(userdb.username);
            balance += userdb.balance;
        }
        if (banned.length) return errorhandler({req, res, errors: [{...APIErrors.BannedMemberInTeam, data: banned}]});
        if (connection.length) return errorhandler({req, res, errors: [{...APIErrors.NoConnectionInTeam, data: connection}]});
        if (disputed.length) return errorhandler({req, res, errors: [{...APIErrors.UserInDisputedMatch, data: connection}]});
        if (req.body.fee < 0.1 || req.body.fee > 100) return errorhandler({req, res, errors: [APIErrors.EntryFeeMissmatch]});
        if (req.body.fee > balance && !req.body.cover) return errorhandler({req, res, errors: [APIErrors.TeamNotEnoughBalance]});
        if (req.body.cover) {
            if (team.members.length * req.body.fee > user.balance) return errorhandler({req, res, errors: [APIErrors.NotEnoughMoneyCover]});
            getDB(DatabaseCollections.Users).updateOne(
                {id: user.id},
                {
                    $inc: {balance: -(team.members.length * req.body.fee)},
                    $push: {balance_update: {amount: -(team.members.length * req.body.fee), date: new Date(), wager: req.params.id, event: SocketEvents.WagerCreated}},
                }
            );
        }
        const id = uuidv4();
        const wager_object = {
            id,
            teamids: {
                creator: team.id,
                joined: [{id: team.id, cover: req.body.cover ? user.id : null}],
            },
            winner: [],
            size: req.body.size,
            fee: req.body.fee,
            region: req.body.region,
            type: req.body.type,
            first_to: req.body.first_to,
            state: WagerStates.Waiting,
            chat: [],
            platforms: req.body.platforms,
            password: req.body.password,
            game: req.body.game,
            rematch: {
                requested: false,
                accepted: false,
            },
            cancelled: {
                status: false,
                teams: [],
            },
            tourney: null,
            timer: null,
            members: team.members.map(i => {
                return {ready: false, id: i.id, team: team.id};
            }),
            events: [
                {id: user.id, date: new Date(), type: SocketEvents.WagerCreated},
                {id: team.id, date: new Date(), type: SocketEvents.WagerJoined},
            ],
        };
        await getDB(DatabaseCollections.Wagers).insertOne(wager_object);
        await getDB(DatabaseCollections.Teams).updateOne(
            {id: team.id},
            {
                $set: {'wager_state.running': true, 'wager_state.id': wager_object.id},
                $push: {
                    events: {id: wager_object.id, date: new Date(), type: SocketEvents.WagerJoined},
                    matches: {
                        id: wager_object.id,
                        size: wager_object.size,
                        fee: wager_object.fee,
                        region: wager_object.region,
                        platforms: wager_object.platforms,
                        type: wager_object.type,
                        win: null,
                        cancelled: wager_object.state == WagerStates.Cancelled ? true : false,
                        disputed: wager_object.state == WagerStates.Disputed ? true : false,
                    },
                },
            }
        );
        for (let i = 0; team.members.length > i; i++) {
            getDB(DatabaseCollections.Users).updateOne(
                {id: team.members[i].id},
                {
                    $push: {
                        matches: {
                            id: wager_object.id,
                            size: wager_object.size,
                            fee: wager_object.fee,
                            region: wager_object.region,
                            platforms: wager_object.platforms,
                            type: wager_object.type,
                            win: null,
                            cancelled: wager_object.state == WagerStates.Cancelled ? true : false,
                            disputed: wager_object.state == WagerStates.Disputed ? true : false,
                        },
                    },
                }
            );
        }
        const clients = [];
        for (const [k, v] of [...fastify.io.sockets.sockets]) {
            if (v.handshake.auth.type == 'cash-matches') clients.push(k);
        }
        if (clients.length)
            fastify.io.to(clients).emit(SocketEvents.WagerCreated, {
                id: wager_object.id,
                size: wager_object.size,
                fee: wager_object.fee,
                region: wager_object.region,
                platforms: wager_object.platforms,
                type: wager_object.type,
                first_to: wager_object.first_to,
            });
        return res.code(200).send({success: true, created: wager_object});
    });
}
