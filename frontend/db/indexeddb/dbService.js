"use client";
import { 
    initDatabase, 
    createUserDocument, 
    createListingDocument, 
    createTagDocument, 
    createAdminConfigsDocument,
    UserListingStatus, 
    ListingStatus, 
    ListingTriggerMode,
    VcIssueJobStatus
} from '@/db/indexeddb/DBsetup';

export class DBService {
    constructor() {
        this.db = null;
        this.initPromise = this.init();
    }

    async init() {
        this.db = await initDatabase();
        return this.db;
    }

    // ===== backend/src/index.js endpoints =====
    // Corresponds to backend/src/index.js POST /signup and backend/src/signup.js signup()
    async createUser(userData) {
        console.log('Creating user with data:', userData);
        if (!userData.email) {
            throw new Error("Email is required for user creation");
        }
        if (!userData.oc_id) {
            throw new Error("OC ID is required for user creation");
        }

        const tx = this.db.transaction(['users'], 'readwrite');
        const store = tx.objectStore('users');
        const userIndex = store.index('oc_id');

        // Check if user already exists - properly await the request
        const existingUser = await new Promise((resolve, reject) => {
            const request = userIndex.get(userData.oc_id);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });

        if (existingUser) {
            console.log('User already exists:', existingUser);
            return { message: "User created successfully" };
        }

        // Create new user document
        const userDoc = createUserDocument({
            name: userData.name || '',
            email: userData.email.toLowerCase(),
            oc_id: userData.oc_id,
            profile: userData.profile || {},
            signups: []
        });

        console.log('Created user document:', userDoc);
        await store.add(userDoc);
        return { message: "User created successfully" };
    }
    
    // Corresponds to backend/src/index.js GET /user and backend/src/auth-user/index.js registeredUserMiddleware()
    async getUserByOCId(ocId) {
        const tx = this.db.transaction(['users', 'admin_configs'], 'readonly');
        const userStore = tx.objectStore('users');
        const adminStore = tx.objectStore('admin_configs');
        const userIndex = userStore.index('oc_id');
        
        const user = await new Promise((resolve, reject) => {
            const request = userIndex.get(ocId);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });

        if (!user) {
            return null;
        }

        const adminConfig = await new Promise((resolve, reject) => {
            const request = adminStore.get('admin_config');
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });

        const isAdmin = adminConfig?.admin_ocids?.includes(ocId) || false;
        const isMasterAdmin = adminConfig?.isMasterAdmin === true && adminConfig?.admin_ocids?.includes(ocId);

        const userData = {
            id: user.id,
            name: user.name || '',
            email: user.email || '',
            oc_id: user.oc_id || ocId,
            profile: user.profile || {},
            signups: user.signups || []
        };

        return {
            isAdmin,
            isMasterAdmin,
            isRegisteredUser: true,
            user: userData
        };
    }

    // ===== backend/src/auth-user/index.js endpoints =====
    // Corresponds to backend/src/auth-user/index.js POST /update-username
    async updateUsername(ocId, username) {
        const tx = this.db.transaction(['users'], 'readwrite');
        const store = tx.objectStore('users');
        const index = store.index('oc_id');
        const user = await index.get(ocId);
        if (!user) {
            throw new Error("User not found");
        }
        user.name = username;
        user.last_modified_ts = new Date().toISOString();
        await store.put(user);
        return { message: "Username updated successfully" };
    }

