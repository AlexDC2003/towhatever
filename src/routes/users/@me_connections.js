import {DatabaseCollections, APIErrors, getDB, errorhandler, checkCredentials, api_v1_users_connection, UserChanges} from '../../../index.js';
export default async function (fastify, opts, done) {
    fastify.get('/api/v1/users/@me/connections', async (req, res) => {
        const user = await checkCredentials(req, res);
        if (!user) return errorhandler({req, res, errors: [APIErrors.UnknownUser]});
        if (!user.verified.status) return errorhandler({req, res, errors: [APIErrors.VerifiedMail]});
        return res.code(200).send(user.connections);
    });
    fastify.post('/api/v1/users/@me/connections', {schema: {body: api_v1_users_connection}}, async (req, res) => {
        const user = await checkCredentials(req, res);
        if (!user) return errorhandler({req, res, errors: [APIErrors.UnknownUser]});
        if (!user.verified.status) return errorhandler({req, res, errors: [APIErrors.VerifiedMail]});
        if (user.connections.some(i => i.game == req.body.game))
            await getDB(DatabaseCollections.Users).updateOne(
                {id: user.id},
                {$set: {'connections.$[conn].id': req.body.id}, $push: {changes: {type: UserChanges.ConnectionUpdate, date: new Date(), metadata: req.body}}},
                {arrayFilters: [{'conn.game': req.body.game}]}
            );
        else
            await getDB(DatabaseCollections.Users).updateOne(
                {id: user.id},
                {$push: {connections: req.body, changes: {type: UserChanges.ConnectionUpdate, date: new Date(), metadata: req.body}}}
            );
        return res.code(200).send({success: true});
    });
}
