import {DatabaseCollections, APIErrors, getDB, api_v1_users_verify_mail, UserChanges, errorhandler, bcrypt} from '../../../index.js';
export default async function (fastify, opts, done) {
    fastify.get('/api/v1/users/verify-mail/:code', {schema: {params: api_v1_users_verify_mail}}, async (req, res) => {
        const user = await getDB(DatabaseCollections.Users).findOne({'verified.code': req.params.code});
        if (!user) return errorhandler({req, res, errors: [APIErrors.VerifyCodeUnknown]});
        if (user.verified.status) return errorhandler({req, res, errors: [APIErrors.MailAlreadyVerified]});
        await getDB(DatabaseCollections.Users).updateOne(
            {username: user.username},
            {
                $set: {'verified.code': null, 'verified.status': true},
                $push: {
                    changes: {type: UserChanges.VerifiedUpdate, date: new Date()},
                },
            }
        );
        return res.redirect('https://gamermatch.gg');
    });
}
