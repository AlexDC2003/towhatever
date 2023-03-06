import {DatabaseCollections, APIErrors, SocketEvents, errorhandler, checkCredentials} from '../../../index.js';
export default async function (fastify, opts, done) {
    fastify.get('/api/v1/users/@me/start', async (req, res) => {
        const user = await checkCredentials(req, res);
        if (!user) return errorhandler({req, res, errors: [APIErrors.UnknownUser]});
        if (!user.verified.status) return errorhandler({req, res, errors: [APIErrors.VerifiedMail]});
        const mapping = {
            TEAM_CREATED: {
                string: 'You created a new team: {name}',
                values: [['name', 'metadata.name']],
            },
            TEAM_JOINED: {
                string: 'You successfully joined the team: {name}',
                values: [['name', 'metadata.name']],
            },
            TEAM_REQUEST: {
                string: 'You were invited to join {team}',
                values: [['team', 'metadata.name']],
            },
            TEAM_REJECTED: {
                string: 'Your join request for the team {team} was rejected',
                values: [['team', 'metadata.name']],
            },
            TEAM_LEFT: {
                string: '{name} left your team {team}',
                values: [
                    ['name', 'metadata.name'],
                    ['team', 'metadata.team'],
                ],
            },
            TEAM_KICK: {
                string: 'You got kicked from team {team}',
                values: [['team', 'metadata.name']],
            },
        };
        const unread_notis = user.notifications
            .filter(i => !i.read && mapping[i.type])
            .sort((a, b) => b.date - a.date)
            .map(i => {
                let string = mapping[i.type].string;
                for (let k = 0; mapping[i.type].values.length > k; k++) {
                    const val = mapping[i.type].values[k][1].split('.');
                    string = string.replace(`{${mapping[i.type].values[k][0]}}`, i[val[0]][val[1]]);
                }
                return {
                    string,
                    metadata: i.metadata,
                    id: i.id,
                    type: i.type,
                    buttons: null,
                };
            });
        return res.code(200).send({
            balance: user.balance,
            notifications: unread_notis,
            url:
                !user.matches[user.matches.length - 1] || user.matches[user.matches.length - 1].cancelled || user.matches[user.matches.length - 1].win != null
                    ? null
                    : `https://gamermatch.gg/games?id=${user.matches[user.matches.length - 1].id}`,
        });
    });
}
