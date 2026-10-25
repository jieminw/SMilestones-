import { joinAnyInvite } from "../src/data/pairing";
import { db, route } from "./_lib/server";

export default route("POST", async (req, uid) => ({ ok: true, data: await joinAnyInvite(db(), uid, String(req.body?.code ?? "")) }));
