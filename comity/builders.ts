import { InteractionCallback } from './client.js';
import { OptionTypes } from './options.js';
import {
    ApplicationCommandBase,
    ApplicationCommandOption,
} from 'discord-typings';

export type ValueOf<T> = T[keyof T];

/**
 * A builder for slash command options
 * @remarks
 * Not meant to be constructed directly
 * @internal
 */
export class OptionBuilder {
    option: Partial<ApplicationCommandOption> = {};

    /**
     * Set the name of the option
     * @param name The name of the option
     * @remarks
     * Must be between 1 and 32 characters long
     * Must be unique within the command
     */
    name(name: string) {
        this.option.name = name;
        return this;
    }

    /**
     * Set the description of the option
     * @param description The description of the option
     * @remarks
     * Must be between 1 and 100 characters long
     */
    description(description: string) {
        this.option.description = description;
        return this;
    }

    /**
     * Set whether the option is required
     * @param required Whether the option is required
     */
    required(required: boolean) {
        this.option.required = required;
        return this;
    }

    /**
     * Set the type of the option
     * @param type The type of the option
     * @remarks
     * Must be one of the values in {@link OptionTypes}
     * @see {@link OptionTypes}
     * @see {@link https://discord.dev/interactions/application-commands#application-command-object-application-command-option-type}
     */
    type(type: ValueOf<typeof OptionTypes>) {
        this.option.type = type;
        return this;
    }
}

/**
 * A builder for slash commands
 */
export class SlashCommandBuilder {
    command: Partial<ApplicationCommandBase> = {
        type: 1,
    };
    guildId?: string;
    callback?: InteractionCallback;

    /**
     * Set the name of the command
     * @param name The name of the command
     * @remarks
     * Must be between 1 and 32 characters long
     */
    name(name: string) {
        this.command.name = name;
        return this;
    }

    /**
     * Set the description of the command
     * @param description The description of the command
     * @remarks
     * Must be between 1 and 100 characters long
     */
    description(description: string) {
        this.command.description = description;
        return this;
    }

    /**
     * Set the default member permissions for the command
     * @param permissions The permissions to set
     */
    defaultMemberPermissions(permissions: string) {
        this.command.default_member_permissions = permissions;
        return this;
    }

    /**
     * Whether the command is available in DMs with the application
     * @param allowed Whether the command is allowed in DMs
     * @remarks
     * This is only for globally-scoped commands
     */
    dmPermission(allowed: boolean) {
        this.command.dm_permission = allowed;
        return this;
    }

    /**
     * Adds an option to the command
     * @param option The option to add
     */
    option(callback: (builder: OptionBuilder) => OptionBuilder) {
        const builder = new OptionBuilder();
        const option = callback(builder).option;
        if (!this.command.options) this.command.options = [];
        this.command.options.push(option as ApplicationCommandOption);
        return this;
    }

    /**
     * Sets the command to be guild-specific
     * @param guildId The ID of the guild
     */
    guild(guildId: string) {
        this.guildId = guildId;
        return this;
    }

    /**
     * Sets the command to be global
     * @remarks
     * This is the default (overrides {@link SlashCommandBuilder#guild})
     */
    global() {
        this.guildId = undefined;
        return this;
    }

    /**
     * Add a handler for the command
     * @param callback The callback to run when the command is invoked
     */
    handler(callback: InteractionCallback) {
        this.callback = callback;
        return this;
    }
}
