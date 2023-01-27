# Comity Examples

This directory contains examples of how to use Comity with different frameworks / platforms.

All examples are written in TypeScrip, implement interaction verification, and use the client/commands in [base.ts](./base.ts);

You first need to **deploy the application commands**: You can use the provided [deploy.ts](./deploy.ts) script with `ts-node-esm deploy.ts`.

Make sure to replace `'token'` with your bot token in [base.ts](./base.ts) and `'publicKey'` with your application's public key in your framework's example.


## Frameworks

[Express](./express.ts)

[Cloudflare Workers](./workers.ts)

