# Comity

A powerful framework for building bots on [Discord's Interactions API](https://discord.com/developers/docs/interactions/).

Comity doesn't make any assumptions about your web server, database, or other dependencies.

You can use Comity with any web server, for example [Express](https://expressjs.com/), [Fastify](https://www.fastify.io/), or [Koa](https://koajs.com/). Comity can also be used on serverless platforms like [Cloudflare Workers](https://workers.cloudflare.com/) or [Vercel](https://vercel.com/).

> **Note**
> Comity does not verify the authenticity of requests to your endpoint.
> To verify the requests, you can use [discord-interactions](https://npmjs.com/package/discord-interactions) or [@discord-interactions/verify](https://npmjs.com/package/@discord-interactions/verify).

## Installation

```sh
npm install comity
yarn add comity
```

## Usage

```ts
import { Client } from 'comity';

const client = new Client('token', 'publicKey');

client.addGlobalCommand(
    {
        name: 'ping',
        description: 'Pong!',
        default_member_permissions: '0',
    },
    async (interaction) => {
        await client.respond(interaction, {
            content: 'Pong!',
        });
    },
);

await client.deployCommands();
```

### Express

```ts
...
import { verifyKeyMiddleware } from "discord-interactions"

app.post('/interactions', verifyKeyMiddleware(client.publicKey), (req, res) => {
    client.processInteraction(req.body);
    res.sendStatus(200);
});

app.listen(3000, () => {
    console.log('Listening on port 3000');
});
```

```

```
