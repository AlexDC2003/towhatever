const {
  BracketTourneyData,
  TourneySchema,
  MatchData,
  RoundData,
} = require("../models/BracketTournament");
const { WagerObjectData } = require("../models/WagerObject");
const { WagerData } = require("../models/Wager");
const { UserData } = require("../models/User");
const { TeamData } = require("../models/Team");
const { bracket } = require("consolidate");
const {
  getUser,
  getUserIdFromToken,
  getUserToken,
  getUsernameFromToken,
  teamMinBal,
} = require("../utils/helperMethods");
const { v4: uuidv4 } = require("uuid");
const hash = require("object-hash");
const {
  generateTournamentMatch,
} = require("../utils/bracketTournamentHelpers");
// const { TeamData } = require("../models/Team");

const generateTournamentBracket = (numTeams) => {
  const numRounds = Math.log(numTeams) / Math.log(2);
  const matches = [];
  for (let i = 0; i < numRounds; i++) {
    matches.push([]);
  }

  let numTeamsPerRound = numTeams / 2;

  // loop through each round
  for (let i = 0; i < matches.length; i++) {
    // for each round loop through numTeamsPerRound and push in a new match object
    if (numTeamsPerRound > 0) {
      for (let j = 0; j < numTeamsPerRound; j++) {
        matches[i].push(
          new MatchData({ redteamid: null, blueteamid: null, winner: -1 })
        );
      }
      numTeamsPerRound = numTeamsPerRound / 2;
    }
  }
  const bracketObj = {
    num_rounds: numRounds,
    round: 0,
    matches,
  };

  return bracketObj;
};

const createBracketTournament = async (req, res) => {
  try {
    // const userToken = getUserToken(req);
    // const username = await getUsernameFromToken(userToken);

    // const userdata = await UserData.findOne({ username: username });
    // if (!userdata) {
    //   return res.status(409).send({
    //     error: true,
    //     message: "Not great enough role to create tournament.",
    //   });
    // }
    // if (!userdata.role) {
    //   return res.status(409).send();
    // }
    // if (userdata.role < 502 && userdata.role != 69) {
    //   return res.status(409).send({
    //     error: true,
    //     message: "Not great enough role to create tournament.",
    //   });
    // }

    //check username and make sure it has role == 69 // role > 501
    //state 0 = waiting to start tourney
    //state 1 = ongoing tournament
    //state 2 = finished tournament
    //state -1 = cancelled/something wrong
    if (req.body.entry_fee == 0 && req.body.prize >= 0) {
      const userHostingTourney = await UserData.findOne({
        username: req.body.username,
      });
      if (userHostingTourney.balance >= req.body.prize) {
        userHostingTourney.balance -= req.body.prize;
        await userHostingTourney.save();
      } else {
        return res.status(409).send({
          error: true,
          message: "You do not have enough tokens to fund this tournament.",
        });
      }
    }
    if (
      !(
        req.body.start_date ||
        req.body.team_size ||
        req.body.game ||
        req.body.region ||
        req.body.num_teams ||
        req.body.prize ||
        req.body.num_winners ||
        req.body.admins ||
        req.body.format ||
        req.body.match_type ||
        req.body.first_to
      )
    ) {
      return res.status(409).send({
        error: true,
        message: "One of the required fields are missing.",
      });
    }

    const bracket = generateTournamentBracket(req.body.num_teams);

    const newBracketTournament = new BracketTourneyData({
      start_date: new Date(req.body.start_date),
      team_size: req.body.team_size,
      game: req.body.game,
      region: req.body.region,
      teams: [],
      num_teams: req.body.num_teams,
      state: 0,
      match_type: req.body.match_type,
      first_to: req.body.first_to,
      bracket: bracket,
      title: req.body.title ?? null,
      description: req.body.description ?? null,
      prize:
        req.body.entry_fee > 0
          ? req.body.team_size * req.body.entry_fee * req.body.num_teams
          : req.body.prize,
      entry_fee: req.body.entry_fee ?? 0,
      paid_prizes: false,
      num_winners: req.body.num_winners,
      winners: [],
      admins: req.body.admins,
      format: req.body.format,
      hosted_by: req.body.host ?? "Tkns.GG",
      rules: req.body.rules ?? null,
    });
    await newBracketTournament.save();

    // start tournament when the time remaining hits 0
    const timeRemaining = (startDate) => {
      return new Date(startDate) - new Date();
    };
    console.log(timeRemaining(newBracketTournament.start_date));
    setTimeout(
      () => startBracketTournament(newBracketTournament._id),
      timeRemaining(newBracketTournament.start_date)
    );

    return res
      .status(200)
      .send({ error: null, tournament: newBracketTournament });
  } catch (err) {
    console.log(err);
    return res.status(409).send({
      error: true,
      message: "Something went wrong in tournament creation.",
    });
  }
};