    // Corresponds to backend/src/auth-user/index.js GET /sign-ups
    async getUserSignups({ page = 0, pageSize = 10, searchText, userId }) {
        if (!userId) {
            console.warn('[DBService] getUserSignups called without userId');
            return { data: [], total: 0 };
        }

        const tx = this.db.transaction(['user_listings', 'listings', 'vc_issue_jobs'], 'readonly');
        const userListingsStore = tx.objectStore('user_listings');
        const listingsStore = tx.objectStore('listings');
        const vcJobsStore = tx.objectStore('vc_issue_jobs');
        const userListingsIndex = userListingsStore.index('user_id');
        
        return new Promise((resolve, reject) => {
            const request = userListingsIndex.openCursor();
            const results = [];
            let count = 0;
            
            request.onsuccess = async (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    const signup = cursor.value;
                    if (signup.user_id === userId) {
                        try {
                            const listing = await listingsStore.get(signup.listing_id);
                            if (!listing) {
                                console.warn(`Listing not found for signup: ${signup.listing_id}`);
                                cursor.continue();
                                return;
                            }

                            // Get VC jobs for this signup
                            const vcJobs = [];
                            const vcJobsCursor = await vcJobsStore.openCursor();
                            while (vcJobsCursor) {
                                const job = vcJobsCursor.value;
                                if (job.user_id === signup.user_id && job.listing_id === signup.listing_id) {
                                    vcJobs.push(job);
                                }
                                await vcJobsCursor.continue();
                            }

                            // Calculate VC status like SQL backend
                            const vcCount = vcJobs.length;
                            const vcPendingCount = vcJobs.filter(job => job.status === VcIssueJobStatus.PENDING).length;
                            const vcFailedCount = vcJobs.filter(job => job.status === VcIssueJobStatus.FAILED).length;
                            const vcStatus = vcPendingCount > 0 ? 'pending' : vcFailedCount > 0 ? 'failed' : 'success';

                            if (count >= page * pageSize && count < (page + 1) * pageSize) {
                                results.push({
                                    id: listing.id,
                                    name: listing.name,
                                    description: listing.description,
                                    status: signup.status,
                                    vc_status: vcStatus,
                                    vc_count: vcCount,
                                    created_ts: signup.created_ts,
                                    last_modified_ts: signup.last_modified_ts
                                });
                            }
                            count++;
                            cursor.continue();
                        } catch (error) {
                            console.error('Error processing signup:', error);
                            cursor.continue();
                        }
                    } else {
                        cursor.continue();
                    }
                } else {
                    resolve({ data: results, total: count });
                }
            };

            request.onerror = (event) => {
                console.error('Error fetching signups:', event.target.error);
                reject(event.target.error);
            };
        });
    }

    // Corresponds to backend/src/auth-user/index.js POST /signup-for-listing
    async signupForListing(userId, listingId) {
        const tx = this.db.transaction(['users', 'listings', 'user_listings'], 'readwrite');
        const userStore = tx.objectStore('users');
        const listingStore = tx.objectStore('listings');
        const userListingsStore = tx.objectStore('user_listings');

        const existingSignup = await userListingsStore.get([userId, listingId]);
        if (existingSignup) {
            throw new Error("You've already signed up for this listing");
        }

        const listing = await listingStore.get(listingId);
        const signupCount = listing.signups.filter(([_, status]) => 
            status === UserListingStatus.APPROVED || status === UserListingStatus.PENDING
        ).length;
        
        if (listing.sign_ups_limit && signupCount >= listing.sign_ups_limit) {
            throw new Error("Listing signups limit reached");
        }

        const signup = {
            user_id: userId,
            listing_id: listingId,
            status: UserListingStatus.PENDING,
            created_ts: new Date().toISOString(),
            last_modified_ts: new Date().toISOString()
        };
        await userListingsStore.add(signup);

        const user = await userStore.get(userId);
        user.signups.push({ 
            listing_id: listingId, 
            status: UserListingStatus.PENDING, 
            created_ts: signup.created_ts 
        });
        await userStore.put(user);

        listing.signups.push([userId, UserListingStatus.PENDING]);
        await listingStore.put(listing);

        return signup;
    }

    // ===== backend/src/admin/index.js endpoints =====
    // Corresponds to backend/src/admin/index.js GET /listing/:id
    async getListingById(id) {
        const tx = this.db.transaction(['listings', 'listing_tags'], 'readonly');
        const listingStore = tx.objectStore('listings');
        const listingTagsStore = tx.objectStore('listing_tags');
        
        const listing = await listingStore.get(id);
        if (!listing) return null;
        
        const tags = await listingTagsStore.index('listing_id').getAll(id);
        return {
            ...listing,
            tags: tags.map(t => t.tag_id)
        };
    }

    // Corresponds to backend/src/admin/index.js POST /listing/create
    async createListing(listingData) {
        const tx = this.db.transaction(['listings', 'listing_tags'], 'readwrite');
        const listingStore = tx.objectStore('listings');
        const listingTagsStore = tx.objectStore('listing_tags');
        
        try {
            const listingDoc = createListingDocument(listingData);
            await listingStore.add(listingDoc);

            for (const tagId of listingData.tags) {
                await listingTagsStore.add({
                    id: crypto.randomUUID(),
                    listing_id: listingDoc.id,
                    tag_id: tagId,
                    created_ts: new Date().toISOString(),
                    last_modified_ts: new Date().toISOString()
                });
            }
            return listingDoc;
        } catch (error) {
            throw error;
        }
    }

    // Corresponds to backend/src/admin/index.js POST /listing/update
    async updateListing(id, listingData) {
        const tx = this.db.transaction(['listings', 'listing_tags'], 'readwrite');
        const listingStore = tx.objectStore('listings');
        const listingTagsStore = tx.objectStore('listing_tags');
        
        try {
            const listing = await listingStore.get(id);
            if (!listing) {
                throw new Error("Listing not found");
            }

            listing.name = listingData.name;
            listing.description = listingData.description;
            listing.trigger_mode = listingData.triggerMode.toLowerCase();
            listing.sign_ups_limit = parseInt(listingData.maxSignUps);
            listing.vc_properties = {
                title: listingData.name,
                achievementType: listingData.achievementType,
                expireInDays: listingData.expireInDays ? parseInt(listingData.expireInDays) : null
            };
            listing.last_modified_ts = new Date().toISOString();
            
            await listingStore.put(listing);

            const existingTags = await listingTagsStore.index('listing_id').getAll(id);
            for (const tag of existingTags) {
                await listingTagsStore.delete(tag.id);
            }

            for (const tagId of listingData.tags) {
                await listingTagsStore.add({
                    id: crypto.randomUUID(),
                    listing_id: id,
                    tag_id: tagId,
                    created_ts: new Date().toISOString(),
                    last_modified_ts: new Date().toISOString()
                });
            }

            return { id };
        } catch (error) {
            throw error;
        }
    }

    // Corresponds to backend/src/admin/index.js POST /listing/publish
    async updateListingStatus(id, status) {
        const tx = this.db.transaction(['listings'], 'readwrite');
        const store = tx.objectStore('listings');
        const listing = await store.get(id);
        
        if (listing) {
            listing.status = status;
            if (status === ListingStatus.ACTIVE) {
                listing.published_ts = new Date().toISOString();
            } else if (status === ListingStatus.DELETED) {
                listing.deleted_ts = new Date().toISOString();
            }
            await store.put(listing);
        }
        return listing;
    }

    // Corresponds to backend/src/admin/index.js POST /listing/signups/update-status
    async updateSignupStatus(userId, listingId, status) {
        const tx = this.db.transaction(['users', 'listings', 'user_listings'], 'readwrite');
        const userStore = tx.objectStore('users');
        const listingStore = tx.objectStore('listings');
        const userListingsStore = tx.objectStore('user_listings');

        const signup = await userListingsStore.get([userId, listingId]);
        if (!signup) {
            throw new Error("Signup not found");
        }
        signup.status = status;
        signup.last_modified_ts = new Date().toISOString();
        await userListingsStore.put(signup);

        const user = await userStore.get(userId);
        const userSignup = user.signups.find(s => s.listing_id === listingId);
        if (userSignup) {
            userSignup.status = status;
            userSignup.last_modified_ts = signup.last_modified_ts;
            await userStore.put(user);
        }

        const listing = await listingStore.get(listingId);
        const listingSignupIndex = listing.signups.findIndex(([uid, _]) => uid === userId);
        if (listingSignupIndex !== -1) {
            listing.signups[listingSignupIndex][1] = status;
            await listingStore.put(listing);
        }

        if (listing.trigger_mode === ListingTriggerMode.AUTO && status === UserListingStatus.COMPLETED) {
            await this.createVCIssueJob(userId, listingId);
        }

        return signup;
    }

    // Corresponds to backend/src/admin/index.js GET /tags
    async getTags() {
        const tx = this.db.transaction(['tags'], 'readonly');
        const store = tx.objectStore('tags');
        const index = store.index('archived_ts');
        
        return new Promise((resolve, reject) => {
            const request = index.getAll(null);
            
            request.onsuccess = (event) => {
                const tags = event.target.result || [];
                resolve(tags);
            };
            
            request.onerror = (event) => {
                reject(event.target.error);
            };
        });
    }

    // Corresponds to backend/src/admin/index.js POST /tag
    async createTag(tagData) {
        const tx = this.db.transaction(['tags'], 'readwrite');
        const store = tx.objectStore('tags');
        
        const index = store.index('name');
        const existingTag = await index.get(tagData.name);
        if (existingTag) {
            throw new Error("Tag already exists");
        }

        const tagDoc = createTagDocument(tagData);
        await store.add(tagDoc);
        return tagDoc;
    }

    // Corresponds to backend/src/admin/index.js POST /add-tag
    async addTagToListings(tagId, listingIds) {
        const tx = this.db.transaction(['listing_tags'], 'readwrite');
        const store = tx.objectStore('listing_tags');
        
        try {
            for (const listingId of listingIds) {
                await store.add({
                    id: crypto.randomUUID(),
                    listing_id: listingId,
                    tag_id: tagId,
                    created_ts: new Date().toISOString(),
                    last_modified_ts: new Date().toISOString()
                });
            }
            return { status: "successful" };
        } catch (error) {
            throw error;
        }
    }

    // ===== backend/src/public/index.js endpoints =====
    // Corresponds to backend/src/public/index.js GET /listings
    async getListings({ page = 0, pageSize = 10, searchText, searchTags, searchStatus, includeUserSignups = false, userId = null }) {
        const tx = this.db.transaction(['listings'], 'readonly');
        const store = tx.objectStore('listings');
        const index = store.index('name');
        
        return new Promise((resolve, reject) => {
            const request = index.openCursor();
            const results = [];
            let count = 0;
            
            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    const listing = cursor.value;
                    if (this.matchesListingFilters(listing, { searchText, searchTags, searchStatus })) {
                        if (count >= page * pageSize && count < (page + 1) * pageSize) {
                            if (includeUserSignups && userId) {
                                listing.sign_up_status = this.getUserSignupStatus(listing, userId);
                            }
                            results.push(listing);
                        }
                        count++;
                    }
                    cursor.continue();
                } else {
                    resolve({ data: results, total: count });
                }
            };

            request.onerror = (event) => {
                reject(event.target.error);
            };
        });
    }

    // Corresponds to backend/src/public/index.js GET /achievements/:ocid
    async getAchievementsByOCId(ocId, { page = 0, pageSize = 10 }) {
        const user = await this.getUserByOCId(ocId);
        if (!user?.user) {
            return { data: [], total: 0 };
        }

        const tx = this.db.transaction(['user_listings', 'listings', 'vc_issue_jobs'], 'readonly');
        const userListingsStore = tx.objectStore('user_listings');
        const listingsStore = tx.objectStore('listings');
        const vcJobsStore = tx.objectStore('vc_issue_jobs');
        const index = userListingsStore.index('user_id');

        return new Promise((resolve, reject) => {
            const results = [];
            let count = 0;

            const vcJobsRequest = vcJobsStore.getAllKeys();
            vcJobsRequest.onsuccess = () => {
                const vcJobKeys = vcJobsRequest.result;
                const vcJobs = [];
                
                const processVcJob = (index) => {
                    if (index >= vcJobKeys.length) {
                        processUserListings();
                        return;
                    }

                    const jobRequest = vcJobsStore.get(vcJobKeys[index]);
                    jobRequest.onsuccess = () => {
                        const job = jobRequest.result;
                        if (job) {
                            vcJobs.push(job);
                        }
                        processVcJob(index + 1);
                    };
                    jobRequest.onerror = () => {
                        console.error('Error fetching VC job:', jobRequest.error);
                        processVcJob(index + 1);
                    };
                };

                const processUserListings = () => {
                    const request = index.openCursor();
                    request.onsuccess = (event) => {
                        const cursor = event.target.result;
                        if (cursor) {
                            const signup = cursor.value;
                            if (signup.user_id === user.user.id && signup.status === UserListingStatus.COMPLETED) {
                                const listingRequest = listingsStore.get(signup.listing_id);
                                listingRequest.onsuccess = () => {
                                    const listing = listingRequest.result;
                                    if (!listing) {
                                        console.warn(`Listing not found for signup: ${signup.listing_id}`);
                                        cursor.continue();
                                        return;
                                    }

                                    const vcJob = vcJobs.find(job => 
                                        job.user_id === signup.user_id && 
                                        job.listing_id === signup.listing_id
                                    );
                                    
                                    if (count >= page * pageSize && count < (page + 1) * pageSize) {
                                        const validUntil = listing.vc_properties?.expireInDays ? 
                                            new Date(new Date(signup.last_modified_ts).getTime() + listing.vc_properties.expireInDays * 24 * 60 * 60 * 1000).toISOString() : 
                                            null;
                                        
                                        results.push({
                                            id: listing.id,
                                            awardedDate: signup.last_modified_ts,
                                            validFrom: signup.last_modified_ts,
                                            validUntil,
                                            description: listing.description || '',
                                            credentialSubject: {
                                                name: user.user.name,
                                                email: user.user.email,
                                                achievement: {
                                                    identifier: listing.id,
                                                    achievementType: listing.vc_properties?.achievementType || 'Achievement',
                                                    name: listing.name || 'Unknown Achievement',
                                                    description: listing.description || ''
                                                }
                                            }
                                        });
                                    }
                                    count++;
                                    cursor.continue();
                                };
                                listingRequest.onerror = () => {
                                    console.error('Error fetching listing:', listingRequest.error);
                                    cursor.continue();
                                };
                            } else {
                                cursor.continue();
                            }
                        } else {
                            resolve({ data: results, total: count });
                        }
                    };

                    request.onerror = (event) => {
                        console.error('Error fetching achievements:', event.target.error);
                        reject(event.target.error);
                    };
                };

                processVcJob(0);
            };

            vcJobsRequest.onerror = (event) => {
                console.error('Error fetching VC job keys:', event.target.error);
                reject(event.target.error);
            };
        });
    }

    // Corresponds to backend/src/create-vc-issue-jobs.js
    async createVCIssueJob(userId, listingId) {
        const tx = this.db.transaction(['vc_issue_jobs'], 'readwrite');
        const store = tx.objectStore('vc_issue_jobs');
        
        const job = {
            id: crypto.randomUUID(),
            user_id: userId,
            listing_id: listingId,
            status: 'pending',
            retry_count: 0,
            created_ts: new Date().toISOString(),
            last_modified_ts: new Date().toISOString()
        };
        
        await store.add(job);
        return job;
    }

    matchesListingFilters(listing, { searchText, searchTags, searchStatus }) {
        if (searchText && !listing.name.toLowerCase().includes(searchText.toLowerCase())) {
            return false;
        }
        if (searchTags && !searchTags.every(tagId => listing.tags.includes(tagId))) {
            return false;
        }
        if (searchStatus && searchStatus !== 'all') {
            const userSignup = listing.signups.find(([_, status]) => status === searchStatus);
            if (!userSignup) {
                return false;
            }
        }
        return true;
    }

    getUserSignupStatus(listing, userId) {
        const signup = listing.signups.find(([uid, _]) => uid === userId);
        return signup ? signup[1] : null;
    }

    matchesUserSignupFilters(listing, { searchText }) {
        if (searchText && !listing.name.toLowerCase().includes(searchText.toLowerCase())) {
            return false;
        }
        return true;
    }

    // ===== Admin Management =====
    async getAdminConfig() {
        const tx = this.db.transaction(['admin_configs'], 'readonly');
        const store = tx.objectStore('admin_configs');
        const adminConfig = await store.get('admin_config');
        return adminConfig || { admin_ocids: [] };
    }

    async updateAdminConfig(adminOCIDs) {
        const tx = this.db.transaction(['admin_configs'], 'readwrite');
        const store = tx.objectStore('admin_configs');
        const adminConfig = await store.get('admin_config');
        
        if (adminConfig) {
            adminConfig.admin_ocids = adminOCIDs;
            adminConfig.last_modified_ts = new Date().toISOString();
            await store.put(adminConfig);
        } else {
            const newConfig = createAdminConfigsDocument({
                admin_ocids: adminOCIDs,
                isMasterAdmin: false
            });
            await store.add(newConfig);
        }
        return { admin_ocids: adminOCIDs };
    }

    async setMasterAdmin(ocId) {
        const tx = this.db.transaction(['admin_configs'], 'readwrite');
        const store = tx.objectStore('admin_configs');
        const index = store.index('isMasterAdmin');

        const existingMasterAdmin = await index.get(true);
        if (existingMasterAdmin) {
            throw new Error("A master admin already exists");
        }

        const adminConfig = createAdminConfigsDocument({
            admin_ocids: [ocId],
            isMasterAdmin: true
        });

        await store.add(adminConfig);
        return adminConfig;
    }

    async isMasterAdmin(ocId) {
        const tx = this.db.transaction(['admin_configs'], 'readonly');
        const store = tx.objectStore('admin_configs');
        const index = store.index('isMasterAdmin');
        const adminConfig = await index.get(true);
        return adminConfig?.admin_ocids.includes(ocId);
    }

    async isAdmin(ocId) {
        const tx = this.db.transaction(['admin_configs'], 'readonly');
        const store = tx.objectStore('admin_configs');
        const index = store.index('admin_ocids');
        const adminConfig = await index.get(ocId);
        return adminConfig?.admin_ocids.includes(ocId);
    }

    async makeAdmin(ocId) {
        const tx = this.db.transaction(['admin_configs'], 'readwrite');
        const store = tx.objectStore('admin_configs');
        const index = store.index('admin_ocids');
        const adminConfig = await index.get(ocId);
        adminConfig.admin_ocids.push(ocId);
        await store.put(adminConfig);
    }

    async removeAdmin(ocId) {
        const tx = this.db.transaction(['admin_configs'], 'readwrite');
        const store = tx.objectStore('admin_configs');
        const index = store.index('admin_ocids');
        const adminConfig = await index.get(ocId);
        adminConfig.admin_ocids = adminConfig.admin_ocids.filter(id => id !== ocId);
        await store.put(adminConfig);
    }

}

const dbService = new DBService();
export default dbService; 