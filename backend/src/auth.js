import * as jose from "jose";
import NodeCache from "node-cache";

const appCache = new NodeCache({
  stdTTL: 1800, // data validity for 30 minutes
  checkperiod: 1860, // checking for expired data and clear it from storage after 31 minutes
});
const JWKS_CACHE = "JWKS";

const fetchJWKS = async () => {
  let json = "";
  if (appCache.has(JWKS_CACHE)) {
    json = appCache.get(JWKS_CACHE);
  } else {
    const resp = await fetch(process.env.JWK_URL);
    json = await resp.json();
    appCache.set(JWKS_CACHE, json);
  }

  return jose.createLocalJWKSet(json);
};

const getTokenFromHeader = (req) => {
  if (!req.headers || !req.headers.authorization) {
    return;
  }

  const match = req.headers.authorization.match(/^Bearer (.+)$/);
  if (!match) {
    return;
  }

  return match[1];
};

const verifyJwt = async (jwt) => {
  const JWK = await fetchJWKS();
  const { payload } = await jose.jwtVerify(jwt, JWK);
  return payload;
};

export const authWithToken = async (req, res, next) => {
  try {
    const ocIdToken = getTokenFromHeader(req);
    if (!ocIdToken) {
      throw new Error("auth token is missing");
    }
    const payload = await verifyJwt(ocIdToken);
    if (payload.aud !== process.env.AUTH_CLIENT_ID) {
      throw new Error("auth token is not valid");
    }
    req.authenticatedUser = payload.edu_username;
    req.idToken = ocIdToken;
    req.tokenPayload = payload;
    next();
  } catch (error) {
    next(error);
  }
};
