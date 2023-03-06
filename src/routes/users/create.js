import {DatabaseCollections, transporter, APIErrors, getDB, readFileSync, api_v1_users_create, uuidv4, errorhandler, bcrypt} from '../../../index.js';
export default async function (fastify, opts, done) {
    fastify.post('/api/v1/users/create', {schema: {body: api_v1_users_create}}, async (req, res) => {
        //checks hier sobald geklärt//
        const user = await getDB(DatabaseCollections.Users).findOne({$or: [{username: req.body.username}, {mail: req.body.mail}]});
        if (user) {
            if (user.mail == req.body.mail) return errorhandler({req, res, errors: [APIErrors.MailExist]});
            if (user.username == req.body.username) return errorhandler({req, res, errors: [APIErrors.UserExist]});
        }
        if (
            !req.body.mail.match(
                /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
            )
        )
            return errorhandler({req, res, errors: [APIErrors.InvalidMail]});
        const PwHash = await bcrypt.hash(req.body.password, 10);
        const verify_uuid = uuidv4();
        const player_uuid = uuidv4();
        await getDB(DatabaseCollections.Users).insertOne({
            username: req.body.username,
            avatar: null,
            id: player_uuid,
            password: PwHash,
            mail: req.body.mail,
            referal: req.body.referal,
            //verified: {status: false, code: verify_uuid},
            verified: {status: true, code: null},
            registered_with: 'mail',
            banned: {
                status: false,
                until: null,
            },
            role: 'user',
            balance: 0,
            teams: [],
            matches: [],
            connections: [],
            notifications: [],
            sessions: [{date: new Date(), auth: null, ip: req.headers['cf-connecting-ip']}],
            changes: [],
            notes: [],
            transactions: [],
            balance_update: [],
            withdraws: [],
            stats: {win: 0, matches: 0, loss: 0},
            earnings: 0,
        });
        if (req.body.referal)
            getDB(DatabaseCollections.Referals).updateOne({code: req.body.referal}, {$inc: {usage: 1}, $push: {used_by: {name: req.body.username, id: player_uuid}}});
        /*transporter
            .sendMail({
                from: '"Gamermatch.GG" <support@gamermatch.gg>', // sender address
                to: req.body.mail, // list of receivers
                subject: 'Verify - Gamermatch.GG', // Subject line
                html: readFileSync('files/page/gm_verify.html', {encoding: 'utf-8'}).replace(
                    'https://gamermatch.gg/signup?referal=email',
                    `https://gamermatch.gg/api/v1/users/verify-mail/${verify_uuid}`
                ),
            })
            .then(info => {
                console.log(info);
            })
            .catch(console.error);*/
        res.header('Set-Cookie', `created=true; Path=/`);
        return res.code(200).send({success: true});
    });
}