const joinBracketTournament = async (req, res) => {
  // const userToken = getUserToken(req);
  // const username = await getUsernameFromToken(userToken);
  const username = req.body.username;
  const tourneyId = req.body.tourneyId;
  const teamId = req.body.teamId;
  const puttingUp = req.body.puttingUp;

  const teamData = await TeamData.findOne({ _id: teamId });
  const userData = await UserData.findOne({ username });

  if (!teamData.usernames.includes(username)) {
    return res.status(409).send({
      error: true,
      message: "You are attempting to join with a team you are no longer in.",
    });
  }
  const tourneyToJoin = await BracketTourneyData.findOne({ _id: tourneyId });

  if (!tourneyToJoin) {
    return res
      .status(409)
      .send({ error: true, message: "Tournament no longer exists." });
  }
  if (tourneyToJoin.state !== 0) {
    return res
      .status(409)
      .send({ error: true, message: "Tournament has already begun." });
  }

  if (tourneyToJoin.team_size !== teamData.usernames.length) {
    return res.status(409).send({
      error: true,
      message: "Team size is incorrect for this tournament.",
    });
  }
  if (tourneyToJoin.teams.length === tourneyToJoin.num_teams) {
    return res.status(409).send({
      error: true,
      message: "Tournament is full.",
    });
  }
  if (tourneyToJoin.teamIds.includes(teamData._id)) {
    return res.send({
      error: true,
      message: "This team is already registered for this tournament.",
    });
  }
  for (let i = 0; i < tourneyToJoin.teams.length; i++) {
    for (let j = 0; j < teamData.usernames.length; j++) {
      if (tourneyToJoin.teams[i].usernames.includes(teamData.usernames[j])) {
        return res.send({
          error: true,
          message:
            "At least one player on this team is already registered for this tournament.",
        });
      }
    }
  }
  //they dont have enough money
  if (tourneyToJoin.entry_fee > 0) {
    if (tourneyToJoin.entry_fee > userData.balance) {
      return res.status(409).send({
        error: true,
        message:
          "You do not have enough tokens to enter this tournament. Get your bread up.",
      });
    }

    if (puttingUp === true || puttingUp === "true") {
      // check blue user balance
      const puttingUpMinBal = await teamMinBal([username], -1);
      if (
        tourneyToJoin.entry_fee * teamData.usernames.length >
        puttingUpMinBal
      ) {
        return res.send({
          error: true,
          message:
            "You do not have enough tokens to put up for your teammates.",
        });
      } else {
        userData.balance -= tourneyToJoin.entry_fee * teamData.usernames.length;
        await userData?.save();
      }
    } else {
      // check all team balance
      const minBalance = await teamMinBal([...teamData.usernames], -1);
      if (tourneyToJoin.entry_fee > minBalance) {
        return res.send({
          error: true,
          message:
            "At least one member on your team does not have enough tokens to participate in the tournament.",
        });
      } else {
        for (let i = 0; i < teamData?.usernames?.length; i++) {
          const userdata = await UserData.findOne({
            username: teamData.usernames[i],
          });
          userdata.balance -= tourneyToJoin.entry_fee;
          await userdata?.save();
        }
      }
    }
  }
  tourneyToJoin.teamIds.addToSet(teamData._id);
  tourneyToJoin.teams.addToSet(teamData);
  await tourneyToJoin.save();
  //if tourney is full
  //start tourney on backend
  //but dont show front end until actual date
  return res.status(200).send({
    error: null,
    message: "Successfully registered for " + tourneyToJoin.title,
  });
};
const shuffleTeams = (teams) => {
  let newArr = [...teams];
  for (let i = 0; i < newArr.length; i++) {
    let j = Math.floor(Math.random() * (i + 1));

    let temp = newArr[i];
    newArr[i] = newArr[j];
    newArr[j] = temp;
  }
  return newArr;
};

