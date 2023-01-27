import { verifyKeyMiddleware } from "discord-interactions"
import express from "express";
import { client } from "./base";


const app = express();

app.post('/interactions', verifyKeyMiddleware("publicKey"), async (req, res) => {
    return await client.processInteraction(req.body);
});

app.listen(3000, () => {
    console.log('Listening on port 3000');
});
