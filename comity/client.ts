// Only used for routes
import { SlashCommandBuilder } from './builders.js';
import { DefaultRestAdapter } from '@biscuitland/rest';
import {
    APIChatInputApplicationCommandInteraction,
    APIApplicationCommandAutocompleteInteraction,
    APIChatInputApplicationCommandInteractionData as APIInteractionData,
    APIUser,
    APIApplicationCommand,
    APIGuild,
    APIInteractionResponse,
    ApplicationCommandOptionType,
    InteractionType,
    Routes,
} from 'discord-api-types/v10';

export type APIInteraction = APIChatInputApplicationCommandInteraction | APIApplicationCommandAutocompleteInteraction;

export type InteractionCallback = (
    inter: APIInteraction,
    ...options: any[]
) => Promise<APIInteractionResponse> | APIInteractionResponse;

function getMemberOrUserFromInteraction(
    data: APIInteractionData,
    option: { value: string },
): APIUser {
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
        interaction: APIInteraction,
    ): Promise<APIInteractionResponse> {
        console.log(
            `Received interaction ${interaction.id} of type ${interaction.type}`,
        );

        let response: APIInteractionResponse | undefined;
        if (interaction.type === 2) {
            const data = interaction.data!;
            const { name, guild_id } = data;

            const callback = this.commandRegistry
                .get(guild_id)
                ?.find(([command]) => command["command"].name === name)?.[1];

            if (callback) {
                const options =
                    data.options?.map((option) => {
                        switch (option.type) {
                            case ApplicationCommandOptionType.Integer:
                            case ApplicationCommandOptionType.Number:
                            case ApplicationCommandOptionType.String:
                            case ApplicationCommandOptionType.Boolean:
                                return option.value;
                            case ApplicationCommandOptionType.User:
                                return getMemberOrUserFromInteraction(
                                    data,
                                    option,
                                );
                            case ApplicationCommandOptionType.Channel:
                                return data.resolved?.channels?.[option.value]!;
                            case ApplicationCommandOptionType.Role:
                                return data.resolved?.roles?.[option.value]!;
                            case ApplicationCommandOptionType.Mentionable:
                                return (
                                    getMemberOrUserFromInteraction(
                                        data,
                                        option,
                                    ) || data.resolved?.roles?.[option.value]
                                );
                            case ApplicationCommandOptionType.Attachment:
                                return data.resolved?.attachments?.[
                                    option.value
                                ]!;
                            // default:
                            default:
                                throw new Error("Unhandled option type");


                        }
                    }) || [];
                response = await callback(
                    interaction as APIInteraction,
                    ...options,
                );
            }
        } else if (interaction.type === InteractionType.ApplicationCommandAutocomplete) {
            const focusedOption = interaction.data?.options?.find(
                // ts thinks we can get a sub command here, but we can't, so we safely cast
                (option) => (option as any).focused,
            );

            if (!focusedOption) {
                throw new Error('No focused option found');
            }

            const builder = this.commandRegistry
                .get(interaction.data?.guild_id)
                ?.find(
                    ([command]) =>
                        command["command"].name === interaction.data?.name,
                )?.[0];

            const choices = await builder?.["autocompletes"].get(
                focusedOption.name,
            )?.(interaction, (focusedOption as any).value);

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
        const me = await this.get<APIUser>(Routes.user('@me'));
        const globalCommands = this.commandRegistry.get(undefined);

        if (globalCommands) {
            const commands = await this.get<APIApplicationCommand[]>(
                Routes.applicationCommands(me.id),
            );
            const toDelete = commands.filter(
                (command) =>
                    !globalCommands.find(
                        (c) => c[0]["command"].name === command.name,
                    ),
            );
            console.log(`Deleting ${toDelete.length} global commands`);

            await Promise.all(
                toDelete.map(async (command) => {
                    await this.delete(Routes.applicationCommand(me.id, command.id));
                    console.log(`Deleted global command ${command.name}`);
                }),
            );

            await this.put(
                Routes.applicationCommands(me.id),
                globalCommands.map((c) => c[0]["command"]),
            );
            console.log('All global commands created!');
        }

        const guilds = await this.get<APIGuild[]>('/users/@me/guilds');

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
                                Routes.applicationCommand(me.id, guildId),
                                commands.map((c) => c["command"]),
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
        let result = this.commandRegistry.get(builder["guildId"]);
        if (!result) {
            result = [];
            this.commandRegistry.set(builder["guildId"], result);
        }
        result.push([builder, builder["callback"]!]);
    }

    private async deleteGuildCommands(guild: APIGuild, me: APIUser): Promise<void> {
        const guildCommands = this.commandRegistry.get(guild.id);
        const discordGuildCommands = await this.get<
            APIApplicationCommand[]
        >(Routes.applicationGuildCommands(me.id, guild.id));
        let toDelete: APIApplicationCommand[] = discordGuildCommands;

        if (guildCommands) {
            const toDelete = discordGuildCommands.filter(
                (command) =>
                    !guildCommands.find(
                        (c) => c[0]["command"].name === command.name,
                    ),
            );
            console.log(
                `Deleting ${toDelete.length} guild commands from ${guild.id}`,
            );
            for (const command of toDelete) {
                await this.delete(
                    Routes.applicationGuildCommand(me.id, guild.id, command.id),
                );
                console.log(`Deleted command ${command.name} from ${guild.id}`);
            }
        }

        for (const deleteCommand of toDelete) {
            await this.delete(
                Routes.applicationGuildCommand(me.id, guild.id, deleteCommand.id),
            );
            console.log(
                `Deleted command ${deleteCommand.name} from ${guild.id}`,
            );
        }
    }
}
