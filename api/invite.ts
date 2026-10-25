import { createInvite } from "../src/data/pairing";
import { db, route } from "./_lib/server";

export default route("POST", async (_req, uid) => ({ ok: true, data: await createInvite(db(), uid) }));
