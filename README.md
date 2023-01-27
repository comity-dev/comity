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

See the [examples](./examples) directory for examples of how to use Comity with different frameworks / platforms.