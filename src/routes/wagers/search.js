import {DatabaseCollections, APIErrors, getDB, uuidv4, checkCredentials, errorhandler, SocketEvents, WagerStates, api_v1_wagers_join} from '../../../index.js';
export default async function (fastify, opts, done) {
    fastify.get('/api/v1/wagers/search', async (req, res) => {
        let search = {
            state: WagerStates.Waiting,
            'teamids.joined.1': {$exists: false},
        };
        if (req.query.type) search.type = req.query.type;
        if (req.query.region) search.region = req.query.region;
        if (req.query.size) search.size = Number(req.query.size);
        if (req.query.platforms) search.platforms = req.query.platforms;
        let user;
        if (req.headers.cookie) {
            user = await checkCredentials(req, res);
        }
        let wager = await getDB(DatabaseCollections.Wagers)
            .find(search)
            .project({id: 1, fee: 1, game: 1, platforms: 1, region: 1, size: 1, state: 1, type: 1, first_to: 1})
            .limit(10)
            .toArray();
        wager = wager.map(i => {
            return {
                ...i,
                visible_only:
                    user &&
                    user.matches &&
                    Array.isArray(user.matches) &&
                    user.matches.some(i => i.win == null && i.cancelled == false) &&
                    i.id == user.matches.find(i => i.win == null && i.cancelled == false).id
                        ? true
                        : false,
            };
        });
        return res.code(200).send(wager);
    });
}
