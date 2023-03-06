import {DatabaseCollections, APIErrors, getDB, errorhandler, checkCredentials, api_v1_users_withdraw, uuidv4} from '../../../index.js';
export default async function (fastify, opts, done) {
    fastify.post('/api/v1/users/@me/withdraw', {schema: {body: api_v1_users_withdraw}}, async (req, res) => {
        const user = await checkCredentials(req, res);
        if (!user) return errorhandler({req, res, errors: [APIErrors.UnknownUser]});
        if (!user.verified.status) return errorhandler({req, res, errors: [APIErrors.VerifiedMail]});
        if (req.body.amount < 10) return errorhandler({req, res, errors: [APIErrors.MinAmountWithdraw]});
        if (req.body.amount > user.earnings) return errorhandler({req, res, errors: [APIErrors.NotEnoughMoneyWithdraw]});
        const fee = req.body.amount * 0.05 + 1;
        const uuid = uuidv4();
        await getDB(DatabaseCollections.Users).updateOne(
            {id: user.id},
            {
                $inc: {earnings: -req.body.amount},
                $push: {withdraws: {id: uuid, mail: req.body.mail, date: new Date(), original_amount: req.body.amount, fee, payout: req.body.amount - fee}},
            }
        );
        await getDB(DatabaseCollections.Admin).updateOne({id: 'profit_withdraw'}, {$inc: {profit: fee}}, {upsert: true});
        await getDB(DatabaseCollections.Admin).updateOne({id: 'amount_withdraw'}, {$inc: {amount: req.body.amount}}, {upsert: true});
        await getDB(DatabaseCollections.Withdraws).insertOne({
            user_id: user.id,
            username: user.username,
            id: uuid,
            mail: req.body.mail,
            original_amount: req.body.amount,
            fee,
            payout: req.body.amount - fee,
            date: new Date(),
            processed: {
                state: false,
                date: null,
                user: null,
            },
        });
        return res.code(200).send({
            success: true,
        });
    });
}
