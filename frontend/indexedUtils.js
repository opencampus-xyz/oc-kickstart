import dbService from './db/indexeddb/dbService.js';

export const fetchWithAuthToken = async (url, options = {}, authToken) => {
    try {
        await dbService.initPromise;

        const tokenPayload = JSON.parse(atob(authToken.split('.')[1]));
        const ocId = tokenPayload.edu_username;

        const [endpoint, queryString] = url.split('?');
        const queryParams = queryString ? Object.fromEntries(new URLSearchParams(queryString)) : {};
        const body = options.body ? JSON.parse(options.body) : {};

        let response;
        switch (endpoint) {
            case '/user':
                response = await dbService.getUserByOCId(ocId);
                break;

            case '/auth-user/update-username':
                response = await dbService.updateUsername(ocId, body.username);
                break;

            case '/auth-user/listings':
                response = await dbService.getListings({
                    page: parseInt(queryParams.page) || 0,
                    pageSize: parseInt(queryParams.pageSize) || 10,
                    searchText: queryParams.searchTitle,
                    searchTags: queryParams.searchTags?.split(','),
                    searchStatus: queryParams.searchStatus,
                    includeUserSignups: true,
                    userId: ocId
                });
                break;

            case '/auth-user/signup-for-listing':
                const user = await dbService.getUserByOCId(ocId);
                response = await dbService.signupForListing(user.id, body.listingId);
                break;

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

            case '/admin/tag':
                response = await dbService.createTag(body);
                break;

            case '/admin/add-tag':
                response = await dbService.addTagToListings(body.tag, body.listings);
                break;

            case '/admin/tags':
                response = await dbService.getTags();
                break;

            case '/admin/listing/:id':
                response = await dbService.getListingById(queryParams.id);
                break;

            case '/master-admin/admin-configs':
                if (options.method === 'GET') {
                    const adminConfig = await dbService.getAdminConfig();
                    response = adminConfig;
                } else if (options.method === 'POST') {
                    response = await dbService.updateAdminConfig(body.adminOCIDs.split(','));
                }
                break;

            case '/signup':
                response = await dbService.createUser(body);
                break;

            case '/admin/tag/archive/:id':
                const tagId = url.split('/').pop();
                response = await dbService.archiveTag(tagId);
                break;

            case '/admin/listing/signups/:listingId':
                const listingId = url.split('/').pop();
                response = await dbService.getListingSignups(listingId);
                break;

            case '/admin/listing/signups/issue-oca':
                response = await dbService.createVCIssueJob(body.userId, body.listingId);
                break;

            default:
                throw new Error(`Unsupported endpoint: ${endpoint}`);
        }

        return {
            ok: true,
            json: async () => response
        };
    } catch (error) {
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
        switch (endpoint) {
            case '/listings':
                response = await dbService.getListings({
                    page: parseInt(queryParams.page) || 0,
                    pageSize: parseInt(queryParams.pageSize) || 10,
                    searchText: queryParams.searchTitle,
                    searchTags: queryParams.searchTags?.split(','),
                    searchStatus: queryParams.searchStatus
                });
                break;

            case '/tags':
                response = await dbService.getTags();
                break;

            case '/achievements':
                if (!queryParams.ocid) {
                    throw new Error("OC ID is required for achievements");
                }
                response = await dbService.getAchievementsByOCId(queryParams.ocid, {
                    page: parseInt(queryParams.page) || 0,
                    pageSize: parseInt(queryParams.pageSize) || 10
                });
                break;

            default:
                throw new Error(`Unsupported public endpoint: ${endpoint}`);
        }

        return {
            ok: true,
            json: async () => response
        };
    } catch (error) {
        return {
            ok: false,
            json: async () => ({ error: { message: error.message } })
        };
    }
};