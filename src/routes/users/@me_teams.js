import {DatabaseCollections, APIErrors, getDB, errorhandler, checkCredentials} from '../../../index.js';
export default async function (fastify, opts, done) {
    fastify.get('/api/v1/users/@me/teams', async (req, res) => {
        const user = await checkCredentials(req, res);
        if (!user) return errorhandler({req, res, errors: [APIErrors.UnknownUser]});
        if (!user.verified.status) return errorhandler({req, res, errors: [APIErrors.VerifiedMail]});
        const teams = await getDB(DatabaseCollections.Teams).find({'members.id': user.id}).toArray();
        return res.code(200).send({
            user: {
                username: user.username,
                id: user.id,
            },
            teams,
        });
    });
}
