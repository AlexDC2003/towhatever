import {DatabaseCollections, APIErrors, getDB, uuidv4, checkCredentials, TeamKickRoles, errorhandler, SocketEvents} from '../../../index.js';
export default async function (fastify, opts, done) {
    fastify.get('/api/v1/teams/:id/kick/:pid', async (req, res) => {
        const user = await checkCredentials(req, res);
        if (!user) return errorhandler({req, res, errors: [APIErrors.UnknownUser]});
        if (user.banned.status) res.redirect('https://gamermatch.gg');
        if (!user.verified.status) return errorhandler({req, res, errors: [APIErrors.VerifiedMail]});
        if (!user.teams.some(i => i.id == req.params.id)) return errorhandler({req, res, errors: [APIErrors.NotInTeam]});
        const team = await getDB(DatabaseCollections.Teams).findOne({id: req.params.id});
        if (!team) return errorhandler({req, res, errors: [APIErrors.UnknownTeam]});
        if (team.wager_state.running) return errorhandler({req, res, errors: [APIErrors.TeamInWager]});
        if (!TeamKickRoles.includes(team.members.find(i => i.id == user.id).role)) return errorhandler({req, res, errors: [APIErrors.NoPermsTeamKick]});
        await getDB(DatabaseCollections.Teams).updateOne(
            {id: req.params.id},
            {
                $push: {events: {id: req.params.pid, date: new Date(), type: SocketEvents.TeamKick, metadata: {admin: user.id}}},
                $pull: {members: {id: req.params.pid}},
            }
        );
        await getDB(DatabaseCollections.Users).updateOne(
            {id: req.params.pid},
            {
                $push: {
                    notifications: {type: SocketEvents.TeamKick, id: uuidv4(), date: new Date(), read: false, metadata: {id: team.id, name: team.name, admin: user.id}},
                },
                $pull: {
                    teams: {id: req.params.id},
                },
            }
        );
        return res.code(200).send({success: true});
    });
}
