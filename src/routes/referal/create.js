import {DatabaseCollections, APIErrors, getDB, api_v1_referals_create, checkCredentials, errorhandler, bcrypt} from '../../../index.js';
export default async function (fastify, opts, done) {
    fastify.post('/api/v1/referals/create', {schema: {body: api_v1_referals_create}}, async (req, res) => {
        const user = await checkCredentials(req, res);
        if (!['admin'].some(i => i == user.role) || user.banned.status) return errorhandler({req, res, errors: [APIErrors.AdminNoPerms]});
        if (await getDB(DatabaseCollections.Referals).findOne({code: req.body.code})) return errorhandler({req, res, errors: [APIErrors.ReferalExists]});
        getDB(DatabaseCollections.Referals).insertOne({code: req.body.code, usage: 0, used_by: []});
        res.send({success: true});
    });
}