const generateMatch = (teamCounter, matchCounter, teams, matches) => {
  if (teamCounter >= teams.length || matchCounter.length >= matches.length)
    return;
  matches[matchCounter].blueteamid = teams[teamCounter];
  matches[matchCounter].redteamid = teams[teamCounter + 1];
  let newTeamCounter = (teamCounter += 2);
  let newMatchCounter = (matchCounter += 1);
  generateMatch(newTeamCounter, newMatchCounter, teams, matches);
};

const generateRoundOne = (roundOneMatches, teams) => {
  generateMatch(0, 0, teams, roundOneMatches);
};

const cancelBracketTournament = async (tourneyId) => {
  // const tourneyId = req.body.tourneyId;
  const tourneyToJoin = await BracketTourneyData.findOne({ _id: tourneyId });
  tourneyToJoin.state = -1;
  for (let i = 0; i < tourneyToJoin.teams.length; i++) {
    for (let j = 0; j < tourneyToJoin.teams[i].usernames.length; j++) {
      const userToRefund = await UserData.findOne({
        username: tourneyToJoin.teams[i].usernames[j],
      });
      userToRefund.balance += tourneyToJoin.entry_fee;
      await userToRefund.save();
    }
  }
  for (let i = 0; i < tourneyToJoin.teamIds.length; i++) {
    const teams = await TeamData.findOne({ _id: tourneyToJoin.teamIds[i] });
    teams.in_wager = false;
    teams.wager_id = "";
    await teams?.save();
  }

  await tourneyToJoin?.save();
  return;
};

const startBracketTournament = async (tourneyId) => {
  const tourneyToJoin = await BracketTourneyData.findOne({ _id: tourneyId });

  if (!tourneyToJoin) {
    return;
  }
  if (tourneyToJoin.teams.length !== tourneyToJoin.num_teams) {
    cancelBracketTournament(tourneyToJoin._id);
    return;
  }

  if (tourneyToJoin.state !== 0) {
    return;
  }

  if (new Date(tourneyToJoin.start_date) > new Date()) {
    return;
  }

  for (let i = 0; i < tourneyToJoin.teamIds.length; i++) {
    const teams = await TeamData.findOne({ _id: tourneyToJoin.teamIds[i] });
    teams.in_wager = true;
    await teams.save();
    // return res.status(200).send({ error: null, teams: teams });
  }

  generateRoundOne(
    tourneyToJoin.bracket.matches[0],
    shuffleTeams(tourneyToJoin.teamIds)
  );
  await tourneyToJoin?.save();
  const roundOne = tourneyToJoin.bracket.matches[0];
  for (let i = 0; i < roundOne.length; i++) {
    const match = roundOne[i];
    const redteam_users = await TeamData.findOne({ _id: match.redteamid });
    const blueteam_users = await TeamData.findOne({ _id: match.blueteamid });
    if (redteam_users && blueteam_users) {
      generateTournamentMatch(
        match.blueteamid,
        match.redteamid,
        blueteam_users.usernames,
        redteam_users.usernames,
        tourneyToJoin,
        match
      );
    }
  }
  tourneyToJoin.bracket.round = 1;
  //playing state tourney
  tourneyToJoin.state = 1;
  await tourneyToJoin.save();
  return;
};

/*

 blueteamid,
  redteamid,
  blueteam_users,
  redteam_users,
  tourney

*/

module.exports = {
  createBracketTournament,
  generateTournamentBracket,
  joinBracketTournament,
  startBracketTournament,
  cancelBracketTournament,
};
