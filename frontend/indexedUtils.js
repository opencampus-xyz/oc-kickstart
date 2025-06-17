import dbService from './db/indexeddb/dbService.js';
import * as jose from 'jose';

// JWKS cache for 30 minutes (same as backend)
let jwksCache = null;
let jwksCacheTime = 0;
const JWKS_CACHE_TTL = 30 * 60 * 1000; // 30 minutes in milliseconds

const fetchJWKS = async () => {
    const now = Date.now();
    
    // Return cached JWKS if still valid
    if (jwksCache && (now - jwksCacheTime) < JWKS_CACHE_TTL) {
        return jwksCache;
    }
    
    try {
        const jwkUrl = process.env.NEXT_PUBLIC_JWK_URL;
        
        const response = await fetch(jwkUrl);
        if (!response.ok) {
            throw new Error(`Failed to fetch JWKS: ${response.status} ${response.statusText}`);
        }
        
        const json = await response.json();
        
        // Create JWKS and cache it
        jwksCache = jose.createLocalJWKSet(json);
        jwksCacheTime = now;
        
        return jwksCache;
    } catch (error) {
        console.error('Error fetching JWKS:', error);
        throw new Error(`Failed to fetch JWKS: ${error.message}`);
    }
};

const verifyJwt = async (jwt) => {
    try {
        if (!jwt || typeof jwt !== 'string') {
            throw new Error('Invalid JWT token format');
        }
        
        const JWK = await fetchJWKS();
        const { payload } = await jose.jwtVerify(jwt, JWK);
        
        // Additional validation
        if (!payload.edu_username) {
            throw new Error('JWT payload missing edu_username');
        }
        
        return payload;
    } catch (error) {
        console.error('JWT verification failed:', error);
        if (error.code === 'ERR_JWT_EXPIRED') {
            throw new Error('JWT token has expired');
        } else if (error.code === 'ERR_JWT_INVALID') {
            throw new Error('JWT token is invalid');
        } else if (error.code === 'ERR_JWT_SIGNATURE_VERIFICATION_FAILED') {
            throw new Error('JWT signature verification failed');
        } else {
            throw new Error(`JWT verification failed: ${error.message}`);
        }
    }
};

const getTokenFromAuthHeader = (authToken) => {
    if (!authToken) {
        throw new Error('Auth token is missing');
    }
    
    // Handle both "Bearer token" format and raw token
    const match = authToken.match(/^Bearer (.+)$/);
    return match ? match[1] : authToken;
};

