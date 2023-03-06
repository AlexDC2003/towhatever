import {DatabaseCollections, APIErrors, getDB, errorhandler, checkCredentials} from '../../../index.js';
export default async function (fastify, opts, done) {
    fastify.post('/api/v1/users/@me/notifications/read/:id', async (req, res) => {
        const user = await checkCredentials(req, res);
        if (!user) return errorhandler({req, res, errors: [APIErrors.UnknownUser]});
        if (!user.verified.status) return errorhandler({req, res, errors: [APIErrors.VerifiedMail]});
        if (req.params.id != 'undefined')
            await getDB(DatabaseCollections.Users).updateOne(
                {id: user.id},
                {
                    $set: {'notifications.$[noti].read': true},
                },
                {arrayFilters: [{'noti.id': req.params.id}]}
            );
        return res.code(200).send({
            success: true,
        });
    });
}
