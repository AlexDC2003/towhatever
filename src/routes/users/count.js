import {DatabaseCollections, getDB} from '../../../index.js';
export default async function (fastify, opts, done) {
    fastify.get('/api/v1/users/count', async (req, res) => {
        res.type('text/plain');
        return res.send(String(await getDB(DatabaseCollections.Users).countDocuments()));
    });
}
