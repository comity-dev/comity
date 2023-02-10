// Only used for routes
import { SlashCommandBuilder } from './builders.js';
import {
    ObjectOption,
    OptionTypes,
    OptionWithValue,
    commandOptionHasValue,
    commandOptionIsObject,
} from './options.js';
import {
    APPLICATION_COMMANDS,
    GUILD_APPLICATION_COMMANDS,
    USER,
} from '@biscuitland/api-types';
import { DefaultRestAdapter } from '@biscuitland/rest';
// Provides more complete types than @biscuitland/api-types
import {
    ApplicationCommandBase,
    FetchedApplicationCommand,
    Guild,
    Interaction,
    InteractionData,
    InteractionResponse,
    Member,
    User,
} from 'discord-typings';

export type InteractionCallback = (
    inter: Interaction,
    ...options: any[]
) => Promise<InteractionResponse> | InteractionResponse;

function getMemberOrUserFromInteraction(
    data: InteractionData,
    option: ObjectOption<6 | 7 | 8 | 9>,
): User | Member {
    const user = data.resolved?.users?.[option.value]!;
    const maybeMember = data.resolved?.members?.[option.value];

    if (maybeMember) {
        return Object.assign(user, maybeMember);
    }
    return user;
}

/**
 * A client for interacting with Discord's API and handling interactions
 */
export class Client extends DefaultRestAdapter {
    private commandRegistry: Map<
        string | undefined,
        [SlashCommandBuilder, InteractionCallback][]
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
    ): Promise<InteractionResponse> {
        console.log(
            `Received interaction ${interaction.id} of type ${interaction.type}`,
        );

        let response: InteractionResponse | undefined;
        if (interaction.type === 2) {
            const data = interaction.data!;
            const { name, guild_id } = data;

            const callback = this.commandRegistry
                .get(guild_id)
                ?.find(([command]) => command._command.name === name)?.[1];

            if (callback) {
                const options =
                    data.options?.map((option) => {
                        if (commandOptionHasValue(option)) {
                            return (option as OptionWithValue).value;
                        } else if (
                            commandOptionIsObject(OptionTypes.USER, option)
                        ) {
                            getMemberOrUserFromInteraction(data, option);
                        } else if (
                            commandOptionIsObject(OptionTypes.CHANNEL, option)
                        ) {
                            return data.resolved?.channels?.[option.value]!;
                        } else if (
                            commandOptionIsObject(OptionTypes.ROLE, option)
                        ) {
                            return data.resolved?.roles?.[option.value]!;
                        } else if (
                            commandOptionIsObject(
                                OptionTypes.MENTIONABLE,
                                option,
                            )
                        ) {
                            return (
                                getMemberOrUserFromInteraction(data, option) ||
                                data.resolved?.roles?.[option.value]
                            );
                        } else if (
                            commandOptionIsObject(
                                OptionTypes.ATTACHMENT,
                                option,
                            )
                        ) {
                            return data.resolved?.attachments?.[option.value]!;
                        }
                    }) || [];
                response = await callback(
                    interaction as Interaction,
                    ...options,
                );
            }
        } else if (interaction.type === 4) {
            const focusedOption = interaction.data?.options?.find(
                (option) => option.focused,
            );

            if (!focusedOption) {
                throw new Error('No focused option found');
            }

            const builder = this.commandRegistry
                .get(interaction.data?.guild_id)
                ?.find(
                    ([command]) =>
                        command._command.name === interaction.data?.name,
                )?.[0];

            const choices = await builder?._autocompletes.get(
                focusedOption.name,
            )?.(interaction, (focusedOption as OptionWithValue).value);

            if (!choices) {
                throw new Error('No choices found');
            }
            return {
                type: 8,
                data: {
                    choices: choices.map((choice) => ({
                        name: choice,
                        value: choice,
                    })),
                },
            };
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
                    !globalCommands.find(
                        (c) => c[0]._command.name === command.name,
                    ),
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
                globalCommands.map((c) => c[0]._command),
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
                        SlashCommandBuilder[],
                    ]) => {
                        if (guildId) {
                            await this.put(
                                APPLICATION_COMMANDS(me.id, guildId),
                                commands.map((c) => c._command),
                            );
                        }
                    },
                ),
            );
        }
        console.log('All commands created!');
    }

    /**
     * Registers a slash command
     * @param builder The builder for the slash command
     * @example
     * client.addCommand(new SlashCommandBuilder()
     *     .name('ping')
     *     .description('Pong!')
     *     .handler((inter) => {
     *         return {
     *             type: 4,
     *             data: {
     *                 content: 'Pong!',
     *             },
     *         };
     *    }),
     * );
     */
    addCommand(builder: SlashCommandBuilder): void {
        let result = this.commandRegistry.get(builder._guildId);
        if (!result) {
            result = [];
            this.commandRegistry.set(builder._guildId, result);
        }
        result.push([builder, builder._callback!]);
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
                    !guildCommands.find(
                        (c) => c[0]._command.name === command.name,
                    ),
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
