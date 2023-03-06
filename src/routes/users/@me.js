import {DatabaseCollections, APIErrors, getDB, errorhandler, checkCredentials} from '../../../index.js';
export default async function (fastify, opts, done) {
    fastify.get('/api/v1/users/@me', async (req, res) => {
        const user = await checkCredentials(req, res);
        if (!user) return errorhandler({req, res, errors: [APIErrors.UnknownUser]});
        if (!user.verified.status) return errorhandler({req, res, errors: [APIErrors.VerifiedMail]});
        const teams = [];
        for (const team_array of user.teams) {
            const team = await getDB(DatabaseCollections.Teams).findOne({id: team_array.id});
            if (!team) return;
            teams.push({
                id: team_array.id,
                name: team.name,
                members: team.members.length,
            });
        }
        return res.code(200).send({
            username: user.username,
            avatar: user.avatar,
            role: user.role,
            id: user.id,
            verified: user.verified.status,
            registered_with: user.registered_with,
            banned: user.banned.status,
            teams,
            matches: user.matches,
            connections: user.connections,
            stats: user.stats,
            earnings: user.earnings,
            balance: user.balance,
        });
    });
}
