import { verify } from "crypto";

const token = 'pP73aWGxTz6rfx9TRIUWB8B729sQoaRk7FewcJcv';
const publicKeyHex = '3059301306072a8648ce3d020106082a8648ce3d03010703420004aeb36205a3b22993f2d9b705a0ace2eb2e02d7c0420d5edf86a8efbff286660d74342d844332cd1a5092c608f996cf89ded5b6bc3614d2611e32ce5fa8081dea';
const signatureHex = '9b1f218855782c6bfd0bfd092946f1be14aafcc2bb8ba694df792af972899597418efb4b7899ad61f1ada949c339120eeaa81e94b1a781f828555874228466d7';

function verifySignature(data, signatureHex, publicKeyHex, dsaEncoding = undefined) {
    try {
        return verify(
            "sha256",
            Buffer.from(data),
            {
                key: Buffer.from(publicKeyHex, "hex"),
                format: "der",
                type: "spki",
                dsaEncoding: dsaEncoding
            },
            Buffer.from(signatureHex, "hex")
        );
    } catch (e) {
        console.error("Crypto verification failed:", e);
        return false;
    }
}

const challenge = `SIGN_IN:${token}`;
const challengeWithQuotes = JSON.stringify(challenge);

console.log("Testing with Original Code (No dsaEncoding, Plain challenge):");
console.log("Result:", verifySignature(challenge, signatureHex, publicKeyHex));

console.log("\nTesting with Plain challenge and dsaEncoding='ieee-p1363':");
console.log("Result:", verifySignature(challenge, signatureHex, publicKeyHex, 'ieee-p1363'));

console.log("\nTesting with Quoted challenge and dsaEncoding='ieee-p1363':");
console.log("Result:", verifySignature(challengeWithQuotes, signatureHex, publicKeyHex, 'ieee-p1363'));
