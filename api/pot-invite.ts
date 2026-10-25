import { createPotInvite } from "../src/data/pairing";
import { db, route } from "./_lib/server";

export default route("POST", async (req, uid) => ({ ok: true, data: await createPotInvite(db(), uid, String(req.body?.potId ?? ""), String(req.body?.label ?? "")) }));
