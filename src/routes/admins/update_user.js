import {
    writeFileSync,
    uuidv4,
    APIErrors,
    __dirname,
    api_v1_admin_user_update,
    bcrypt,
    UserChanges,
    getDB,
    DatabaseCollections,
    checkCredentials,
    errorhandler,
} from '../../../index.js';
export default async function (fastify, opts, done) {
    fastify.patch('/admin/users/:id/update', {schema: {body: api_v1_admin_user_update}}, async (req, res) => {
        const user = await checkCredentials(req, res);
        if (!user) return errorhandler({req, res, errors: [APIErrors.UnknownUser]});
        if (!user.verified.status) return errorhandler({req, res, errors: [APIErrors.VerifiedMail]});
        if (!['admin'].some(i => i == user.role) || user.banned.status) return errorhandler({req, res, errors: [APIErrors.AdminNoPerms]});
        let update_json = {
            changes: [...user.changes],
        };
        if (req.body.banned) {
            update_json.banned = req.body.banned;
            update_json.changes.push({type: UserChanges.BanUpdate, date: new Date()});
        }
        if (req.body.verified) {
            update_json.verified = req.body.verified;
            update_json.changes.push({type: UserChanges.VerifiedUpdate, date: new Date()});
        }
        if (req.body.role) {
            update_json.role = req.body.role;
            update_json.changes.push({type: UserChanges.RoleUpdate, date: new Date()});
        }
        if (req.body.mail) {
            update_json.mail = req.body.mail;
            update_json.changes.push({type: UserChanges.MailUpdate, date: new Date()});
        }
        if (req.body.password) {
            const PwHash = await bcrypt.hash(req.body.password, 10);
            update_json.password = PwHash;
            update_json.changes.push({type: UserChanges.PasswordUpdate, date: new Date()});
        }
        if (req.body.username) {
            update_json.username = req.body.username;
            update_json.changes.push({type: UserChanges.UsernameUpdate, date: new Date()});
        }
        if (req.body.avatar) {
            const uuid = uuidv4();
            writeFileSync(`files/avatar/${uuid}.png`, await req.body.avatar.toBuffer());
            req.body.avatar = uuid;
            update_json.changes.push({type: UserChanges.AvatarUpdate, date: new Date()});
        }
        await getDB(DatabaseCollections.Users).updateOne({id: req.params.id}, {$set: update_json});
        res.send({success: true});
    });
}
