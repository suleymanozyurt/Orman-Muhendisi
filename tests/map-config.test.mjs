import test from "node:test";
import assert from "node:assert/strict";
import {POST} from "../app/api/map-config/route.ts";
test("Google map settings cannot be written anonymously or by another user",async()=>{
 assert.equal((await POST(new Request("https://example.org/api/map-config",{method:"POST"}))).status,401);
 assert.equal((await POST(new Request("https://example.org/api/map-config",{method:"POST",headers:{"oai-authenticated-user-id":"other","oai-authenticated-user-email":"other@example.org"}}))).status,403);
});
