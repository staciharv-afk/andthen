// Shared identity check for the operator-only endpoints (admin-memorials.js,
// admin-analytics.js) — see admin-memorials.js's header comment for why
// these specifically verify the caller rather than trusting the client like
// every other api/*.js file in this app does. Extracted here once both
// needed the exact same check, so it can't drift between them.
//
// Returns the verified user on success, or writes an error response and
// returns null on failure — callers just need to `if (!user) return;`.
export async function requireAdmin(req, res, admin) {
  const { ADMIN_EMAIL } = process.env;
  if (!ADMIN_EMAIL) {
    res.status(500).json({ error: "Admin view is not configured on the server." });
    return null;
  }

  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    res.status(401).json({ error: "Not signed in." });
    return null;
  }

  const { data: userData, error: userErr } = await admin.auth.getUser(token);
  if (userErr || !userData?.user) {
    res.status(401).json({ error: "Invalid session." });
    return null;
  }
  if ((userData.user.email || "").toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
    res.status(403).json({ error: "Not authorized." });
    return null;
  }

  return userData.user;
}
