import {DatabaseCollections, APIErrors, getDB, uuidv4, checkCredentials, errorhandler, SocketEvents, WagerStates} from '../../../index.js';
export default async function (fastify, opts, done) {
    fastify.get('/api/v1/wagers/:id', async (req, res) => {
        const user = await checkCredentials(req, res);
        if (!user) return errorhandler({req, res, errors: [APIErrors.UnknownUser]});
        if (!user.verified.status) return errorhandler({req, res, errors: [APIErrors.VerifiedMail]});
        let wager = await getDB(DatabaseCollections.Wagers).findOne({id: req.params.id});
        if (!wager) return errorhandler({req, res, errors: [APIErrors.WagerUnknown]});
        const new_members = [];
        const wager_member = wager.members.find(i => i.id == user.id);
        for (let i = 0; wager.members.length > i; i++) {
            const team_members = wager_member ? wager.members.filter(i => i.team == wager_member.team) : null;
            const userdb = await getDB(DatabaseCollections.Users).findOne({id: wager.members[i].id});
            new_members.push({
                id:
                    (wager_member && team_members && (team_members.every(i => i.ready) || wager_member.team == wager.members[i].team)) || user.role == 'admin'
                        ? userdb.id
                        : 'Hidden',
                username:
                    (wager_member && team_members && (team_members.every(i => i.ready) || wager_member.team == wager.members[i].team)) || user.role == 'admin'
                        ? userdb.username
                        : 'Hidden',
                avatar:
                    (wager_member && team_members && (team_members.every(i => i.ready) || wager_member.team == wager.members[i].team)) || user.role == 'admin'
                        ? userdb.avatar
                        : 'Hidden',
                connections:
                    (wager_member && team_members && (team_members.every(i => i.ready) || wager_member.team == wager.members[i].team)) || user.role == 'admin'
                        ? userdb.connections
                        : [],
                ready:
                    (wager_member && team_members && (team_members.every(i => i.ready) || wager_member.team == wager.members[i].team)) || user.role == 'admin'
                        ? wager.members[i].ready
                        : false,
                team: wager.members[i].team,
                hidden:
                    (wager_member && team_members && (team_members.every(i => i.ready) || wager_member.team == wager.members[i].team)) || user.role == 'admin'
                        ? false
                        : true,
            });
        }
        const new_teams = [];
        for (let i = 0; wager.teamids.joined.length > i; i++) {
            const team = await getDB(DatabaseCollections.Teams).findOne({id: wager.teamids.joined[i].id});
            new_teams.push({id: team.id, name: team.name});
        }
        if ((!wager_member || !wager_member.ready || user.banned.status) && user.role != 'admin' && user.role != 'mod') wager.chat = [];
        wager.teamids.joined = new_teams;
        wager.members = new_members;
        return res.code(200).send(wager);
    });
}
