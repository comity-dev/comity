import { logger } from './logging';
import {
    ApplicationCommandBase,
    FetchedApplicationCommand,
    Guild,
    Interaction,
    InteractionCallbackData,
    User,
} from 'discord-typings';
import { SnowTransfer } from 'snowtransfer';

export type InteractionCallback = (inter: Interaction) => any;

export class Client extends SnowTransfer {
    publicKey: string;
    private commandRegistry: Map<
        string | undefined,
        [ApplicationCommandBase, InteractionCallback][]
    > = new Map();

    constructor(
        token: string,
        publicKey: string,
        guildIds?: string[] | undefined,
    ) {
        super(token);

        this.publicKey = publicKey;
    }

    processInteraction(interaction: Interaction) {
        logger.info(`Received interaction ${interaction.id}`);

        if (interaction.type === 2) {
            const data = interaction.data!;
            const { name, guild_id } = data;

            const callback = this.commandRegistry
                .get(guild_id)
                ?.find(([command]) => command.name === name)?.[1];

            if (callback) {
                callback(interaction);
            }
        }
    }

    async deployCommands() {
        const me = await this.user.getSelf();
        const globalCommands = this.commandRegistry.get(undefined);

        if (globalCommands) {
            const commands = await this.interaction.getApplicationCommands(
                me.id,
            );
            const toDelete = commands.filter(
                (command) =>
                    !globalCommands.find((c) => c[0].name === command.name),
            );
            logger.info(`Deleting ${toDelete.length} global commands`);

            await Promise.all(
                toDelete.map(async (command) => {
                    await this.interaction.deleteApplicationCommand(
                        me.id,
                        command.id,
                    );
                    logger.info(`Deleted global command ${command.name}`);
                }),
            );

            await this.interaction
                .bulkOverwriteApplicationCommands(
                    me.id,
                    globalCommands.map((c) => c[0]),
                )
                .then(() =>
                    logger.info(
                        `Created ${globalCommands.length} global commands`,
                    ),
                );
        }

        const guilds = await this.user.getGuilds();

        for (const guild of guilds) {
            await this.deleteGuildCommands(guild, me);

            await Promise.all(
                Object.entries(this.commandRegistry).map(
                    async ([guildId, commands]: [
                        string | undefined,
                        ApplicationCommandBase[],
                    ]) => {
                        if (guildId) {
                            await this.interaction.bulkOverwriteGuildApplicationCommands(
                                me.id,
                                guildId,
                                commands,
                            );
                        }
                    },
                ),
            );
        }
        logger.info('All commands created!');
    }

    private _addCommand(
        data: ApplicationCommandBase,
        callback: InteractionCallback,
        guild?: string | undefined,
    ) {
        let result = this.commandRegistry.get(guild);
        if (!result) {
            result = [];
            this.commandRegistry.set(guild, result);
        }
        result.push([data, callback]);
    }

    addGlobalCommand(
        data: ApplicationCommandBase,
        callback: InteractionCallback,
    ) {
        this._addCommand(data, callback);
    }

    addGuildCommand(
        data: ApplicationCommandBase & { guild_id: string },
        callback: InteractionCallback,
    ) {
        this._addCommand(data, callback, data.guild_id);
    }

    async respond(interaction: Interaction, data: InteractionCallbackData) {
        await this.interaction.createInteractionResponse(
            interaction.id,
            interaction.token,
            {
                type: 4,
                data,
            },
        );
    }

    private async deleteGuildCommands(guild: Guild, me: User) {
        const guildCommands = this.commandRegistry.get(guild.id);
        const discordGuildCommands =
            await this.interaction.getGuildApplicationCommands(me.id, guild.id);
        let toDelete: FetchedApplicationCommand[] = discordGuildCommands;

        if (guildCommands) {
            const toDelete = discordGuildCommands.filter(
                (command) =>
                    !guildCommands.find((c) => c[0].name === command.name),
            );
            logger.info(
                `Deleting ${toDelete.length} guild commands from ${guild.id}`,
            );
            for (const command of toDelete) {
                await this.interaction.deleteGuildApplicationCommand(
                    me.id,
                    guild.id,
                    command.id,
                );
                logger.info(`Deleted command ${command.name} from ${guild.id}`);
            }
        }

        for (const deleteCommand of toDelete) {
            await this.interaction.deleteGuildApplicationCommand(
                me.id,
                guild.id,
                deleteCommand.id,
            );
            logger.info(
                `Deleted command ${deleteCommand.name} from ${guild.id}`,
            );
        }
    }
}
