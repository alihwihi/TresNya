// Native tokens have a separate prefix and never travel in browser cookies.
function tokenFrom(req) {
  if (req.headers.authorization !== undefined)
    return (
      /^Bearer (tn_[A-Za-z0-9_-]{43})$/.exec(req.headers.authorization)?.[1] ||
      ""
    );
  const token =
    /(?:^|;\s*)tresnya_session=([A-Za-z0-9_-]+)/.exec(
      req.headers.cookie || "",
    )?.[1] || "";
  return token.startsWith("tn_") ? "" : token;
}
module.exports = { tokenFrom };
