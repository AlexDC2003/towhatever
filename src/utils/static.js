export const SocketEvents = {
    TeamCreated: 'TEAM_CREATED',
    TeamJoined: 'TEAM_JOINED',
    TeamRequest: 'TEAM_REQUEST',
    TeamRejected: 'TEAM_REJECTED',
    TeamLeft: 'TEAM_LEFT',
    TeamKick: 'TEAM_KICK',
    UserUpdate: 'USER_UPDATE',
    WagerJoined: 'WAGER_JOINED',
    WagerCancelled: 'WAGER_CANCELLED',
    WagerCreated: 'WAGER_CREATED',
    WagerReady: 'WAGER_READY',
    WagerEnded: 'WAGER_END',
    WagerDisputed: 'WAGER_DISPUTED',
    WagerRunning: 'WAGER_RUNNING',
    WagerTimer: 'WAGER_TIMER',
    WagerReset: 'WAGER_RESET',
    NewChat: 'NEW_CHAT_MESSAGE',
};
export const UserChanges = {
    AvatarUpdate: 'AVATAR_UPDATE',
    UsernameUpdate: 'USERNAME_UPDATE',
    PasswordUpdate: 'PASSWORD_UPDATE',
    MailUpdate: 'MAIL_UPDATE',
    RoleUpdate: 'ROLE_UPDATE',
    VerifiedUpdate: 'VERIFIED_UPDATE',
    BanUpdate: 'BAN_UPDATE',
    ConnectionUpdate: 'CONNECTION_UPDATE',
};
export const DatabaseCollections = {
    Authentication: 'auth',
    Users: 'user',
    Teams: 'teams',
    Matches: 'matches',
    Referals: 'referals',
    Wagers: 'wagers',
    Admin: 'admin',
    Withdraws: 'withdraws',
    Resets: 'resets',
};
export const APIErrors = {
    UnknownUser: {
        code: 0,
        message: 'User not found',
        status: 404,
    },
    PasswordIncorrect: {
        code: 1,
        message: 'Incorrect password',
        status: 400,
    },
    VerifiedMail: {
        code: 2,
        message: 'E-Mail not verified yet',
        status: 400,
    },
    UserExist: {
        code: 3,
        message: 'A user with that username already exists',
        status: 400,
    },
    MailExist: {
        code: 4,
        message: 'A user with that mail already exists',
        status: 400,
    },
    InvalidMail: {
        code: 5,
        message: 'The email that was entered is invalid',
        status: 400,
    },
    MailAlreadyVerified: {
        code: 6,
        message: 'The email is already verified for that account',
        status: 400,
    },
    VerifyCodeUnknown: {
        code: 7,
        message: 'Unknown verify code',
        status: 404,
    },
    Unauthorized: {
        code: 8,
        message: 'No authorization code provided',
        status: 401,
    },
    Forbidden: {
        code: 9,
        message: 'Invalid authorization code',
        status: 403,
    },
    UnmatchingUsers: {
        code: 10,
        message: "The username doesn't match with the authorization code",
        status: 403,
    },
    WrongLoginSource: {
        code: 11,
        message: 'Wrong Login Method. Please use the same login that you used in the registration',
        status: 403,
    },
    UserInToManyTeams: {
        code: 12,
        message: 'You can only be in 10 Teams at a time',
        status: 400,
    },
    TeamNameExists: {
        code: 13,
        message: 'A team with that name already exists',
        status: 400,
    },
    TeamInWager: {
        code: 14,
        message: 'The team is currently in a match',
        status: 400,
    },
    UnknownTeam: {
        code: 15,
        message: 'A team with that ID does not exist',
        status: 404,
    },
    AlreadyInTeam: {
        code: 16,
        message: 'You are already in this team',
        status: 400,
    },
    NotInTeam: {
        code: 17,
        message: 'User not in this team',
        status: 400,
    },
    NoPermsTeamKick: {
        code: 18,
        message: 'You have no permission to kick a user from this team',
        status: 400,
    },
    NoConnectionForGame: {
        code: 19,
        message: 'You do not have a valid gameaccount linked for this game',
        status: 400,
    },
    EntryFeeMissmatch: {
        code: 20,
        message: 'Entry fee must be between $0.10 and $100.00',
        status: 400,
    },
    BannedMemberInTeam: {
        code: 21,
        message: 'You have at least one banned user in your team',
        status: 400,
    },
    NoConnectionInTeam: {
        code: 21,
        message: 'You have at least one user in your team that has no link with the ingame name',
        status: 400,
    },
    WagerUnknown: {
        code: 22,
        message: 'A wager with that ID does not exist',
        status: 404,
    },
    NotInWagerUser: {
        code: 23,
        message: 'You are not in this Wager',
        status: 400,
    },
    TeamNotEnoughBalance: {
        code: 24,
        message: 'The team has not enough credits to create a wager with that fee',
        status: 400,
    },
    WagerCancelled: {
        code: 25,
        message: 'This wager is already cancelled',
        status: 400,
    },
    WagerFull: {
        code: 26,
        message: 'This wager is already full',
        status: 400,
    },
    WagerSizeMismatch: {
        code: 27,
        message: 'Your team size mismatches the needed team size set by the wager',
        status: 400,
    },
    WagerJoinSelf: {
        code: 28,
        message: "You can't join your own wager",
        status: 400,
    },
    UserAlreadyReady: {
        code: 29,
        message: 'You have already readied up',
        status: 400,
    },
    WagerNotActive: {
        code: 30,
        message: "You can\t ready up before wager isn't active",
        status: 400,
    },
    NotEnoughMoneyInTeam: {
        code: 31,
        message: 'You have at least one user in your team that has not enough credits on his account to join this wager',
        status: 400,
    },
    NotEnoughMoney: {
        code: 32,
        message: 'You have not enough credits on your account to join this wager',
        status: 400,
    },
    WagerCoverUnknown: {
        code: 33,
        message: 'The User that wants to cover the wager cost is unknown',
        status: 400,
    },
    NotEnoughMoneyCover: {
        code: 34,
        message: 'The User that wants to cover the wager cost has not enough money',
        status: 400,
    },
    TeamFull: {
        code: 35,
        message: 'This team is already full (4 member)',
        status: 400,
    },
    TeamAlreadyRequestedCancel: {
        code: 36,
        message: 'This team already requested a cancel',
        status: 400,
    },
    WagerNotRunning: {
        code: 37,
        message: "This cash match hasn't started yet",
        status: 400,
    },
    UserNotReady: {
        code: 38,
        message: 'You have not readied up yet',
        status: 400,
    },
    TeamSelfJoin: {
        code: 39,
        message: "You can't join a team by yourself",
        status: 400,
    },
    TeamRequestAlreadyExist: {
        code: 40,
        message: 'You already requested a join for this team',
        status: 400,
    },
    Disputed: {
        code: 41,
        message: 'Match Results Missmatch',
        status: 400,
    },
    WagerDisputed: {
        code: 42,
        message: 'This wager is already disputed',
        status: 400,
    },
    WagerUserJoinSelf: {
        code: 43,
        message: 'A user from your team is already in this wager in another team',
        status: 400,
    },
    WagerNotDisputedNorRunning: {
        code: 44,
        message: "This Wager is not in running nor disputed state, can't force win this match",
        status: 400,
    },
    WagerNotDisputedNorEnded: {
        code: 45,
        message: "This Wager is not in running nor ended state, can't reset this match",
        status: 400,
    },
    MinAmountWithdraw: {
        code: 46,
        message: 'The minimum amount of money to withdraw is 10.',
        status: 400,
    },
    NotEnoughMoneyWithdraw: {
        code: 47,
        message: 'You can only withdraw if you earned more than $10.',
        status: 400,
    },
    NoInviteForThisTeam: {
        code: 48,
        message: 'You have no invite for this team',
        status: 400,
    },
    UserInDisputedMatch: {
        code: 49,
        message: 'A user from your team is in a disputed match',
        status: 400,
    },
    AvatarUnavailable: {
        code: 1000,
        message: 'Unknown image',
        status: 404,
    },
    CDNUnavailable: {
        code: 1001,
        message: 'Unknown file',
        status: 404,
    },
    AdminNoPerms: {
        code: 2000,
        message: 'No permission',
        status: 403,
    },
    ReferalExists: {
        code: 3000,
        message: 'Referal Code already exists',
        status: 400,
    },
};
export const TeamKickRoles = ['owner'];
export const WagerStates = {
    Waiting: 'waiting',
    Running: 'running',
    Ended: 'ended',
    Cancelled: 'cancelled',
    Disputed: 'disputed',
};
