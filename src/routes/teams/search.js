import {DatabaseCollections, APIErrors, getDB, uuidv4, checkCredentials, errorhandler, SocketEvents, WagerStates, api_v1_wagers_join} from '../../../index.js';
import kick from './kick.js';
export default async function (fastify, opts, done) {
    fastify.get('/api/v1/teams/search', async (req, res) => {
        let teams = await getDB(DatabaseCollections.Teams).find().project({id: 1, name: 1, members: 1, requests: 1}).toArray();
        if (req.query.name) teams = teams.filter(i => i.name.toLowerCase().includes(req.query.name.toLowerCase()));
        let user = req.headers.cookie ? await checkCredentials(req, res) : null;
        teams = teams.map(i => {
            return {
                ...i,
                requests: user && i.requests.some(k => k.id == user.id) ? true : false,
                visible_only: user && i.members.some(k => k.id == user.id) ? true : false,
            };
        });
        return res.code(200).send(teams);
    });
}
