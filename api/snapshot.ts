import { route } from "./_lib/server";
import { snapshotFor } from "./_lib/snapshot";

export default route("GET", async (_req, uid) => ({ ok: true, snapshot: await snapshotFor(uid) }));
