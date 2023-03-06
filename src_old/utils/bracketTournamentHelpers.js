const { TeamData } = require("../models/Team");
const { v4: uuidv4 } = require("uuid");
const hash = require("object-hash");
const { WagerData } = require("../models/Wager");
const { WagerObjectData } = require("../models/WagerObject");
// const { TeamData } = require("../models/Team");

const generateTournamentMatch = async (
  blueteamid,
  redteamid,
  blueteam_users,
  redteam_users,
  tourney,
  match
) => {
  try {
    const uuid = uuidv4();

    const unique_value = hash({
      blueteamid,
      redteamid,
      uuid,
    });
    // wager object without states on it being created
    let newWagerObj = {
      unique_value: unique_value,
      blueteamid: blueteamid,
      redteamid: redteamid,
      blueteam_users: blueteam_users,
      redteam_users: redteam_users,
      entry_fee: 0,
      region: tourney.region,
      match_type: tourney.match_type,
      team_size: tourney.team_size,
      first_to: tourney.first_to,
      done: false,
      chat: [],
      cancelled: false,
      paid_entry: false,
      paid_prizes: false,
      console_only: false,
      password: "",
      game: tourney.game,
      rematchSent: false,
      rematchAccepted: false,
      isTourneyMatch: true,
      tourneyId: tourney._id,
    };
    const newWager = new WagerData(newWagerObj);
    await newWager.save();
    const allUsers = blueteam_users.concat(redteam_users);

    // create wager obj with states
    const newWagerObjData = new WagerObjectData({
      wagerid: newWager._id,
      blueteamid: newWager?.blueteamid,
      redteamid: newWager?.redteamid,
      blue_users: newWager?.blueteam_users,
      red_users: newWager?.redteam_users,
      readied_users: [...allUsers],
      is_readied: [],
      bluesubmit: -1,
      redsubmit: -1,
      single_sub: -1,
      winner: -1,
      CANCEL_STATE: -1,
      JOIN_STATE: 0,
      READY_STATE: 1,
      PLAYING_STATE: 2,
      DONE_STATE: 3,
      DISPUTE_STATE: 4,
      state: 1,
      timer: 600,
    });
    await newWagerObjData.save();

    const blueteamdata = await TeamData.findOne({
      _id: newWager?.blueteamid,
    });
    const redteamdata = await TeamData.findOne({
      _id: newWager?.redteamid,
    });

    if (!blueteamdata || !redteamdata) {
      return;
    }

    blueteamdata.wager_id = newWager._id;
    await blueteamdata?.save();

    redteamdata.wager_id = newWager._id;
    await redteamdata?.save();

    match._id = newWager._id;
    await tourney.save();
  } catch (err) {
    console.log(err);
    return;
  }
};

module.exports = {
  generateTournamentMatch,
};
