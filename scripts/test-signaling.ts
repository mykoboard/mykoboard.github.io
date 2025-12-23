/**
 * test-signaling.ts
 * 
 * Verifies that the AWS WebSocket Signaling server correctly validates the API key.
 * Usage: bun run scripts/test-signaling.ts [valid-token]
 */

const SIGNALING_URL = 'wss://pebsg4v5yk.execute-api.eu-central-1.amazonaws.com/production';

async function testConnection(label: string, url: string) {
    console.log(`\nTesting: ${label}`);
    console.log(`URL: ${url}`);

    return new Promise((resolve) => {
        const socket = new WebSocket(url);
        let completed = false;

        const timeout = setTimeout(() => {
            if (!completed) {
                completed = true;
                console.log("❌ Result: Timed out (Likely rejected by firewall/authorizer)");
                socket.close();
                resolve(false);
            }
        }, 5000);

        socket.onopen = () => {
            completed = true;
            clearTimeout(timeout);
            console.log("✅ Result: Connection Successful (Authorized)");
            socket.close();
            resolve(true);
        };

        socket.onerror = (error) => {
            if (!completed) {
                completed = true;
                clearTimeout(timeout);
                // In many WebSocket implementations, an auth failure returns 403, 
                // which results in an error event before closing.
                console.log("❌ Result: Connection Failed (Likely 401/403 Unauthorized)");
                resolve(false);
            }
        };

        socket.onclose = (event) => {
            if (!completed) {
                completed = true;
                clearTimeout(timeout);
                console.log(`❌ Result: Connection Closed (Code: ${event.code})`);
                resolve(false);
            }
        };
    });
}

async function runTests() {
    console.log("=== Signaling Server Auth Test ===");

    // 1. Test missing token
    await testConnection("Missing API Key", SIGNALING_URL);

    // 2. Test invalid token
    await testConnection("Invalid API Key", `${SIGNALING_URL}?x-api-key=invalid-dummy-token`);

    // 3. Test user provided token (if any)
    const userToken = process.argv[2];
    if (userToken) {
        await testConnection("Provided API Key", `${SIGNALING_URL}?x-api-key=${userToken}`);
    } else {
        console.log("\n(Tip: Run 'bun scripts/test-signaling.ts YOUR_TOKEN' to test with a real key)");
    }

    console.log("\nTests Complete.");
}

runTests();
