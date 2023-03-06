export const api_v1_users_login = {
    type: 'object',
    required: ['username', 'password', 'login_type'],
    additionalProperties: false,
    properties: {
        username: {
            type: 'string',
        },
        password: {
            type: 'string',
        },
        login_type: {
            type: 'string',
        },
    },
};
export const api_v1_users_create = {
    type: 'object',
    required: ['username', 'mail', 'password'],
    additionalProperties: false,
    properties: {
        username: {
            type: 'string',
        },
        mail: {
            type: 'string',
        },
        password: {
            type: 'string',
        },
        referal: {
            type: 'string',
            nullable: true,
        },
    },
};
export const api_v1_users_verify_mail = {
    type: 'object',
    required: ['code'],
    additionalProperties: false,
    properties: {
        code: {
            type: 'string',
        },
    },
};
export const api_v1_users_update = {
    type: 'object',
    required: [],
    additionalProperties: false,
    properties: {
        username: {
            type: 'string',
        },
        avatar: {
            format: 'binary',
        },
        password: {
            type: 'string',
        },
    },
};
export const api_v1_users_connection = {
    type: 'object',
    required: ['game', 'id'],
    additionalProperties: false,
    properties: {
        game: {
            type: 'string',
        },
        id: {
            type: 'string',
        },
    },
};
export const api_v1_teams_create = {
    type: 'object',
    required: ['name'],
    additionalProperties: false,
    properties: {
        name: {
            type: 'string',
        },
    },
};
export const api_v1_wagers_create = {
    type: 'object',
    required: ['fee', 'size', 'region', 'type', 'team', 'game', 'platforms', 'cover'],
    additionalProperties: false,
    properties: {
        fee: {
            type: 'number',
        },
        size: {
            type: 'number',
        },
        region: {
            type: 'string',
            enum: ['EU', 'NAE', 'OCE', 'NAW'],
        },
        map: {
            type: 'string',
            enum: ['HAVEN', 'ICEBOX', 'BIND', 'ASCENT', 'BREEZE', 'FRACTURE', 'PEARL'],
        },
        type: {
            type: 'string',
            enum: ['Zone Wars', 'Box Fights', 'Realistics'],
        },
        first_to: {
            type: 'number',
        },
        team: {
            type: 'string',
        },
        game: {
            type: 'string',
            enum: ['Fortnite'],
        },
        cover: {
            type: 'boolean',
        },
        platforms: {
            type: 'string',
            enum: ['all', 'console', 'pc'],
        },
        password: {
            type: 'string',
            nullable: true,
        },
    },
};

export const api_v1_referals_create = {
    type: 'object',
    required: ['code'],
    additionalProperties: false,
    properties: {
        code: {
            type: 'string',
        },
    },
};

export const api_v1_wagers_chat = {
    type: 'object',
    required: ['message'],
    additionalProperties: false,
    properties: {
        message: {
            type: 'string',
        },
    },
};

export const api_v1_wagers_cancel = {
    type: 'object',
    required: ['team'],
    additionalProperties: false,
    properties: {
        team: {
            type: 'string',
            nullable: true,
        },
    },
};
export const api_v1_wagers_join = {
    type: 'object',
    required: ['team', 'cover'],
    additionalProperties: false,
    properties: {
        team: {
            type: 'string',
        },
        cover: {
            type: 'boolean',
        },
        password: {
            type: 'string',
            nullable: true,
        },
    },
};
export const api_v1_admin_user_update = {
    type: 'object',
    required: [],
    additionalProperties: false,
    properties: {
        banned: {
            type: 'object',
            properties: {
                status: {
                    type: 'boolean',
                },
                until: {
                    type: 'string',
                    format: 'date-time',
                },
            },
        },
        verified: {
            type: 'object',
            properties: {
                status: {
                    type: 'boolean',
                },
                code: {
                    type: 'string',
                    nullable: true,
                },
            },
        },
        role: {
            type: 'string',
            enum: ['admin', 'user', 'beta', 'mod'],
        },
        mail: {
            type: 'string',
        },
        password: {
            type: 'string',
        },
        username: {
            type: 'string',
        },
        avatar: {
            format: 'binary',
        },
    },
};
export const api_v1_wagers_result = {
    type: 'object',
    required: ['winner'],
    additionalProperties: false,
    properties: {
        winner: {
            type: 'string',
        },
    },
};
export const api_v1_admin_wager_force_win = {
    type: 'object',
    required: ['team'],
    additionalProperties: false,
    properties: {
        team: {
            type: 'string',
        },
    },
};

export const api_v1_users_withdraw = {
    type: 'object',
    required: ['amount', 'mail'],
    additionalProperties: false,
    properties: {
        amount: {
            type: 'number',
        },
        mail: {
            type: 'string',
        },
    },
};

export const api_v1_users_reset = {
    type: 'object',
    required: ['password', 'id'],
    additionalProperties: false,
    properties: {
        password: {
            type: 'string',
        },
        id: {
            type: 'string',
        },
    },
};
export const api_v1_users_reset_mail = {
    type: 'object',
    required: ['mail'],
    additionalProperties: false,
    properties: {
        mail: {
            type: 'string',
        },
    },
};
