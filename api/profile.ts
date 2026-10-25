import { updateProfile } from "../src/data/pairing";
import { db, route } from "./_lib/server";

export default route("POST", async (req, uid) => {
  await updateProfile(db(), uid, req.body ?? {});
  return { ok: true };
});
