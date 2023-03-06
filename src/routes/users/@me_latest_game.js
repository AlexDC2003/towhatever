import {DatabaseCollections, APIErrors, getDB, errorhandler, checkCredentials} from '../../../index.js';
export default async function (fastify, opts, done) {
    fastify.get('/api/v1/users/@me/latest-match', async (req, res) => {
        const user = await checkCredentials(req, res);
        if (!user) return errorhandler({req, res, errors: [APIErrors.UnknownUser]});
        if (!user.verified.status) return errorhandler({req, res, errors: [APIErrors.VerifiedMail]});
        if (!user.matches.length)
            return res.code(200).send({
                url: null,
            });
        return res.code(200).send({
            url:
                user.matches[user.matches.length - 1]?.cancelled || user.matches[user.matches.length - 1]?.win != null
                    ? null
                    : `https://gamermatch.gg/games?id=${user.matches[user.matches.length - 1].id}`,
        });
    });
}
