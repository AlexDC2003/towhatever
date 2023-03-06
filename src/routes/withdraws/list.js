import {DatabaseCollections, APIErrors, getDB, checkCredentials, errorhandler, bcrypt} from '../../../index.js';
export default async function (fastify, opts, done) {
    fastify.get('/api/v1/withdraws/list', async (req, res) => {
        const user = await checkCredentials(req, res);
        if (!['admin'].some(i => i == user.role) || user.banned.status) return errorhandler({req, res, errors: [APIErrors.AdminNoPerms]});
        const codes = await getDB(DatabaseCollections.Withdraws).find().toArray();
        res.send(codes);
    });
}
