import { EmbedBuilder } from "./embeds.js";
import {
	APIInteractionResponse,
	RESTPostAPIChannelMessageJSONBody,
} from "discord-api-types/v10";

/**
 * A builder for messages
 */
export class MessageBuilder {
	private message: Partial<RESTPostAPIChannelMessageJSONBody> = {};

	/**
	 * Set the content of the message
	 * @param content The content of the message
	 * @remarks
	 * Must be between 1 and 2000 characters long
	 */
	content(content: string) {
		this.message.content = content;
		return this;
	}

	/**
	 * Set whether the message should be sent with text-to-speech
	 * @param tts Whether the message should be sent with text-to-speech
	 */
	tts(tts: boolean) {
		this.message.tts = tts;
		return this;
	}

	/**
	 * Add an embed to the message
	 * @param callback A callback that returns an embed builder
	 * @remarks
	 * @see {@link EmbedBuilder}
	 */
	embed(callback: (embed: EmbedBuilder) => EmbedBuilder) {
		if (!this.message.embeds) this.message.embeds = [];
		this.message.embeds.push(callback(new EmbedBuilder())["embed"]);
		return this;
	}

	/**
	 * Transforms the message builder into an API interaction response
	 */
	toResponse(): APIInteractionResponse {
		return {
			type: 4,
			data: this.message,
		};
	}
}
