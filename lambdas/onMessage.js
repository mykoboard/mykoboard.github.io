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

    const { type, gameId, boardId, peerName, slots, answer, target, to } = body;

    try {
        // 1️⃣ Offer (Combined Slots)
        if (type === "offer") {
            await ddb.send(new PutItemCommand({
                TableName: TABLE_NAME,
                Item: {
                    connectionId: { S: connectionId },
                    gameId: { S: gameId || "default" },
                    boardId: { S: boardId || "default" },
                    peerName: { S: peerName || "unknown" },
                    status: { S: "waiting" },
                    slots: { S: JSON.stringify(slots || []) },
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
            }));

            await sendMessage(client, connectionId, { type: "offerList", offers });
            return { statusCode: 200 };
        }

        // 3️⃣ Answer (Standard)
        if (type === "answer") {
            await sendMessage(client, target, {
                type: "answer",
                from: connectionId,
                to: to,
                answer: answer,
                peerName: peerName
            });

            // We don't mark as "answered" yet because multiple guests might still join
            // unless all slots are full. For now, we keep it "waiting".
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