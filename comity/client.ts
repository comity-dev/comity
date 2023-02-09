// Only used for routes
import { OptionWithValue, commandOptionHasValue } from './options';
import {
    APPLICATION_COMMANDS,
    GUILD_APPLICATION_COMMANDS,
    USER,
} from '@biscuitland/api-types';
import { DefaultRestAdapter } from '@biscuitland/rest';
// Provides more complete types than @biscuitland/api-types
import {
    ApplicationCommandBase,
    ApplicationCommandOption,
    FetchedApplicationCommand,
    Guild,
    Interaction,
    InteractionCallbackData,
    User,
} from 'discord-typings';

export type InteractionCallback = (
    inter: Interaction,
    ...options: any[]
) => Promise<InteractionCallbackData> | InteractionCallbackData;

export class CommandController {
    private command: ApplicationCommandBase;

    constructor(command: ApplicationCommandBase) {
        this.command = command;
    }

    option(option: ApplicationCommandOption) {
        if (!this.command.options) this.command.options = [];
        this.command.options.push(option);
        return this;
    }
}

/**
 * A client for interacting with Discord's API and handling interactions
 */
export class Client extends DefaultRestAdapter {
    private commandRegistry: Map<
        string | undefined,
        [ApplicationCommandBase, InteractionCallback][]
    > = new Map();

    constructor(token: string) {
        super({
            token,
            version: 10,
        });
    }

    /**
     * Processes an interaction
     * @param interaction The interaction to process
     * @example
     * client.processInteraction(interaction);
     */
    async processInteraction(
        interaction: Interaction,
    ): Promise<InteractionCallbackData> {
        console.log(`Received interaction ${interaction.id}`);

        let response: InteractionCallbackData | undefined;
        if (interaction.type === 2) {
            const data = interaction.data!;
            const { name, guild_id } = data;

            const callback = this.commandRegistry
                .get(guild_id)
                ?.find(([command]) => command.name === name)?.[1];

            if (callback) {
                const options =
                    data.options
                        ?.filter<OptionWithValue>(commandOptionHasValue)
                        .map((option) => option.value) || [];

                response = await callback(
                    interaction as Interaction,
                    ...options,
                );
            }
        }
        if (response === undefined) {
            throw new Error('No response found');
        }
        return response;
    }

    /**
     * Deploys all commands to Discord. Will delete any commands that are not registered
     * @async
     * @example
     * await client.deployCommands();
     */
    async deployCommands(): Promise<void> {
        const me = await this.get<User>(USER('@me'));
        const globalCommands = this.commandRegistry.get(undefined);

        if (globalCommands) {
            const commands = await this.get<FetchedApplicationCommand[]>(
                APPLICATION_COMMANDS(me.id),
            );
            const toDelete = commands.filter(
                (command) =>
                    !globalCommands.find((c) => c[0].name === command.name),
            );
            console.log(`Deleting ${toDelete.length} global commands`);

            await Promise.all(
                toDelete.map(async (command) => {
                    await this.delete(APPLICATION_COMMANDS(me.id, command.id));
                    console.log(`Deleted global command ${command.name}`);
                }),
            );

            await this.put(
                APPLICATION_COMMANDS(me.id),
                globalCommands.map((c) => c[0]),
            );
            console.log('All global commands created!');
        }

        const guilds = await this.get<Guild[]>('/users/@me/guilds');

        for (const guild of guilds) {
            await this.deleteGuildCommands(guild, me);

            await Promise.all(
                Object.entries(this.commandRegistry).map(
                    async ([guildId, commands]: [
                        string | undefined,
                        ApplicationCommandBase[],
                    ]) => {
                        if (guildId) {
                            await this.put(
                                APPLICATION_COMMANDS(me.id, guildId),
                                commands,
                            );
                        }
                    },
                ),
            );
        }
        console.log('All commands created!');
    }

    private _addCommand(
        data: ApplicationCommandBase,
        callback: InteractionCallback,
        guild?: string | undefined,
    ): CommandController {
        let result = this.commandRegistry.get(guild);
        if (!result) {
            result = [];
            this.commandRegistry.set(guild, result);
        }
        result.push([data, callback]);

        return new CommandController(data);
    }

    /**
     * Adds a global command
     * @param data The data for the command
     * @param callback The callback to run when the command is invoked
     * @example
     * client.addGlobalCommand(
     *     {
     *         name: 'ping',
     *         description: 'Pong!',
     *         default_member_permissions: '0',
     *     },
     *     (interaction) => {
     *         return {
     *             type: 4,
     *             data: {
     *                 content: 'Pong!',
     *             },
     *         };
     *     },
     * );
     */
    addGlobalCommand(
        data: ApplicationCommandBase,
        callback: InteractionCallback,
    ): CommandController {
        return this._addCommand(data, callback);
    }

    /**
     * Adds a guild command
     * @param data The data for the command
     * @param callback The callback to run when the command is invoked
     * @example
     * client.addGuildCommand(
     *    {
     *       name: 'ping',
     *       description: 'Pong!',
     *       default_member_permissions: '0',
     *       guild_id: '1234567890',
     *   },
     *   (interaction) => {
     *      return {
     *             type: 4,
     *             data: {
     *                 content: 'Pong!',
     *             },
     *         };
     *     },
     * });
     */
    addGuildCommand(
        data: ApplicationCommandBase & { guild_id: string },
        callback: InteractionCallback,
    ): CommandController {
        return this._addCommand(data, callback, data.guild_id);
    }

    private async deleteGuildCommands(guild: Guild, me: User): Promise<void> {
        const guildCommands = this.commandRegistry.get(guild.id);
        const discordGuildCommands = await this.get<
            FetchedApplicationCommand[]
        >(GUILD_APPLICATION_COMMANDS(me.id, guild.id));
        let toDelete: FetchedApplicationCommand[] = discordGuildCommands;

        if (guildCommands) {
            const toDelete = discordGuildCommands.filter(
                (command) =>
                    !guildCommands.find((c) => c[0].name === command.name),
            );
            console.log(
                `Deleting ${toDelete.length} guild commands from ${guild.id}`,
            );
            for (const command of toDelete) {
                await this.delete(
                    GUILD_APPLICATION_COMMANDS(me.id, guild.id, command.id),
                );
                console.log(`Deleted command ${command.name} from ${guild.id}`);
            }
        }

        for (const deleteCommand of toDelete) {
            await this.delete(
                GUILD_APPLICATION_COMMANDS(me.id, guild.id, deleteCommand.id),
            );
            console.log(
                `Deleted command ${deleteCommand.name} from ${guild.id}`,
            );
        }
    }
}
