import {existsSync, readFileSync, APIErrors, errorhandler} from '../../../index.js';
export default async function (fastify, opts, done) {
    fastify.get('/cdn/page/:file', async (req, res) => {
        if (existsSync(`files/page/${req.params.file}`)) {
            if (req.params.file.includes('.png')) return res.type('image/png').send(readFileSync(`files/page/${req.params.file}`));
            if (req.params.file.includes('.css')) return res.type('text/css').send(readFileSync(`files/page/${req.params.file}`));
        }
        return errorhandler({req, res, errors: [APIErrors.CDNUnavailable]});
    });
}
