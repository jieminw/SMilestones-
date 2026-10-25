import { randomUUID } from "node:crypto";
import { runForUser } from "../src/data/pairing";
import { db, route } from "./_lib/server";
import { snapshotFor } from "./_lib/snapshot";

export default route("POST", async (req, uid) => {
  const r = await runForUser(db(), uid, req.body?.cmd, randomUUID);
  return { ...r, snapshot: r.ok ? await snapshotFor(uid) : undefined };
});
