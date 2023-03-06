import {DatabaseCollections, APIErrors, getDB, uuidv4, checkCredentials, errorhandler, SocketEvents, WagerStates, api_v1_wagers_cancel} from '../../../index.js';
export default async function (fastify, opts, done) {
    fastify.post('/api/v1/wagers/:id/cancel', {schema: {body: api_v1_wagers_cancel}}, async (req, res) => {
        const user = await checkCredentials(req, res);
        if (!user) return errorhandler({req, res, errors: [APIErrors.UnknownUser]});
        if (user.banned.status) res.redirect('https://gamermatch.gg');
        if (!user.verified.status) return errorhandler({req, res, errors: [APIErrors.VerifiedMail]});
        if (!user.teams.some(i => i.id == req.body.team) && user.role != 'admin') return errorhandler({req, res, errors: [APIErrors.NotInTeam]});
        const wager = await getDB(DatabaseCollections.Wagers).findOne({id: req.params.id});
        if (!wager) return errorhandler({req, res, errors: [APIErrors.WagerUnknown]});
        if (!wager.teamids.joined.some(i => user.teams.some(k => k.id == i.id)) && user.role != 'admin')
            return errorhandler({req, res, errors: [APIErrors.NotInWagerUser]});
        if (user.role == 'admin' && wager.state != WagerStates.Cancelled) {
            cancel({wager, user: user.id, team: req.body.team, fastify});
            return res.code(200).send({success: true, cancelled: wager});
        }
        if (wager.state == WagerStates.Cancelled) return errorhandler({req, res, errors: [APIErrors.WagerCancelled]});
        if (wager.state != WagerStates.Running && wager.state != WagerStates.Waiting) return errorhandler({req, res, errors: [APIErrors.WagerNotRunning]});
        if (wager.cancelled.teams.some(k => k.id == req.body.team)) return errorhandler({req, res, errors: [APIErrors.TeamAlreadyRequestedCancel]});
        if (wager.cancelled.teams.length == 1) cancel({wager, user: user.id, team: req.body.team, fastify});
        if (!wager.cancelled.teams.length && wager.state == WagerStates.Waiting) cancel({wager, user: user.id, team: req.body.team, fastify});
        if (!wager.cancelled.teams.length && wager.state != WagerStates.Waiting)
            await getDB(DatabaseCollections.Wagers).updateOne(
                {id: wager.id},
                {
                    $push: {'cancelled.teams': {id: req.body.team, date: new Date(), user: user.id}},
                }
            );
        return res.code(200).send({success: true, cancelled: wager});
    });
}

export async function cancel({wager, user, team, fastify} = {}) {
    await getDB(DatabaseCollections.Wagers).updateOne(
        {id: wager.id},
        {
            $set: {state: WagerStates.Cancelled, 'cancelled.status': true},
            $push: {
                events: {id: user, date: new Date(), type: SocketEvents.WagerCancelled},
                'cancelled.teams': {id: team, date: new Date(), user: user},
            },
        }
    );
    for (let i = 0; wager.teamids.joined.length > i; i++) {
        await getDB(DatabaseCollections.Teams).updateOne(
            {id: wager.teamids.joined[i].id},
            {
                $set: {'wager_state.running': false, 'wager_state.id': null, 'matches.$[match].cancelled': true},
                $push: {events: {id: wager.id, date: new Date(), type: SocketEvents.WagerCancelled}},
            },
            {arrayFilters: [{'match.id': wager.id}]}
        );
    }
    for (let i = 0; wager.members.length > i; i++) {
        const wager_team = wager.teamids.joined.find(k => k.id == wager.members[i].team);
        if (wager.members[i].ready && !wager_team.cover)
            getDB(DatabaseCollections.Users).updateOne(
                {id: wager.members[i].id},
                {$inc: {balance: wager.fee}, $push: {balance_update: {amount: wager.fee, date: new Date(), wager: wager.id, event: SocketEvents.WagerCancelled}}}
            );
        if (wager_team.cover && wager_team.cover == wager.members[i].id)
            getDB(DatabaseCollections.Users).updateOne(
                {id: wager.members[i].id},
                {
                    $push: {
                        balance_update: {
                            amount: wager.fee * wager.members.filter(k => k.team == wager.members[i].team).length,
                            date: new Date(),
                            wager: wager.id,
                            event: SocketEvents.WagerCancelled,
                        },
                    },
                    $inc: {balance: wager.fee * wager.members.filter(k => k.team == wager.members[i].team).length},
                }
            );
        getDB(DatabaseCollections.Users).updateOne(
            {id: wager.members[i].id},
            {
                $set: {'matches.$[match].cancelled': true},
            },
            {arrayFilters: [{'match.id': wager.id}]}
        );
    }
    const clients = [];
    for (const [k, v] of [...fastify.io.sockets.sockets]) {
        const lookup = await getDB(DatabaseCollections.Authentication).findOne({uuid: v.handshake.auth.auth});
        if (
            wager.members.some(i => v.handshake.auth.user_id == i.id && v.handshake.auth.id == wager.id) ||
            (lookup && lookup.role == 'admin' && v.handshake.auth.id == wager.id)
        ) {
            if (lookup.user_id == v.handshake.auth.user_id || lookup.role == 'admin') clients.push(k);
        }
    }
    if (clients.length)
        fastify.io.to(clients).emit(SocketEvents.WagerCancelled, {
            state: WagerStates.Cancelled,
        });
}
