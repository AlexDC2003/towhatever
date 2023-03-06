import {MongoClient} from 'mongodb';
import {fastify as f} from 'fastify';
import moment from 'moment';
import {readFileSync, writeFileSync, existsSync} from 'fs';
import Ajv from 'ajv';
import bcrypt from 'bcrypt';
import path from 'path';
import {DatabaseCollections, APIErrors, WagerStates} from './src/utils/static.js';
import nodemailer from 'nodemailer';
import paypal from 'paypal-node-sdk';
import {WebhookClient, ComponentType, ButtonStyle} from 'discord.js';
import {cancel} from './src/routes/wagers/cancel.js';
import {result} from './src/routes/wagers/result.js';

//init//
const fastify = f({
    ajv: {customOptions: {coerceTypes: false}},
    logger: {
        level: 'error',
    },
});
const ajv = new Ajv();
const __dirname = path.resolve();
const basedata = JSON.parse(readFileSync('./config.json'));
const mongoclient = new MongoClient(basedata.mongo);
await mongoclient.connect();
const transporter = nodemailer.createTransport({
    host: 'smtp.sendgrid.net',
    port: 587,
    auth: {
        user: 'apikey',
        pass: basedata.sendgrid,
    },
});
transporter.verify().catch(e => console.error(e));
const webhookClient = new WebhookClient({
    url: 'https://discord.com/api/webhooks/1035200723731877928/21RBL55C0Q6VzwOH38CAk3pdhGEcmEChE9tyS5vgSMvibJ4C7wqHDDNuZSYjpOZ5y5Ih',
});

//essential functions//
const getDB = (col, db = 'gamermatch') => {
    return mongoclient.db(db).collection(col);
};
const errorhandler = ({req, res, errors} = {}) => {
    res.code(errors.length > 1 ? 400 : errors[0].status).send({errors});
};
const uuidv4 = () => {
    let dt = new Date().getTime();
    const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        let r = (dt + Math.random() * 16) % 16 | 0;
        dt = Math.floor(dt / 16);
        return (c == 'x' ? r : (r & 0x3) | 0x8).toString(16);
    });
    return uuid;
};
const getCookie = (name, req) => {
    let nameEQ = name + '=';
    let ca = req.headers.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) == ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
};
const checkCredentials = async (req, res, username = null) => {
    if (!req.headers.cookie) return errorhandler({req, res, errors: [APIErrors.Unauthorized]});
    const uuid = getCookie('auth', req);
    const DbCheck = await getDB(DatabaseCollections.Authentication).findOne({uuid});
    if (!DbCheck) return errorhandler({req, res, errors: [APIErrors.Forbidden]});
    if (username && DbCheck.username != username) return errorhandler({req, res, errors: [APIErrors.UnmatchingUsers]});
    return await getDB(DatabaseCollections.Users).findOne({id: DbCheck.user_id});
};

fastify.get('/', (req, res) => {
    return res.redirect(`/start`);
    res.type('text/html');
    res.sendFile('coming.html');
});

fastify.get('/signup', (req, res) => {
    res.redirect(`https://gamermatch.gg?signup=true${req.query.referal ? `&referal=${req.query.referal}` : ''}`);
});

fastify.get('/start', async (req, res) => {
    res.type('text/html');
    return res.type('text/html').send(readFileSync(`public/index.html`));
});
fastify.get('/cash-matches', async (req, res) => {
    res.type('text/html');
    return res.type('text/html').send(readFileSync(`public/cash-matches.html`));
});
fastify.get('/leaderboard', async (req, res) => {
    const user = await checkCredentials(req, res);
    if (!user || user.banned.status) res.redirect('https://gamermatch.gg');
    res.type('text/html');
    return res.type('text/html').send(readFileSync(`public/leaderboard.html`));
});
fastify.get('/games', async (req, res) => {
    const user = await checkCredentials(req, res);
    if (!user || user.banned.status) res.redirect('https://gamermatch.gg');
    res.type('text/html');
    return res.type('text/html').send(readFileSync(`public/match-page.html`));
});
fastify.get('/profile', async (req, res) => {
    const user = await checkCredentials(req, res);
    if (!user || user.banned.status) res.redirect('https://gamermatch.gg');
    res.type('text/html');
    return res.type('text/html').send(readFileSync(`public/profile.html`));
});
fastify.get('/teams', async (req, res) => {
    const user = await checkCredentials(req, res);
    if (!user || user.banned.status) res.redirect('https://gamermatch.gg');
    res.type('text/html');
    return res.type('text/html').send(readFileSync(`public/teams.html`));
});
fastify.get('/team', async (req, res) => {
    const user = await checkCredentials(req, res);
    if (!user || user.banned.status) res.redirect('https://gamermatch.gg');
    res.type('text/html');
    return res.type('text/html').send(readFileSync(`public/profile_team.html`));
});
fastify.get('/@me', async (req, res) => {
    const user = await checkCredentials(req, res);
    if (!user || user.banned.status) res.redirect('https://gamermatch.gg');
    res.type('text/html');
    return res.type('text/html').send(readFileSync(`public/profile_me.html`));
});

