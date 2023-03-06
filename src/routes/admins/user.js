import {checkCredentials, APIErrors, __dirname, errorhandler, getDB, DatabaseCollections} from '../../../index.js';
export default async function (fastify, opts, done) {
    fastify.get('/admin/users/:name', async (req, res) => {
        const user = await checkCredentials(req, res);
        if (!['admin'].some(i => i == user.role) || user.banned.status) res.redirect('https://gamermatch.gg');
        const requested_user = await getDB(DatabaseCollections.Users).findOne({username: req.params.name});
        if (!requested_user) return errorhandler({req, res, errors: [APIErrors.UnknownUser]});
        res.send(requested_user);
    });
}
