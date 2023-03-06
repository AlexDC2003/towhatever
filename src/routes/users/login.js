import {DatabaseCollections, APIErrors, getDB, api_v1_users_login, uuidv4, errorhandler, bcrypt} from '../../../index.js';
export default async function (fastify, opts, done) {
    fastify.post('/api/v1/users/login', {body: api_v1_users_login}, async (req, res) => {
        const user = await getDB(DatabaseCollections.Users).findOne({$or: [{username: req.body.username}, {mail: req.body.username}]});
        if (!user) return errorhandler({req, res, errors: [APIErrors.UnknownUser]});
        if (user.registered_with != 'mail') return errorhandler({req, res, errors: [APIErrors.WrongLoginSource]});
        if (user.banned.status) return errorhandler({req, res, errors: [APIErrors.AdminNoPerms]});
        if (!user.verified.status) return errorhandler({req, res, errors: [APIErrors.VerifiedMail]});
        const PwCheck = await bcrypt.compare(req.body.password, user.password);
        if (!PwCheck) return errorhandler({req, res, errors: [APIErrors.PasswordIncorrect]});
        const uuid = uuidv4();
        res.header('Set-Cookie', `auth=${uuid}; Path=/`);
        getDB(DatabaseCollections.Authentication).insertOne({username: user.username, session_created: new Date(), uuid, user_id: user.id, role: user.role});
        getDB(DatabaseCollections.Users).updateOne({id: user.id}, {$push: {sessions: {date: new Date(), auth: uuid, ip: req.headers['cf-connecting-ip']}}});
        return res.code(200).send({success: true, role: user.role});
    });
}