fastify.get('/reset-pw', async (req, res) => {
    const lookup = await getDB(DatabaseCollections.Resets).findOne({id: req.query.id});
    res.type('text/html');
    if (!lookup) return res.send('Invalid Password Reset ID');
    return res.type('text/html').send(readFileSync(`public/reset-pw.html`));
});

fastify.get('/rules', async (req, res) => {
    res.type('text/html');
    return res.type('text/html').send(readFileSync(`public/rules.html`));
});
fastify.get('/privacy', async (req, res) => {
    res.type('text/html');
    return res.type('text/html').send(readFileSync(`public/privacy.html`));
});
fastify.get('/terms-of-service', async (req, res) => {
    res.type('text/html');
    return res.type('text/html').send(readFileSync(`public/tos.html`));
});

fastify.get('/:file', (req, res) => {
    if (existsSync(`public/${req.params.file}`)) {
        if (req.params.file.includes('.png')) return res.type('image/png').send(readFileSync(`public/${req.params.file}`));
        if (req.params.file.includes('.css')) return res.type('text/css').send(readFileSync(`public/${req.params.file}`));
        if (req.params.file.includes('.html')) return res.type('text/html').send(readFileSync(`public/${req.params.file}`));
        if (req.params.file.includes('.js')) return res.type('text/javascript').send(readFileSync(`public/${req.params.file}`));
        if (req.params.file.includes('.mp3')) return res.type('audio/mpeg').send(readFileSync(`public/${req.params.file}`));
    }
    return errorhandler({req, res, errors: [APIErrors.CDNUnavailable]});
});

fastify.get('/assets/:file', (req, res) => {
    if (existsSync(`public/assets/${req.params.file}`)) {
        if (req.params.file.includes('.png')) return res.type('image/png').send(readFileSync(`public/assets/${req.params.file}`));
        if (req.params.file.includes('.css')) return res.type('text/css').send(readFileSync(`public/assets/${req.params.file}`));
        if (req.params.file.includes('.html')) return res.type('text/html').send(readFileSync(`public/assets/${req.params.file}`));
        if (req.params.file.includes('.js')) return res.type('text/javascript').send(readFileSync(`public/assets/${req.params.file}`));
        if (req.params.file.includes('.svg')) return res.type('image/svg+xml').send(readFileSync(`public/assets/${req.params.file}`));
        if (req.params.file.includes('.mp3')) return res.type('audio/mpeg').send(readFileSync(`public/assets/${req.params.file}`));
        if (req.params.file.includes('.jpg') || req.params.file.includes('.jpeg')) return res.type('image/jpeg').send(readFileSync(`public/assets/${req.params.file}`));
    }
    return errorhandler({req, res, errors: [APIErrors.CDNUnavailable]});
});

//Interval Checks
setInterval(async () => {
    const time_wagers = await getDB(DatabaseCollections.Wagers)
        .find({timer: {$ne: null}})
        .toArray();
    for (let i = 0; time_wagers.length > i; i++) {
        if (moment(time_wagers[i].timer).unix() < moment().unix()) {
            getDB(DatabaseCollections.Wagers).updateOne({id: time_wagers[i].id}, {$set: {timer: null}});
            if (time_wagers[i].state == 'waiting' && !time_wagers[i].winner.length) cancel({wager: time_wagers[i], user: 'SYSTEM', team: 'SYSTEM', fastify});
            if (time_wagers[i].state == 'running' && time_wagers[i].winner.length)
                result({wager: time_wagers[i], user: {id: 'SYSTEM', role: 'admin'}, winner: time_wagers[i].winner[0].id, fastify});
        }
    }
}, 5000);

setInterval(async () => {
    const banned_users = await getDB(DatabaseCollections.Users).find({'banned.status': true}).toArray();
    for (let i = 0; banned_users.length > i; i++) {
        if (moment(banned_users[i].banned.until).unix() < moment().unix()) {
            getDB(DatabaseCollections.Users).updateOne({id: banned_users[i].id}, {$set: {banned: {status: false, until: null}}});
        }
    }
}, 60000);

