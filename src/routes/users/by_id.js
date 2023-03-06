import {DatabaseCollections, APIErrors, getDB, errorhandler, checkCredentials} from '../../../index.js';
export default async function (fastify, opts, done) {
    fastify.get('/api/v1/users/:id', async (req, res) => {
        const user = await checkCredentials(req, res);
        if (!user) return errorhandler({req, res, errors: [APIErrors.UnknownUser]});
        if (!user.verified.status) return errorhandler({req, res, errors: [APIErrors.VerifiedMail]});
        const dbuser = await getDB(DatabaseCollections.Users).findOne({id: req.params.id});
        const teams = [];
        for (const team_array of dbuser.teams) {
            const team = await getDB(DatabaseCollections.Teams).findOne({id: team_array.id});
            if (!team) continue;
            teams.push({
                id: team_array.id,
                name: team.name,
                members: team.members.length,
            });
        }
        return res.code(200).send({
            username: dbuser.username,
            avatar: dbuser.avatar,
            role: dbuser.role,
            id: dbuser.id,
            verified: dbuser.verified.status,
            registered_with: dbuser.registered_with,
            banned: dbuser.banned.status,
            teams,
            matches: dbuser.matches,
            connections: dbuser.connections,
            stats: dbuser.stats,
            earnings: dbuser.earnings,
            balance: dbuser.balance,
        });
    });
}
