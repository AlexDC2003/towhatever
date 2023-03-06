import {DatabaseCollections, APIErrors, getDB, errorhandler, checkCredentials} from '../../../index.js';
export default async function (fastify, opts, done) {
    fastify.get('/api/v1/users/@me/matches', async (req, res) => {
        const user = await checkCredentials(req, res);
        if (!user) return errorhandler({req, res, errors: [APIErrors.UnknownUser]});
        if (!user.verified.status) return errorhandler({req, res, errors: [APIErrors.VerifiedMail]});
        const matches = await getDB(DatabaseCollections.Matches).find({usernames: username.username}).toArray();
        return res.code(200).send({
            user: {
                username: username.username,
                id: username.user_id,
            },
            matches,
        });
    });
}
