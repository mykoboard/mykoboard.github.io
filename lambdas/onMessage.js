import {
    ApiGatewayManagementApiClient,
    PostToConnectionCommand,
} from "@aws-sdk/client-apigatewaymanagementapi";
import {
    DynamoDBClient,
    PutItemCommand,
    DeleteItemCommand,
    ScanCommand,
    UpdateItemCommand,
} from "@aws-sdk/client-dynamodb";

const ddb = new DynamoDBClient({});
const TABLE_NAME = "SignalingConnections";

export const handler = async (event) => {
    const domain = event.requestContext.domainName;
    const stage = event.requestContext.stage;
    const endpoint = `https://${domain}/${stage}`;
    const connectionId = event.requestContext.connectionId;
    const client = new ApiGatewayManagementApiClient({ endpoint });

    let body = {};
    try {
        body = JSON.parse(event.body || "{}");
    } catch (e) {
        return { statusCode: 400, body: "Invalid JSON" };
    }

    const { type, boardId, peerName, slots, answer, target, offer, publicKey } = body;

    try {
        // 1️⃣ Host Register: Initiator creates the session
        if (type === "hostRegister") {
            if (!boardId) return { statusCode: 400, body: "boardId required" };

            // Cleanup old sessions for this boardId
            const existingOffers = await ddb.send(new ScanCommand({
                TableName: TABLE_NAME,
                FilterExpression: "boardId = :bid",
                ExpressionAttributeValues: { ":bid": { S: boardId } }
            }));

            for (const item of existingOffers.Items || []) {
                await ddb.send(new DeleteItemCommand({
                    TableName: TABLE_NAME,
                    Key: { connectionId: { S: item.connectionId.S } }
                }));
            }

            await ddb.send(new PutItemCommand({
                TableName: TABLE_NAME,
                Item: {
                    connectionId: { S: connectionId },
                    gameId: { S: body.gameId || "default" },
                    boardId: { S: boardId },
                    peerName: { S: peerName || "Host" },
                    publicKey: { S: publicKey || "anonymous" },
                    status: { S: "waiting" },
                    slots: { S: JSON.stringify(slots || []) },
                    players: {
                        M: {
                            [publicKey]: {
                                M: {
                                    name: { S: peerName || "Host" },
                                    connectionId: { S: connectionId },
                                    role: { S: "Host" },
                                    timestamp: { N: Date.now().toString() }
                                }
                            }
                        }
                    },
                    timestamp: { N: Date.now().toString() }
                }
            }));

            return { statusCode: 200, body: "Host registered" };
        }

        // 2️⃣ Guest Join: Guest registers interest in a session
        if (type === "guestJoin") {
            if (!boardId || !publicKey) return { statusCode: 400, body: "boardId and publicKey required" };

            // Find the Host
            const hostResult = await ddb.send(new ScanCommand({
                TableName: TABLE_NAME,
                FilterExpression: "boardId = :bid AND attribute_exists(slots)",
                ExpressionAttributeValues: { ":bid": { S: boardId } }
            }));

            if (!hostResult.Items || hostResult.Items.length === 0) {
                await sendMessage(client, connectionId, {
                    type: "error",
                    code: "SESSION_NOT_FOUND",
                    message: "The game session was not found on the signaling server. The host might still be connecting."
                });
                return { statusCode: 200 };
            }

            // Sort hosts by latest timestamp first
            const hosts = hostResult.Items.sort((a, b) =>
                Number(b.timestamp?.N || 0) - Number(a.timestamp?.N || 0)
            );

            let joined = false;
            for (const hostItem of hosts) {
                const hostConnId = hostItem.connectionId.S;

                try {
                    // Update Guest in this Host's players map
                    await ddb.send(new UpdateItemCommand({
                        TableName: TABLE_NAME,
                        Key: { connectionId: { S: hostConnId } },
                        UpdateExpression: "SET players.#pk = :p",
                        ExpressionAttributeNames: { "#pk": publicKey },
                        ExpressionAttributeValues: {
                            ":p": {
                                M: {
                                    name: { S: peerName || "Guest" },
                                    connectionId: { S: connectionId },
                                    role: { S: "Guest" },
                                    encryptionPublicKey: { S: body.encryptionPublicKey || "" },
                                    timestamp: { N: Date.now().toString() }
                                }
                            }
                        }
                    }));

                    // Try to notify this host
                    console.log(`[guestJoin] Attempting to notify host ${hostConnId} for peer ${connectionId}`);
                    const notified = await sendMessage(client, hostConnId, {
                        type: "peerJoined",
                        from: connectionId,
                        peerName: peerName || "Guest",
                        publicKey: publicKey,
                        encryptionPublicKey: body.encryptionPublicKey
                    });

                    if (notified) {
                        console.log(`[guestJoin] Host ${hostConnId} notified successfully`);
                        joined = true;
                        break; // Success!
                    } else {
                        // Stale connection? Clean up the record
                        console.warn(`[guestJoin] Host ${hostConnId} unreachable, cleaning up stale record`);
                        await ddb.send(new DeleteItemCommand({
                            TableName: TABLE_NAME,
                            Key: { connectionId: { S: hostConnId } }
                        }));
                    }
                } catch (e) {
                    console.error(`[guestJoin] Failed with host candidate ${hostConnId}:`, e.message);
                }
            }

            if (!joined) {
                await sendMessage(client, connectionId, {
                    type: "error",
                    code: "HOST_UNREACHABLE",
                    message: "All matching host sessions are unreachable. The host may have disconnected or is in a network blind spot."
                });
            }

            return { statusCode: 200, body: joined ? "Joined" : "All candidates failed" };
        }

        // 3️⃣ Host Offer: Host sends specific offer to a Guest
        if (type === "hostOffer") {
            if (!target) return { statusCode: 400, body: "target connectionId required" };

            // Update Host's record to store the offer for this guest
            await ddb.send(new UpdateItemCommand({
                TableName: TABLE_NAME,
                Key: { connectionId: { S: connectionId } },
                UpdateExpression: "SET players.#pk.webRTCOffer = :offer",
                ExpressionAttributeNames: { "#pk": body.guestPublicKey },
                ExpressionAttributeValues: { ":offer": { S: JSON.stringify(offer || {}) } }
            }));

            // Forward to Guest
            await sendMessage(client, target, {
                type: "offer",
                from: connectionId,
                boardId,
                offer,
                peerName,
                encryptionPublicKey: body.encryptionPublicKey,
                iv: body.iv,
                publicKey
            });

            return { statusCode: 200 };
        }

        // 4️⃣ Guest Answer: Guest responds to Host offer
        if (type === "guestAnswer") {
            if (!target) return { statusCode: 400, body: "target connectionId required" };

            // Update Host's record to store the answer
            await ddb.send(new UpdateItemCommand({
                TableName: TABLE_NAME,
                Key: { connectionId: { S: target } },
                UpdateExpression: "SET players.#pk.webRTCAnswer = :answer, players.#pk.webRTCAnswerIv = :iv",
                ExpressionAttributeNames: { "#pk": publicKey },
                ExpressionAttributeValues: {
                    ":answer": { S: JSON.stringify(answer || {}) },
                    ":iv": { S: body.iv || "" }
                }
            }));

            // Forward to Host
            await sendMessage(client, target, {
                type: "answer",
                from: connectionId,
                answer,
                iv: body.iv,
                peerName,
                boardId,
                publicKey
            });

            return { statusCode: 200 };
        }


        // 6️⃣ Delete Session
        if (type === "deleteOffer") {
            await ddb.send(new DeleteItemCommand({
                TableName: TABLE_NAME,
                Key: { connectionId: { S: connectionId } }
            }));
            return { statusCode: 200 };
        }

        // 7️⃣ Heartbeat
        if (type === "ping" || body.action === "ping") {
            return { statusCode: 200, body: "pong" };
        }

        return { statusCode: 400, body: "Unknown action" };
    } catch (err) {
        console.error(err);
        return { statusCode: 500, body: JSON.stringify(err) };
    }
};

async function sendMessage(client, connectionId, payload) {
    try {
        await client.send(new PostToConnectionCommand({
            ConnectionId: connectionId,
            Data: JSON.stringify(payload)
        }));
        return true;
    } catch (err) {
        console.error(`[sendMessage] Failed to send to ${connectionId}:`, err.name, err.message);
        if (err.$metadata) {
            console.error(`Status Code: ${err.$metadata.httpStatusCode}, Request ID: ${err.$metadata.requestId}`);
        }
        return false;
    }
}