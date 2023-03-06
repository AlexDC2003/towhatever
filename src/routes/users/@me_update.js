import {
    DatabaseCollections,
    APIErrors,
    getDB,
    errorhandler,
    writeFileSync,
    SocketEvents,
    UserChanges,
    api_v1_users_update,
    checkCredentials,
    uuidv4,
    bcrypt,
} from '../../../index.js';
export default async function (fastify, opts, done) {
    fastify.patch('/api/v1/users/@me/update', {schema: {body: api_v1_users_update}}, async (req, res) => {
        const user = await checkCredentials(req, res);
        if (!user) return errorhandler({req, res, errors: [APIErrors.UnknownUser]});
        if (!user.verified.status) return errorhandler({req, res, errors: [APIErrors.VerifiedMail]});
        const changes = [];
        if (req.body.avatar) {
            const uuid = uuidv4();
            writeFileSync(`files/avatar/${uuid}.png`, await req.body.avatar.toBuffer());
            req.body.avatar = uuid;
            changes.push({type: UserChanges.AvatarUpdate, date: new Date()});
        }
        if (req.body.password) {
            changes.push({type: UserChanges.PasswordUpdate, date: new Date()});
            const PwHash = await bcrypt.hash(req.body.password, 10);
            req.body.password = PwHash;
        }
        if (req.body.username) changes.push({type: UserChanges.UsernameUpdate, date: new Date()});
        await getDB(DatabaseCollections.Users).updateOne(
            {id: user.id},
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
