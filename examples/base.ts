import { Client } from 'comity';
import { InteractionCallbackData } from 'discord-typings';

export const client = new Client('token');

client.addGlobalCommand(
    {
        name: 'ping',
        description: 'Pong!',
        default_member_permissions: '0',
    },
    (interaction) => {
        return {
            type: 4,
            data: {
                content: 'Pong!',
            },
        } as InteractionCallbackData;
    },
);
