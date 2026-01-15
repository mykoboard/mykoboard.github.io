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

    const { type, gameId, boardId, peerName, slots, answer, target, to, publicKey } = body;

    try {
        // 1️⃣ Offer (Combined Slots)
        if (type === "offer") {
            let existingParticipants = [];

            // Adjust tracking: prevent duplicated sessions for same boardId
            if (boardId) {
                const existingOffers = await ddb.send(new ScanCommand({
                    TableName: TABLE_NAME,
                    FilterExpression: "boardId = :bid AND #status = :waiting",
                    ExpressionAttributeNames: { "#status": "status" },
                    ExpressionAttributeValues: {
                        ":bid": { S: boardId },
                        ":waiting": { S: "waiting" }
                    }
                }));

                for (const item of existingOffers.Items || []) {
                    // Preserve existing participants from the old entry
                    if (item.participants?.L && item.participants.L.length > 0) {
                        existingParticipants = item.participants.L;
                    }

                    if (item.connectionId.S !== connectionId) {
                        await ddb.send(new DeleteItemCommand({
                            TableName: TABLE_NAME,
                            Key: { connectionId: { S: item.connectionId.S } }
                        }));
                    }
                }
            }

            await ddb.send(new PutItemCommand({
                TableName: TABLE_NAME,
                Item: {
                    connectionId: { S: connectionId },
                    gameId: { S: gameId || "default" },
                    boardId: { S: boardId || "default" },
                    peerName: { S: peerName || "unknown" },
                    publicKey: { S: publicKey || "anonymous" },
                    status: { S: "waiting" },
                    slots: { S: JSON.stringify(slots || []) },
                    participants: { L: existingParticipants }, // Carry over participants
                    timestamp: { N: Date.now().toString() }
                }
            }));

            return { statusCode: 200, body: "Offer stored" };
        }

        // 2️⃣ List offers filtered by Game ID
        if (type === "listOffers") {
            const result = await ddb.send(new ScanCommand({
                TableName: TABLE_NAME,
                FilterExpression: "gameId = :gid AND attribute_exists(slots) AND #status = :waiting",
                ExpressionAttributeNames: { "#status": "status" },
                ExpressionAttributeValues: {
                    ":gid": { S: gameId || "default" },
                    ":waiting": { S: "waiting" }
                }
            }));

            const offers = result.Items.map(item => ({
                connectionId: item.connectionId.S,
                peerName: item.peerName?.S,
                gameId: item.gameId?.S,
                boardId: item.boardId?.S,
                slots: JSON.parse(item.slots.S),
                participants: item.participants?.L?.map(p => ({
                    connectionId: p.M.connectionId?.S,
                    peerName: p.M.peerName?.S,
                    publicKey: p.M.publicKey?.S
                })) || []
            }));

            await sendMessage(client, connectionId, { type: "offerList", offers });
            return { statusCode: 200 };
        }

        // 3️⃣ Answer (Standard)
        if (type === "answer") {
            // Check if user is already in this game (duplicate join prevention)
            if (publicKey && publicKey !== "anonymous" && boardId) {
                const existing = await ddb.send(new ScanCommand({
                    TableName: TABLE_NAME,
                    FilterExpression: "boardId = :bid",
                    ExpressionAttributeValues: {
                        ":bid": { S: boardId }
                    }
                }));

                // More refined check since Scan filter on List of Maps is tricky
                const isDuplicate = existing.Items?.some(item => {
                    // Check if host has this identity
                    if (item.publicKey?.S === publicKey && item.connectionId?.S !== connectionId) return true;
                    // Check if any existing participant has this identity
                    const parts = item.participants?.L || [];
                    return parts.some(p => p.M?.publicKey?.S === publicKey && p.M?.connectionId?.S !== connectionId);
                });

                if (isDuplicate) {
                    await sendMessage(client, connectionId, {
                        type: "error",
                        code: "DUPLICATE_IDENTITY",
                        message: "Identity already active in this session."
                    });
                    return { statusCode: 200, body: "Duplicate blocked" };
                }
            }

            // Update host's offer entry with new participant
            // We use target (host's connection ID) to update the row
            if (target) {
                try {
                    await ddb.send(new UpdateItemCommand({
                        TableName: TABLE_NAME,
                        Key: { connectionId: { S: target } },
                        UpdateExpression: "SET participants = list_append(if_not_exists(participants, :empty_list), :new_participant)",
                        ExpressionAttributeValues: {
                            ":new_participant": {
                                L: [{
                                    M: {
                                        connectionId: { S: connectionId },
                                        peerName: { S: peerName || "unknown" },
                                        publicKey: { S: publicKey || "anonymous" },
                                        timestamp: { N: Date.now().toString() }
                                    }
                                }]
                            },
                            ":empty_list": { L: [] }
                        },
                        // Ensure we only update rows that are actually offers
                        ConditionExpression: "attribute_exists(slots)"
                    }));
                } catch (updateErr) {
                    console.error("UpdateItem failed:", updateErr);
                    // If target doesn't exist or is not an offer, we still want to forward the message
                    // but the tracking is lost. We continue to avoid breaking the P2P connection.
                }

                await sendMessage(client, target, {
                    type: "answer",
                    from: connectionId,
                    to: to,
                    answer: answer,
                    peerName: peerName,
                    boardId: boardId,
                    publicKey: publicKey
                });
            }

            return { statusCode: 200 };
        }

        // 4️⃣ Delete Offer
        if (type === "deleteOffer") {
            await ddb.send(new DeleteItemCommand({
                TableName: TABLE_NAME,
                Key: { connectionId: { S: connectionId } }
            }));
            return { statusCode: 200 };
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
    } catch (err) {
        console.error("Failed to send:", err);
    }
}