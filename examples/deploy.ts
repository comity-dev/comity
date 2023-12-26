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
client.deployCommands();
