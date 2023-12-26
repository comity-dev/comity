import { verifyKeyMiddleware } from "discord-interactions";
import express from "express";
import { Client, SlashCommandBuilder } from "comity";
import { APIInteractionResponse } from "discord-api-types/v10";

export const client = new Client("token");

client.addCommand(
	new SlashCommandBuilder()
		.name("ping")
		.description("Pong!")
		.handler((inter) => {
			return {
				type: 4,
				data: {
					content: "Pong!",
				},
			} as APIInteractionResponse;
		}),
);

const app = express();

app.post(
	"/interactions",
	verifyKeyMiddleware("publicKey"),
	async (req, res) => {
		res.json(await client.processInteraction(req.body));
	},
);

app.listen(3000, () => {
	console.log("Listening on port 3000");
});
