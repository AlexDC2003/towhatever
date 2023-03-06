import {DatabaseCollections, APIErrors, getDB, uuidv4, checkCredentials, errorhandler, SocketEvents, WagerStates, api_v1_wagers_join} from '../../../index.js';
export default async function (fastify, opts, done) {
    fastify.get('/api/v1/leaderboard', async (req, res) => {
        const data = await getDB(DatabaseCollections.Users).find().project({username: 1, id: 1, avatar: 1, earnings: 1}).sort({earnings: -1}).toArray();
        data.length = 25;
        return res.code(200).send(data);
    });
}
