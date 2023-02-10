import { Client, SlashCommandBuilder } from 'comity';
import { InteractionCallbackData } from 'discord-typings';

export const client = new Client('token');

client.addCommand(
    new SlashCommandBuilder()
        .name('ping')
        .description('Pong!')
        .handler((inter) => {
            return {
                type: 4,
                data: {
                    content: 'Pong!',
                },
            } as InteractionCallbackData;
        }),
);