export const fetchWithAuthToken = async (url, options = {}, authToken) => {
    try {
        await dbService.initPromise;

        // Extract token from auth header if needed
        const token = getTokenFromAuthHeader(authToken);
        
        // Verify JWT token (this replaces the unsafe base64 decoding)
        const tokenPayload = await verifyJwt(token);
        
        // Validate audience (same as backend)
        const expectedAudience = process.env.NEXT_PUBLIC_AUTH_CLIENT_ID;
        if (!expectedAudience) {
            throw new Error('NEXT_PUBLIC_AUTH_CLIENT_ID environment variable is not set');
        }
        if (tokenPayload.aud !== expectedAudience) {
            throw new Error(`Auth token audience is not valid. Expected: ${expectedAudience}, Got: ${tokenPayload.aud}`);
        }
        
        const ocId = tokenPayload.edu_username;
        if (!ocId) {
            throw new Error('Auth token is missing edu_username');
        }

        const [endpoint, queryString] = url.split('?');
        const queryParams = queryString ? Object.fromEntries(new URLSearchParams(queryString)) : {};
        const body = options.body ? JSON.parse(options.body) : {};

        let response;
        switch (endpoint) {
            case '/user':
                const user = await dbService.getUserByOCId(ocId);
                if (!user?.user) {
                    response = {
                        isAdmin: false,
                        isMasterAdmin: false,
                        isRegisteredUser: false,
                        user: null
                    };
                } else {
                    response = {
                        isAdmin: user.isAdmin,
                        isMasterAdmin: user.isMasterAdmin,
                        isRegisteredUser: user.isRegisteredUser,
                        user: user.user
                    };
                }
                break;

            case '/signup':
                const userData = {
                    name: body.name || '',
                    email: body.email || '',
                    oc_id: ocId,
                    profile: {},
                    signups: []
                };
                response = await dbService.createUser(userData);
                response = {
                    isAdmin: false,
                    isMasterAdmin: false,
                    isRegisteredUser: true,
                    user: response
                };
                break;

            case '/auth-user/update-username':
                response = await dbService.updateUsername(ocId, body.username);
                break;

            case '/auth-user/listings':
                const userForListings = await dbService.getUserByOCId(ocId);
                response = await dbService.getListings({
                    page: parseInt(queryParams.page) || 0,
                    pageSize: parseInt(queryParams.pageSize) || 10,
                    searchText: queryParams.searchTitle,
                    searchTags: queryParams.searchTags?.split(','),
                    searchStatus: queryParams.searchStatus,
                    includeUserSignups: true,
                    userId: userForListings?.user?.id
                });
                break;

            case '/auth-user/signup-for-listing': {
                const user = await dbService.getUserByOCId(ocId);
                if (!user?.user?.name) {
                    throw new Error("Missing username for signing up for listing");
                }
                await dbService.signupForListing(user.user.id, body.listingId);
                response = { message: "Signed up for listing successfully" };
                break;
            }

            case '/auth-user/sign-ups':
                const userForSignups = await dbService.getUserByOCId(ocId);
                response = await dbService.getUserSignups({
                    page: parseInt(queryParams.page) || 0,
                    pageSize: parseInt(queryParams.pageSize) || 10,
                    searchText: queryParams.searchText,
                    userId: userForSignups.id
                });
                break;

            case '/admin/listing/create':
                response = await dbService.createListing(body);
                break;

            case '/admin/listing/update':
                response = await dbService.updateListing(body.id, body);
                break;

            case '/admin/listing/publish':
                response = await dbService.updateListingStatus(body.id, 'active');
                break;

            case '/admin/listing/delete':
                response = await dbService.updateListingStatus(body.id, 'deleted');
                break;

            case '/admin/listing/signups/update-status':
                response = await dbService.updateSignupStatus(
                    body.userId,
                    body.listingId,
                    body.status
                );
                break;

            case '/admin/listing/signups/issue-oca':
                response = await dbService.createVCIssueJob(body.userId, body.listingId);
                break;

            case '/admin/tag':
                response = await dbService.createTag(body);
                break;

            case '/admin/add-tag':
                response = await dbService.addTagToListings(body.tag, body.listings);
                break;

            case '/admin/tags':
                response = await dbService.getTags();
                break;

            case '/tags':
            case '/public/tags': {
                const tagsResponse = await dbService.getTags();
                response = tagsResponse.data;
                break;
            }

            case '/admin/users': {
                const usersResponse = await dbService.getUsers({
                    page: parseInt(queryParams.page) || 0,
                    pageSize: parseInt(queryParams.pageSize) || 10,
                    searchText: queryParams.searchText
                });
                response = {
                    data: usersResponse.users,
                    total: usersResponse.total
                };
                break;
            }

            case '/admin/listings': {
                const listingsResponse = await dbService.getListings({
                    page: parseInt(queryParams.page) || 0,
                    pageSize: parseInt(queryParams.pageSize) || 10,
                    searchText: queryParams.searchText,
                    includeUserSignups: false,
                    showAllStatuses: true
                });
                response = {
                    data: listingsResponse.listings,
                    total: listingsResponse.total,
                };
                break;
            }

            case '/public/listings':
                response = await dbService.getListings({
                    page: parseInt(queryParams.page) || 0,
                    pageSize: parseInt(queryParams.pageSize) || 10,
                    searchText: queryParams.searchTitle,
                    searchTags: queryParams.searchTags?.split(','),
                    searchStatus: queryParams.searchStatus
                });
                break;

            case (endpoint.match(/^\/admin\/listing\/signups\/([^\/]+)$/) || {}).input: {
                const listingId = endpoint.split('/').pop();
                response = await dbService.getListingSignups(listingId);
                break;
            }

            case (endpoint.match(/^\/admin\/listing\/([^\/]+)$/) || {}).input: {
                const id = endpoint.split('/').pop();
                const listing = await dbService.getListingById(id);
                if (!listing) {
                    return {
                        ok: false,
                        json: async () => ({ error: { message: 'Listing not found' } })
                    };
                }
                response = listing;
                break;
            }
            case '/admin/tag/archive/:id':
                const tagId = url.split('/').pop();
                response = await dbService.archiveTag(tagId);
                break;

            case '/master-admin/admin-configs':
                if (options.method === 'POST') {
                    response = await dbService.adminConfig(body.adminOCIDs ? body.adminOCIDs.split(',') : []);
                } else {
                    response = await dbService.adminConfig();
                }
                break;

            case '/demo/set-master-admin':
                response = await dbService.setMasterAdmin(body.ocId);
                break;

            default:
                throw new Error(`Unsupported endpoint: ${endpoint}`);
        }

        return {
            ok: true,
            json: async () => response
        };
    } catch (error) {
        console.error('Error in fetchWithAuthToken:', error);
        return {
            ok: false,
            json: async () => ({ error: { message: error.message } })
        };
    }
};

export const publicFetch = async (url, options = {}) => {
    try {
        const [endpoint, queryString] = url.split('?');
        const queryParams = queryString ? Object.fromEntries(new URLSearchParams(queryString)) : {};
        const body = options.body ? JSON.parse(options.body) : {};

        let response;
        if (endpoint === '/achievements' || endpoint.startsWith('/achievements/')) {
            let ocid;
            if (endpoint === '/achievements' && queryParams.ocid) {
                ocid = queryParams.ocid;
            } else if (endpoint.startsWith('/achievements/')) {
                ocid = endpoint.split('/achievements/')[1];
            } else {
                throw new Error("OC ID is required for achievements");
            }
            response = await dbService.getAchievementsByOCId(ocid, {
                page: parseInt(queryParams.page) || 0,
                pageSize: parseInt(queryParams.pageSize) || 10
            });
        } else {
            switch (endpoint) {
                case '/listings':
                case '/public/listings':
                    response = await dbService.getListings({
                        page: parseInt(queryParams.page) || 0,
                        pageSize: parseInt(queryParams.pageSize) || 10,
                        searchText: queryParams.searchTitle,
                        searchTags: queryParams.searchTags?.split(','),
                        searchStatus: queryParams.searchStatus
                    });
                    break;

                case '/tags':
                case '/public/tags':
                    const tagsResponse = await dbService.getTags();
                    response = tagsResponse.data;
                    break;

                default:
                    throw new Error(`Unsupported public endpoint: ${endpoint}`);
            }
        }

        return {
            ok: true,
            json: async () => response
        };
    } catch (error) {
        console.error('Error in publicFetch:', error);
        return {
            ok: false,
            json: async () => ({ error: { message: error.message } })
        };
    }
};