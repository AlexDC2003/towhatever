import {DatabaseCollections, APIErrors, getDB, uuidv4, checkCredentials, errorhandler, SocketEvents} from '../../../index.js';
export default async function (fastify, opts, done) {
    fastify.post('/api/v1/teams/:id/join', async (req, res) => {
        const ruser = await checkCredentials(req, res);
        if (!ruser) return errorhandler({req, res, errors: [APIErrors.UnknownUser]});
        if (ruser.banned.status) res.redirect('https://gamermatch.gg');
        if (!ruser.verified.status) return errorhandler({req, res, errors: [APIErrors.VerifiedMail]});
        const team = await getDB(DatabaseCollections.Teams).findOne({id: req.params.id});
        if (!team) return errorhandler({req, res, errors: [APIErrors.UnknownTeam]});
        if (team.wager_state.running) return errorhandler({req, res, errors: [APIErrors.TeamInWager]});
        if (team.members.length > 4) return errorhandler({req, res, errors: [APIErrors.TeamFull]});
        if (!team.requests.some(i => i.id == ruser.id)) return errorhandler({req, res, errors: [APIErrors.NoInviteForThisTeam]});
        await getDB(DatabaseCollections.Teams).updateOne(
            {id: req.params.id},
            {
                $push: {members: {id: ruser.id, joined_at: new Date(), role: 'member'}, events: {id: ruser.id, date: new Date(), type: SocketEvents.TeamJoined}},
                $pull: {requests: {id: ruser.id}},
            }
        );
        await getDB(DatabaseCollections.Users).updateOne(
            {id: ruser.id},
            {
                $push: {
                    teams: {id: req.params.id, joined_at: new Date(), role: 'member'},
                    notifications: {type: SocketEvents.TeamJoined, id: uuidv4(), date: new Date(), read: false, metadata: {id: team.id, name: team.name}},
                },
            }
        );
        return res.code(200).send({success: true});
    });
}
