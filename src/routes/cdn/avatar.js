import {existsSync, readFileSync, APIErrors, errorhandler} from '../../../index.js';
export default async function (fastify, opts, done) {
    fastify.get('/cdn/avatars/:id', async (req, res) => {
        if (existsSync(`files/avatar/${req.params.id}.png`)) return res.type('image/png').send(readFileSync(`files/avatar/${req.params.id}.png`));
        return errorhandler({req, res, errors: [APIErrors.CDNAvatarUnavailable]});
    });
}
