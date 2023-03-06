import {__dirname, getDB, DatabaseCollections} from '../../../index.js';
export default async function (fastify, opts, done) {
    fastify.get('/api/v1/public/stats', async (req, res) => {
        const players = await getDB(DatabaseCollections.Users).countDocuments();
        const matches = await getDB(DatabaseCollections.Wagers).countDocuments();
        const withdrawn = (await getDB(DatabaseCollections.Admin).findOne({id: 'amount_withdraw'})).amount;
        res.send({players, matches, withdrawn});
    });
}
