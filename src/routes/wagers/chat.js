import {DatabaseCollections, APIErrors, getDB, moment, checkCredentials, errorhandler, SocketEvents, api_v1_wagers_chat} from '../../../index.js';
export default async function (fastify, opts, done) {
    fastify.get('/api/v1/wagers/:id/chat', async (req, res) => {
        const user = await checkCredentials(req, res);
        if (!user) return errorhandler({req, res, errors: [APIErrors.UnknownUser]});
        if (!user.verified.status) return errorhandler({req, res, errors: [APIErrors.VerifiedMail]});
        const wager = await getDB(DatabaseCollections.Wagers).findOne({id: req.params.id});
        return res.code(200).send(wager.chat);
    });
    fastify.post('/api/v1/wagers/:id/chat', {schema: {body: api_v1_wagers_chat}}, async (req, res) => {
        const user = await checkCredentials(req, res);
        if (user.banned.status) res.redirect('https://gamermatch.gg');
        if (!user) return errorhandler({req, res, errors: [APIErrors.UnknownUser]});
        if (!user.verified.status) return errorhandler({req, res, errors: [APIErrors.VerifiedMail]});
        const wager = await getDB(DatabaseCollections.Wagers).findOne({id: req.params.id});
        if (!wager) return errorhandler({req, res, errors: [APIErrors.WagerUnknown]});
        if (user.role != 'admin' && user.role != 'mod' && !wager.teamids.joined.some(i => user.teams.some(k => k.id == i.id)))
            return errorhandler({req, res, errors: [APIErrors.NotInWagerUser]});
        if (user.role != 'admin' && user.role != 'mod' && !wager.members.find(i => user.id == i.id).ready)
            return errorhandler({req, res, errors: [APIErrors.UserNotReady]});
        await getDB(DatabaseCollections.Wagers).updateOne(
            {id: req.params.id},
            {
                $push: {
                    chat: {
                        role: user.role,
                        id: user.id,
                        username: user.username,
                        avatar: user.avatar,
                        message: req.body.message,
                        type: 'MESSAGE_USER',
                        date: {
                            raw: new Date(),
                            formatted: moment(new Date()).format('LLLL'),
                        },
                    },
                },
            }
        );
        const clients = [];
        for (const [k, v] of [...fastify.io.sockets.sockets]) {
            const lookup = await getDB(DatabaseCollections.Authentication).findOne({uuid: v.handshake.auth.auth});
            if (
                wager.members.some(i => v.handshake.auth.user_id == i.id && i.ready && v.handshake.auth.id == wager.id) ||
                (lookup && lookup.role == 'admin' && v.handshake.auth.id == wager.id)
            ) {
                if (lookup.user_id == v.handshake.auth.user_id || (lookup && (lookup.role == 'admin' || lookup.role == 'mod'))) clients.push(k);
            }
        }
        if (clients.length)
            fastify.io.to(clients).emit(SocketEvents.NewChat, {
                id: user.id,
                role: user.role,
                username: user.username,
                avatar: user.avatar,
                message: req.body.message,
                type: 'MESSAGE_USER',
                date: {
                    raw: new Date(),
                    formatted: moment(new Date()).format('LLLL'),
                },
            });
        return res.code(200).send({success: true});
    });
}
