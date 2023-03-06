import {DatabaseCollections, APIErrors, getDB, uuidv4, checkCredentials, api_v1_teams_create, errorhandler, SocketEvents} from '../../../index.js';
export default async function (fastify, opts, done) {
    fastify.post('/api/v1/teams/create', {schema: {body: api_v1_teams_create}}, async (req, res) => {
        const user = await checkCredentials(req, res);
        if (!user) return errorhandler({req, res, errors: [APIErrors.UnknownUser]});
        if (user.banned.status) res.redirect('https://gamermatch.gg');
        if (!user.verified.status) return errorhandler({req, res, errors: [APIErrors.VerifiedMail]});
        if (user.teams.length > 10) return errorhandler({req, res, errors: [APIErrors.UserInToManyTeams]});
        const existing_team = await getDB(DatabaseCollections.Teams).findOne({name: req.body.name});
        if (existing_team) return errorhandler({req, res, errors: [APIErrors.TeamNameExists]});
        const team_id = uuidv4();
        const team_data = {
            name: req.body.name,
            id: team_id,
            created_at: new Date(),
            owner: user.id,
            members: [{id: user.id, joined_at: new Date(), role: 'owner'}],
            events: [{id: user.id, date: new Date(), type: SocketEvents.TeamJoined}],
            requests: [],
            matches: [],
            wager_state: {running: false, id: null},
            stats: {win: 0, matches: 0, loss: 0},
        };
        await getDB(DatabaseCollections.Teams).insertOne(team_data);
        await getDB(DatabaseCollections.Users).updateOne(
            {id: user.id},
            {
                $push: {
                    teams: {id: team_data.id, joined_at: team_data.created_at, role: 'owner'},
                    notifications: {
                        $each: [
                            {type: SocketEvents.TeamCreated, id: uuidv4(), date: team_data.created_at, read: false, metadata: {id: team_data.id, name: team_data.name}},
                            {type: SocketEvents.TeamJoined, id: uuidv4(), date: team_data.created_at, read: false, metadata: {id: team_data.id, name: team_data.name}},
                        ],
                    },
                },
            }
        );
        return res.code(200).send({success: true, team: team_data});
    });
}
