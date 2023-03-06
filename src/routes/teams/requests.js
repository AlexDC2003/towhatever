import {DatabaseCollections, APIErrors, getDB, uuidv4, checkCredentials, errorhandler, SocketEvents} from '../../../index.js';
export default async function (fastify, opts, done) {
    fastify.post('/api/v1/teams/:id/request/:uid', async (req, res) => {
        const user = await checkCredentials(req, res);
        if (!user) return errorhandler({req, res, errors: [APIErrors.UnknownUser]});
        if (user.banned.status) res.redirect('https://gamermatch.gg');
        if (!user.verified.status) return errorhandler({req, res, errors: [APIErrors.VerifiedMail]});
        const team = await getDB(DatabaseCollections.Teams).findOne({id: req.params.id});
        if (!team) return errorhandler({req, res, errors: [APIErrors.UnknownTeam]});
        if (team.wager_state.running) return errorhandler({req, res, errors: [APIErrors.TeamInWager]});
        if (team.members.length > 4) return errorhandler({req, res, errors: [APIErrors.TeamFull]});
        if (team.requests.some(i => (i.id = user.id))) return errorhandler({req, res, errors: [APIErrors.TeamRequestAlreadyExist]});
        const new_user = await getDB(DatabaseCollections.Users).findOne({username: req.params.uid});
        if (!new_user) return errorhandler({req, res, errors: [APIErrors.UnknownUser]});
        if (!new_user.verified.status) return errorhandler({req, res, errors: [APIErrors.VerifiedMail]});
        if (new_user.teams.length > 10) return errorhandler({req, res, errors: [APIErrors.UserInToManyTeams]});
        if (new_user.teams.some(i => i.id == req.params.id)) return errorhandler({req, res, errors: [APIErrors.AlreadyInTeam]});
        await getDB(DatabaseCollections.Teams).updateOne(
            {id: req.params.id},
            {
                $push: {
                    requests: {id: new_user.id, date: new Date(), username: new_user.username},
                    events: {id: new_user.id, date: new Date(), type: SocketEvents.TeamRequest},
                },
            }
        );
        await getDB(DatabaseCollections.Users).updateOne(
            {id: new_user.id},
            {$push: {notifications: {date: new Date(), read: false, id: uuidv4(), type: SocketEvents.TeamRequest, metadata: {id: team.id, name: team.name}}}}
        );
        return res.code(200).send({success: true});
    });
}
