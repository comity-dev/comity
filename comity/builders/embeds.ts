import {
	APIEmbed,
	APIEmbedAuthor,
	APIEmbedFooter,
} from "discord-api-types/v10";

/**
 * A builder for embed fields
 * @remarks
 * Not meant to be constructed directly
 * @internal
 * @see {@link MessageBuilder#embed}
 */
export class EmbedBuilder {
	private embed: Partial<APIEmbed> = {};

	/**
	 * Sets the title of the embed.
	 * @param title The title of the embed.
	 */
	title(title: string) {
		this.embed.title = title;
		return this;
	}

	/**
	 * Sets the description of the embed.
	 * @param description The description of the embed.
	 */
	description(description: string) {
		this.embed.description = description;
		return this;
	}

	/**
	 * Sets the URL of the embed.
	 * @param url The URL of the embed.
	 * @remarks
	 * If set, the title of the embed will become a hyperlink to this URL.
	 * @see {@link EmbedBuilder#title}
	 */
	url(url: string) {
		this.embed.url = url;
		return this;
	}

	/**
	 * Sets the timestamp of the embed.
	 * @param timestamp The timestamp of the embed.
	 */
	timestamp(timestamp: string) {
		this.embed.timestamp = timestamp;
		return this;
	}

	/**
	 * Sets the color of the embed.
	 * @param color The color of the embed.
	 * @remarks
	 * This is a decimal number representing the hexadecimal color code.
	 */
	color(color: number) {
		this.embed.color = color;
		return this;
	}

	/**
	 * Sets the footer of the embed.
	 * @param footer The footer of the embed.
	 */
	footer(footer: APIEmbedFooter) {
		this.embed.footer = footer;
		return this;
	}

	/**
	 * Sets the image of the embed.
	 * @param url The URL of the image.
	 */
	image(url: string) {
		this.embed.image = { url };
		return this;
	}

	/**
	 * Sets the thumbnail of the embed.
	 * @param url The URL of the thumbnail.
	 */
	thumbnail(url: string) {
		this.embed.thumbnail = { url };
		return this;
	}

	/**
	 * Sets the author of the embed.
	 * @param author The author of the embed.
	 */
	author(author: APIEmbedAuthor) {
		this.embed.author = author;
		return this;
	}

	/**
	 * Adds a field to the embed.
	 * @param embed The field to add.
	 * You can call this method multiple times to add multiple fields.
	 */
	field(name: string, value: string, inline?: boolean) {
		if (!this.embed.fields) {
			this.embed.fields = [];
		}
		this.embed.fields.push({ name, value, inline });
		return this;
	}
}
