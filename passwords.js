const
{
    randomBytes, scrypt, timingSafeEqual
}
= require("node:crypto");
const
{
    promisify
}
= require("node:util");
const deriveKey = promisify(scrypt);

// Each password gets its own random salt before hashing.
async function hashPassword(password)
{
    const salt = randomBytes(16).toString("hex");
    const hash = await deriveKey(password, salt, 64);
    return salt + ":" + hash.toString("hex");
}

// Hash the entered password with the saved salt and compare the results.
async function checkPassword(password, stored)
{
    const [salt, hash] = stored.split(":");
    if (!salt || !hash) return false;
    const actual = await deriveKey(password, salt, 64);
    const expected = Buffer.from(hash, "hex");
    return actual.length === expected.length && timingSafeEqual(actual, expected);
}

module.exports =
{
    hashPassword, checkPassword
};
