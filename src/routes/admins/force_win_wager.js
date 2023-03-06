import {
    checkCredentials,
    APIErrors,
    __dirname,
    errorhandler,
    SocketEvents,
    getDB,
    DatabaseCollections,
    api_v1_admin_wager_force_win,
    WagerStates,
    moment,
} from '../../../index.js';
import {result} from '../wagers/result.js';
export default async function (fastify, opts, done) {
    fastify.patch('/admin/wagers/:id/force-win', {schema: {body: api_v1_admin_wager_force_win}}, async (req, res) => {
        const user = await checkCredentials(req, res);
        if (!['admin'].some(i => i == user.role) || user.banned.status) res.redirect('https://gamermatch.gg');
        const wager = await getDB(DatabaseCollections.Wagers).findOne({id: req.params.id});
        if (!wager) return errorhandler({req, res, errors: [APIErrors.WagerUnknown]});
        if (![WagerStates.Disputed, WagerStates.Running].some(i => i == wager.state)) return errorhandler({req, res, errors: [APIErrors.WagerNotDisputedNorRunning]});
        result({wager, user, winner: req.body.team, fastify, req, res});
        const readyclients = [];
        for (const [k, v] of [...fastify.io.sockets.sockets]) {
            const lookup = await getDB(DatabaseCollections.Authentication).findOne({uuid: v.handshake.auth.auth});
            if (
                wager.members.some(i => v.handshake.auth.user_id == i.id && i.ready && v.handshake.auth.id == wager.id) ||
                (lookup && lookup.role == 'admin' && v.handshake.auth.id == wager.id)
            ) {
                if (lookup.user_id == v.handshake.auth.user_id || (lookup && (lookup.role == 'admin' || lookup.role == 'mod'))) readyclients.push(k);
            }
        }
        if (readyclients.length) {
            const team = await getDB(DatabaseCollections.Teams).findOne({id: req.body.team});
            fastify.io.to(readyclients).emit(SocketEvents.NewChat, {
                id: 'SYSTEM',
                username: 'SYSTEM',
                avatar: null,
                message: `${user.username} forced win to ${team.name}`,
                type: 'SYSTEM',
                date: {
                    raw: new Date(),
                    formatted: moment(new Date()).format('LLLL'),
                },
            });
            await getDB(DatabaseCollections.Wagers).updateOne(
                {id: wager.id},
                {
                    $push: {
                        chat: {
                            id: 'SYSTEM',
                            username: 'SYSTEM',
                            avatar: null,
                            message: `${user.username} forced win to ${team.name}`,
                            type: 'SYSTEM',
                            date: {
                                raw: new Date(),
                                formatted: moment(new Date()).format('LLLL'),
                            },
                        },
                    },
                }
            );
        }
        res.send({success: true});
    });
}