//fastify plugins//
//cors
fastify.register(import('@fastify/cors'), {
    origin: ['http://127.0.0.1:5500', 'http://127.0.0.1:8080', 'https://gamermatch.gg'],
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    allowedHeaders: ['Authorization', 'Content-Type'],
    credentials: true,
});
//file-server
fastify.register(import('@fastify/static'), {
    root: path.join(__dirname, 'page'),
    prefix: '/page/', // optional: default '/'
});
//socket.io-fastify
fastify.register(import('fastify-socket.io'), {});
//file-upload
fastify.register(import('@fastify/multipart'), {attachFieldsToBody: true});

//fastify hooks//
fastify.addHook('onRequest', async (req, res) => {
    res.type('application/json; charset=UTF-8');
});

//fastify routes//
fastify.register(import('./src/routes/users/login.js'));
fastify.register(import('./src/routes/users/create.js'));
fastify.register(import('./src/routes/users/verify_mail.js'));
fastify.register(import('./src/routes/users/logout.js'));
fastify.register(import('./src/routes/users/@me.js'));
fastify.register(import('./src/routes/users/@me_teams.js'));
fastify.register(import('./src/routes/users/@me_matches.js'));
fastify.register(import('./src/routes/users/@me_notification_read.js'));
fastify.register(import('./src/routes/users/@me_connections.js'));
fastify.register(import('./src/routes/users/@me_start.js'));
fastify.register(import('./src/routes/users/@me_update.js'));
fastify.register(import('./src/routes/users/@me_reset.js'));
fastify.register(import('./src/routes/users/@me_reset_mail.js'));
fastify.register(import('./src/routes/users/@me_latest_game.js'));
fastify.register(import('./src/routes/users/@me_withdraw.js'));
fastify.register(import('./src/routes/users/count.js'));
fastify.register(import('./src/routes/users/by_id.js'));

fastify.register(import('./src/routes/teams/create.js'));
fastify.register(import('./src/routes/teams/requests.js'));
fastify.register(import('./src/routes/teams/cancel.js'));
fastify.register(import('./src/routes/teams/join.js'));
fastify.register(import('./src/routes/teams/leave.js'));
fastify.register(import('./src/routes/teams/kick.js'));
fastify.register(import('./src/routes/teams/search.js'));
fastify.register(import('./src/routes/teams/by_id.js'));

fastify.register(import('./src/routes/wagers/by_id.js'));
fastify.register(import('./src/routes/wagers/cancel.js'));
fastify.register(import('./src/routes/wagers/chat.js'));
fastify.register(import('./src/routes/wagers/create.js'));
fastify.register(import('./src/routes/wagers/join.js'));
fastify.register(import('./src/routes/wagers/ready.js'));
fastify.register(import('./src/routes/wagers/result.js'));
fastify.register(import('./src/routes/wagers/search.js'));

fastify.register(import('./src/routes/referal/create.js'));
fastify.register(import('./src/routes/referal/list.js'));

fastify.register(import('./src/routes/withdraws/update.js'));
fastify.register(import('./src/routes/withdraws/list.js'));

fastify.register(import('./src/routes/cdn/avatar.js'));
fastify.register(import('./src/routes/cdn/page.js'));

fastify.register(import('./src/routes/public/stats.js'));

fastify.register(import('./src/routes/admins/referals.js'));
fastify.register(import('./src/routes/admins/force_win_wager.js'));
fastify.register(import('./src/routes/admins/reset.js'));
fastify.register(import('./src/routes/admins/user-update.js'));
fastify.register(import('./src/routes/admins/withdraws-ui.js'));
fastify.register(import('./src/routes/admins/update_user.js'));
fastify.register(import('./src/routes/admins/user.js'));

fastify.register(import('./src/routes/leaderboard/get.js'));

fastify.register(import('./src/routes/paypal/notifications.js'));

//login
fastify.listen({port: process.env.PORT || 8080, host: '0.0.0.0'}, async (err, address) => {
    if (err) throw err;
    console.log('API Online');
    fastify.io.on('connection', socket => {
        console.log('Connected: ', socket.id);
    });
});

paypal.configure({
    mode: 'live',
    client_id: 'ARtR75jA5iU-lv9PMzAYDDAQKqG0_sxTkAx-EdW6WS2bRedOQDv2lw0qfAKNH7KRT2dys828SfqPdFiR',
    client_secret: basedata.ppsecret,
});

//exports
export {
    getDB,
    transporter,
    paypal,
    webhookClient,
    path,
    __dirname,
    ComponentType,
    ButtonStyle,
    moment,
    bcrypt,
    errorhandler,
    uuidv4,
    checkCredentials,
    writeFileSync,
    existsSync,
    readFileSync,
};
export * from './src/utils/schema.js';
export * from './src/utils/static.js';
