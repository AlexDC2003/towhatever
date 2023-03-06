import {
    DatabaseCollections,
    APIErrors,
    getDB,
    errorhandler,
    writeFileSync,
    SocketEvents,
    UserChanges,
    api_v1_users_reset,
    checkCredentials,
    uuidv4,
    bcrypt,
} from '../../../index.js';
export default async function (fastify, opts, done) {
    fastify.patch('/api/v1/users/@me/reset', {schema: {body: api_v1_users_reset}}, async (req, res) => {
        const lookup = await getDB(DatabaseCollections.Resets).findOne({id: req.body.id});
        if (!lookup) return errorhandler({req, res, errors: [APIErrors.UnknownUser]});
        const changes = [];
        if (req.body.password) {
            changes.push({type: UserChanges.PasswordUpdate, date: new Date()});
            const PwHash = await bcrypt.hash(req.body.password, 10);
            req.body.password = PwHash;
        }
        await getDB(DatabaseCollections.Resets).deleteOne({id: req.body.id});
        await getDB(DatabaseCollections.Users).updateOne(
            {id: lookup.userid},
            {
                $set: req.body,
                $push: {
                    notifications: {type: SocketEvents.UserUpdate, id: uuidv4(), date: new Date(), read: false},
                    changes: {$each: changes},
                },
            }
        );
        return res.code(200).send({success: true});
    });
}
