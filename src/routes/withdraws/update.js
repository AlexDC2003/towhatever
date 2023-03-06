import {DatabaseCollections, APIErrors, getDB, api_v1_referals_create, checkCredentials, errorhandler, bcrypt} from '../../../index.js';
export default async function (fastify, opts, done) {
    fastify.post('/api/v1/withdraws/:id/update/:val', async (req, res) => {
        const user = await checkCredentials(req, res);
        if (!['admin'].some(i => i == user.role) || user.banned.status) return errorhandler({req, res, errors: [APIErrors.AdminNoPerms]});
        getDB(DatabaseCollections.Withdraws).updateOne(
            {id: req.params.id},
            {
                $set: {
                    processed: {
                        state: req.params.val === 'true',
                        date: req.params.val === 'true' ? new Date() : null,
                        user: req.params.val === 'true' ? user.id : null,
                    },
                },
            }
        );
        res.send({success: true});
    });
}
