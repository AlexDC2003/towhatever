import {DatabaseCollections, APIErrors, getDB, uuidv4, checkCredentials, errorhandler, SocketEvents} from '../../../index.js';
export default async function (fastify, opts, done) {
    fastify.get('/api/v1/teams/:id/cancel/:uid', async (req, res) => {
        const ruser = await checkCredentials(req, res);
        if (!ruser) return errorhandler({req, res, errors: [APIErrors.UnknownUser]});
        if (ruser.banned.status) res.redirect('https://gamermatch.gg');
        if (!ruser.verified.status) return errorhandler({req, res, errors: [APIErrors.VerifiedMail]});
        if (!ruser.teams.some(i => i.id == req.params.id)) return errorhandler({req, res, errors: [APIErrors.NotInTeam]});
        const user = await getDB(DatabaseCollections.Users).findOne({id: req.params.uid});
        if (!user) return errorhandler({req, res, errors: [APIErrors.UnknownUser]});
        if (user.banned.status) res.redirect('https://gamermatch.gg');
        if (!user.verified.status) return errorhandler({req, res, errors: [APIErrors.VerifiedMail]});
        if (user.teams.length > 10) return errorhandler({req, res, errors: [APIErrors.UserInToManyTeams]});
        if (user.teams.some(i => i.id == req.params.id)) return errorhandler({req, res, errors: [APIErrors.AlreadyInTeam]});
        if (user.id == ruser.id) return errorhandler({req, res, errors: [APIErrors.TeamSelfJoin]});
        const team = await getDB(DatabaseCollections.Teams).findOne({id: req.params.id});
        if (!team) return errorhandler({req, res, errors: [APIErrors.UnknownTeam]});
        if (team.wager_state.running) return errorhandler({req, res, errors: [APIErrors.TeamInWager]});
        await getDB(DatabaseCollections.Teams).updateOne(
            {id: req.params.id},
            {
                $push: {events: {id: user.id, date: new Date(), type: SocketEvents.TeamRejected}},
                $pull: {requests: {id: user.id}},
            }
        );
        await getDB(DatabaseCollections.Users).updateOne(
            {id: req.params.uid},
            {
                $push: {
                    notifications: {type: SocketEvents.TeamRejected, id: uuidv4(), date: new Date(), read: false, metadata: {id: team.id, name: team.name}},
                },
            }
        );
        return res.code(200).send({success: true});
    });
}
