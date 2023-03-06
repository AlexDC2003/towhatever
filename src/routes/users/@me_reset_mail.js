import {DatabaseCollections, APIErrors, getDB, errorhandler, api_v1_users_reset_mail, uuidv4, transporter, readFileSync} from '../../../index.js';
export default async function (fastify, opts, done) {
    fastify.post('/api/v1/users/@me/reset-mail', {schema: {body: api_v1_users_reset_mail}}, async (req, res) => {
        if (
            !req.body.mail.match(
                /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
            )
        )
            return errorhandler({req, res, errors: [APIErrors.InvalidMail]});
        const lookup = await getDB(DatabaseCollections.Users).findOne({mail: req.body.mail});
        if (!lookup) return errorhandler({req, res, errors: [APIErrors.UnknownUser]});
        const id = uuidv4();
        await getDB(DatabaseCollections.Resets).updateOne(
            {mail: req.body.mail},
            {
                $set: {
                    date: new Date(),
                    userid: lookup.id,
                    id,
                },
            },
            {upsert: true}
        );
        transporter
            .sendMail({
                from: '"Gamermatch.GG" <support@gamermatch.gg>', // sender address
                to: req.body.mail, // list of receivers
                subject: 'Password Reset - Gamermatch.GG', // Subject line
                html: readFileSync('files/page/gm_reset.html', {encoding: 'utf-8'}).replace(
                    'https://gamermatch.gg/signup?referal=email',
                    `https://gamermatch.gg/reset-pw?id=${id}`
                ),
            })
            .then(info => {
                console.log(info);
            })
            .catch(console.error);
        return res.code(200).send({success: true});
    });
}
