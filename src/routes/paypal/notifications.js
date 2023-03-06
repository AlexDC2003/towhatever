import {__dirname, paypal, getDB, DatabaseCollections} from '../../../index.js';
export default async function (fastify, opts, done) {
    fastify.post('/api/v1/paypal/notifications', async (req, res) => {
        const verify = await paypal.notification.webhookEvent.verify(req.headers, req.body, '9KJ8940662598425U');
        if (verify.error) console.error(error);
        else {
            if (verify.verification_status == 'SUCCESS') {
                await getDB(DatabaseCollections.Users).updateOne(
                    {id: req.body.resource.custom_id},
                    {
                        $inc: {balance: Number(req.body.resource.amount.value)},
                        $push: {transactions: {date: new Date(), amount: Number(req.body.resource.amount.value), id: req.body.resource.id}},
                    }
                );
                return res.code(200).send();
            } else return res.code(401).send();
        }
    });
}
