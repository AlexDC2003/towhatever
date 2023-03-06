import {checkCredentials, DatabaseCollections, getDB} from '../../../index.js';
export default async function (fastify, opts, done) {
    fastify.delete('/api/v1/users/logout', async (req, res) => {
        await getDB(DatabaseCollections.Authentication).deleteOne({uuid: req.headers.authorization});
        res.header('Set-Cookie', `auth=deleted; Path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`);
        return res.code(200).send({logout: true});
    });
}
