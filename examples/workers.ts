import { client } from "./base";
import { verifyKey } from "discord-interactions";


export default {
    async fetch(
        request: Request,
        _env: Record<string, string>,
        _ctx: any
    ) {
        const body = await request.text();
        const verified = verifyKey(
            body,
            request.headers.get("X-Signature-Ed25519")!,
            request.headers.get("X-Signature-Timestamp")!,
            "publicKey"
        );
        if (!verified) {
            return new Response("Invalid request signature", {
                status: 401,
            });
        }

        const data = JSON.parse(body);

        if (data.type === 1) {
            return new Response(JSON.stringify({ type: 1 }));
        }
        const resp = new Response(JSON.stringify(await client.processInteraction(data)));

        resp.headers.set("Content-Type", "application/json");

        return resp;
    },
};
