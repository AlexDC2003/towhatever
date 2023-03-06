import {DatabaseCollections, APIErrors, getDB, uuidv4, checkCredentials, errorhandler, SocketEvents} from '../../../index.js';
export default async function (fastify, opts, done) {
    fastify.get('/api/v1/teams/:id/leave', async (req, res) => {
        const user = await checkCredentials(req, res);
        if (!user) return errorhandler({req, res, errors: [APIErrors.UnknownUser]});
        if (user.banned.status) res.redirect('https://gamermatch.gg');
        if (!user.verified.status) return errorhandler({req, res, errors: [APIErrors.VerifiedMail]});
        if (!user.teams.some(i => i.id == req.params.id)) return errorhandler({req, res, errors: [APIErrors.NotInTeam]});
        const team = await getDB(DatabaseCollections.Teams).findOne({id: req.params.id});
        if (!team) return errorhandler({req, res, errors: [APIErrors.UnknownTeam]});
        if (team.wager_state.running) return errorhandler({req, res, errors: [APIErrors.TeamInWager]});
        await getDB(DatabaseCollections.Teams).updateOne(
            {id: req.params.id},
            {
                $push: {events: {id: user.id, date: new Date(), type: SocketEvents.TeamLeft}},
                $pull: {members: {id: user.id}},
            }
        );
        await getDB(DatabaseCollections.Users).updateOne(
            {id: user.id},
            {
                $pull: {
                    teams: {id: req.params.id},
                },
            }
        );
        await getDB(DatabaseCollections.Users).updateOne(
            {id: team.owner},
            {
                $push: {
                    notifications: {
                        type: SocketEvents.TeamLeft,
                        id: uuidv4(),
                        date: new Date(),
                        read: false,
                        metadata: {id: user.id, name: user.username, team: team.name},
                    },
                },
            }
        );
        return res.code(200).send({success: true});
    });
}
