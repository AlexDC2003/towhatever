import {DatabaseCollections, APIErrors, getDB, errorhandler, checkCredentials} from '../../../index.js';
export default async function (fastify, opts, done) {
    fastify.get('/api/v1/teams/:id', async (req, res) => {
        const user = await checkCredentials(req, res);
        if (!user) return errorhandler({req, res, errors: [APIErrors.UnknownUser]});
        if (!user.verified.status) return errorhandler({req, res, errors: [APIErrors.VerifiedMail]});
        const team = await getDB(DatabaseCollections.Teams).findOne({id: req.params.id});
        const membersend = [];
        for (const members of team.members) {
            const member = await getDB(DatabaseCollections.Users).findOne({id: members.id});
            if (!member) continue;
            membersend.push({
                id: members.id,
                name: member.username,
                role: members.role,
            });
        }
        return res.code(200).send({
            name: team.name,
            id: team.id,
            members: membersend,
            requests: team.requests,
            stats: team.stats,
            matches: team.matches,
        });
    });
}
