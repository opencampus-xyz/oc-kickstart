"use client";
import { 
    initDatabase, 
    createUserDocument, 
    createListingDocument, 
    createTagDocument, 
    createAdminConfigsDocument
} from '@/db/indexeddb/DBsetup';
import { UserListingStatus, ListingStatus, ListingTriggerMode, VcIssueJobStatus } from '@/constants';
import VCIssuerService from './vc-issuer.js';

export class DBService {
    constructor() {
        this.db = null;
        this.initPromise = this.init();
    }

    get IndexedDBHelper() {
        return {
            createTransaction: (stores, mode = 'readonly') => {
                return this.db.transaction(stores, mode);
            },

            getStore: (transaction, storeName) => {
                return transaction.objectStore(storeName);
            },

            getIndex: (store, indexName) => {
                return store.index(indexName);
            },

            get: (store, key) => {
                return new Promise((resolve, reject) => {
                    const request = store.get(key);
                    request.onsuccess = () => resolve(request.result);
                    request.onerror = () => reject(request.error);
                });
            },

            getByIndex: (index, key) => {
                return new Promise((resolve, reject) => {
                    const request = index.get(key);
                    request.onsuccess = () => resolve(request.result);
                    request.onerror = () => reject(request.error);
                });
            },

            put: (store, data) => {
                return new Promise((resolve, reject) => {
                    const request = store.put(data);
                    request.onsuccess = () => resolve(request.result);
                    request.onerror = () => reject(request.error);
                });
            },

            add: (store, data) => {
                return new Promise((resolve, reject) => {
                    const request = store.add(data);
                    request.onsuccess = () => resolve(request.result);
                    request.onerror = () => reject(request.error);
                });
            },

            getAll: (store, query = null, count = null) => {
                return new Promise((resolve, reject) => {
                    const request = query ? store.getAll(query, count) : store.getAll();
                    request.onsuccess = () => resolve(request.result);
                    request.onerror = () => reject(request.error);
                });
            },

            openCursor: (store, query = null, direction = 'next') => {
                return new Promise((resolve, reject) => {
                    const request = query ? store.openCursor(query, direction) : store.openCursor();
                    request.onsuccess = () => resolve(request.result);
                    request.onerror = () => reject(request.error);
                });
            }
        };
    }

    async init() {
        this.db = await initDatabase();
        
        return this.db;
    }

    async ensureInitialized() {
        await this.initPromise;
        if (!this.db) {
            throw new Error('Database failed to initialize');
        }
    }

    // ===== backend/src/index.js endpoints =====
    async createUser(userData) {
        if (!userData.email) {
            throw new Error("Email is required for user creation");
        }
        if (!userData.oc_id) {
            throw new Error("OC ID is required for user creation");
        }

        const tx = this.IndexedDBHelper.createTransaction(['users'], 'readwrite');
        const store = this.IndexedDBHelper.getStore(tx, 'users');
        const userIndex = this.IndexedDBHelper.getIndex(store, 'oc_id');

        const existingUser = await this.IndexedDBHelper.getByIndex(userIndex, userData.oc_id);

        if (existingUser) {
            return { message: "User created successfully" };
        }

        const userDoc = createUserDocument({
            name: userData.name || '',
            email: userData.email.toLowerCase(),
            oc_id: userData.oc_id,
            profile: userData.profile || {},
            signups: []
        });

        await this.IndexedDBHelper.add(store, userDoc);
        
        const existingMasterAdmin = this._getMasterAdminFromStorage();
        if (!existingMasterAdmin) {
            this._setMasterAdminToStorage(userData.oc_id);
        }
        
        return { message: "User created successfully" };
    }
    
    async getUserByOCId(ocId) {
        await this.ensureInitialized();
        
        const tx = this.IndexedDBHelper.createTransaction(['users', 'admin_configs'], 'readonly');
        const userStore = this.IndexedDBHelper.getStore(tx, 'users');
        const adminStore = this.IndexedDBHelper.getStore(tx, 'admin_configs');
        const userIndex = this.IndexedDBHelper.getIndex(userStore, 'oc_id');
        
        const user = await this.IndexedDBHelper.getByIndex(userIndex, ocId);

        if (!user) {
            return null;
        }

        const adminConfig = await this.IndexedDBHelper.get(adminStore, 'admin_config');

        const isMasterAdmin = await this.isMasterAdmin(ocId);
        const isAdmin = isMasterAdmin || adminConfig?.admin_ocids?.includes(ocId) || false;

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
    async updateUsername(ocId, username) {
        const tx = this.IndexedDBHelper.createTransaction(['users'], 'readwrite');
        const store = this.IndexedDBHelper.getStore(tx, 'users');
        const index = this.IndexedDBHelper.getIndex(store, 'oc_id');
        const user = await this.IndexedDBHelper.getByIndex(index, ocId);
        if (!user) {
            throw new Error("User not found");
        }
        user.name = username;
        user.last_modified_ts = new Date().toISOString();
        await this.IndexedDBHelper.put(store, user);
        return { message: "Username updated successfully" };
    }

    async getUserSignups({ page = 0, pageSize = 10, searchText, userId }) {
        
        if (!userId) {
            console.warn('[DBService] No userId provided for getUserSignups');
            return { data: [], total: 0 };
        }

        const tx = this.IndexedDBHelper.createTransaction(['user_listings', 'listings', 'vc_issue_jobs'], 'readonly');
        const userListingsStore = this.IndexedDBHelper.getStore(tx, 'user_listings');
        const listingsStore = this.IndexedDBHelper.getStore(tx, 'listings');
        const vcJobsStore = this.IndexedDBHelper.getStore(tx, 'vc_issue_jobs');
        const userListingsIndex = this.IndexedDBHelper.getIndex(userListingsStore, 'user_id');
        
        return new Promise((resolve, reject) => {
            const request = userListingsIndex.openCursor();
            const results = [];
            let count = 0;
            let totalSignups = 0;
            
            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    const signup = cursor.value;
                    totalSignups++;
                    
                    if (signup.user_id === userId) {
                        const listingRequest = listingsStore.get(signup.listing_id);
                        listingRequest.onsuccess = () => {
                            const listing = listingRequest.result;
                            if (!listing) {
                                console.warn(`Listing not found for signup: ${signup.listing_id}`);
                                cursor.continue();
                                return;
                            }

                            const vcJobs = [];
                            const vcJobsRequest = vcJobsStore.openCursor();
                            vcJobsRequest.onsuccess = (vcEvent) => {
                                const vcCursor = vcEvent.target.result;
                                if (vcCursor) {
                                    const job = vcCursor.value;
                                    if (job.user_id === signup.user_id && job.listing_id === signup.listing_id) {
                                        vcJobs.push(job);
                                    }
                                    vcCursor.continue();
                                } else {
                                    const vcCount = vcJobs.length;
                                    let vcStatus = null;
                                    
                                    if (vcCount > 0) {
                                        const vcPendingCount = vcJobs.filter(job => job.status === VcIssueJobStatus.PENDING).length;
                                        const vcFailedCount = vcJobs.filter(job => job.status === VcIssueJobStatus.FAILED).length;
                                        const vcSuccessCount = vcJobs.filter(job => job.status === VcIssueJobStatus.SUCCESS).length;
                                        
                                        if (vcPendingCount > 0) {
                                            vcStatus = VcIssueJobStatus.PENDING;
                                        } else if (vcFailedCount > 0) {
                                            vcStatus = VcIssueJobStatus.FAILED;
                                        } else if (vcSuccessCount > 0) {
                                            vcStatus = VcIssueJobStatus.SUCCESS;
                                        }
                                    }

                                    if (count >= page * pageSize && count < (page + 1) * pageSize) {
                                        const resultItem = {
                                            id: listing.id,
                                            listing_name: listing.name,
                                            description: listing.description,
                                            user_listing_status: signup.status,
                                            vc_issue_status: vcStatus,
                                            vc_count: vcCount,
                                            created_ts: signup.created_ts,
                                            last_modified_ts: signup.last_modified_ts
                                        };
                                        results.push(resultItem);
                                    }
                                    count++;
                                    cursor.continue();
                                }
                            };
                            vcJobsRequest.onerror = (error) => {
                                console.error('Error fetching VC jobs:', error);
                                cursor.continue();
                            };
                        };
                        listingRequest.onerror = (error) => {
                            console.error('Error fetching listing:', error);
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
                console.error('Error fetching signups:', event.target.error);
                reject(event.target.error);
            };
        });
    }

    async signupForListing(userId, listingId) {
        const tx = this.IndexedDBHelper.createTransaction(['users', 'listings', 'user_listings'], 'readwrite');
        const userStore = this.IndexedDBHelper.getStore(tx, 'users');
        const listingStore = this.IndexedDBHelper.getStore(tx, 'listings');
        const userListingsStore = this.IndexedDBHelper.getStore(tx, 'user_listings');

        const user = await this.IndexedDBHelper.get(userStore, userId);

        const listing = await this.IndexedDBHelper.get(listingStore, listingId);

        const existingSignup = await this.IndexedDBHelper.get(userListingsStore, [userId, listingId]);

        if (existingSignup !== undefined) {
            throw new Error("You've already signed up for this listing");
        }

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

        await this.IndexedDBHelper.add(userListingsStore, signup);
        
        user.signups.push({ 
            listing_id: listingId, 
            status: UserListingStatus.PENDING, 
            created_ts: signup.created_ts 
        });
        await this.IndexedDBHelper.put(userStore, user);

        listing.signups.push([userId, UserListingStatus.PENDING]);
        await this.IndexedDBHelper.put(listingStore, listing);

        return signup;
    }

    async getUserListingStatus(ocId, listingId) {
        const user = await this.getUserByOCId(ocId);
        if (!user?.user) {
            return { sign_up_status: null };
        }

        const tx = this.IndexedDBHelper.createTransaction(['user_listings'], 'readonly');
        const userListingsStore = this.IndexedDBHelper.getStore(tx, 'user_listings');
        
        const signup = await this.IndexedDBHelper.get(userListingsStore, [user.user.id, listingId]);
        
        return { sign_up_status: signup ? signup.status : null };
    }

    // ===== backend/src/admin/index.js endpoints =====
    async getListingById(id) {
        const tx = this.IndexedDBHelper.createTransaction(['listings'], 'readonly');
        const listingStore = this.IndexedDBHelper.getStore(tx, 'listings');
        
        return await this.IndexedDBHelper.get(listingStore, id);
    }

    // ===== backend/src/public/index.js endpoints =====
    async getPublicListingById(id) {
        const tx = this.IndexedDBHelper.createTransaction(['listings', 'tags'], 'readonly');
        const listingStore = this.IndexedDBHelper.getStore(tx, 'listings');
        const tagStore = this.IndexedDBHelper.getStore(tx, 'tags');
        
        const listing = await this.IndexedDBHelper.get(listingStore, id);
        
        if (!listing || listing.status !== ListingStatus.ACTIVE) {
            throw new Error('Listing not found');
        }
        
        // Get tag names and IDs for the listing
        const tagNames = [];
        const tagIds = [];
        
        if (listing.tags && listing.tags.length > 0) {
            for (const tagId of listing.tags) {
                try {
                    const tag = await this.IndexedDBHelper.get(tagStore, tagId);
                    if (tag && !tag.archived_ts) {
                        tagNames.push(tag.name);
                        tagIds.push(tag.id);
                    }
                } catch (error) {
                    console.warn(`Failed to fetch tag ${tagId}:`, error);
                }
            }
        }
        
        return {
            ...listing,
            tag_names: tagNames,
            tag_ids: tagIds
        };
    }

    async createListing(listingData) {
        const tx = this.IndexedDBHelper.createTransaction(['listings'], 'readwrite');
        const listingStore = this.IndexedDBHelper.getStore(tx, 'listings');
        
        try {
            const listingDoc = createListingDocument({
                ...listingData,
                tags: listingData.tags || [],
                trigger_mode: listingData.triggerMode?.toLowerCase() ?? ListingTriggerMode.MANUAL,
                sign_ups_limit: parseInt(listingData.maxSignUps),
                vc_properties: {
                    title: listingData.title,
                    achievementType: listingData.achievementType,
                    expireInDays: listingData.expireInDays ? parseInt(listingData.expireInDays) : null
                }
            });
            
            await this.IndexedDBHelper.add(listingStore, listingDoc);
            
            return {
                id: listingDoc.id,
                name: listingDoc.name,
                description: listingDoc.description,
                trigger_mode: listingDoc.trigger_mode,
                sign_ups_limit: listingDoc.sign_ups_limit,
                vc_properties: listingDoc.vc_properties,
                tags: listingDoc.tags,
                status: listingDoc.status,
                created_ts: listingDoc.created_ts,
                last_modified_ts: listingDoc.last_modified_ts,
                published_ts: listingDoc.published_ts,
                deleted_ts: listingDoc.deleted_ts
            };
        } catch (error) {
            console.error('Error in createListing:', error);
            throw error;
        }
    }

    async updateListing(id, listingData) {
        const tx = this.IndexedDBHelper.createTransaction(['listings'], 'readwrite');
        const listingStore = this.IndexedDBHelper.getStore(tx, 'listings');
        
        try {
            if (!id) {
                throw new Error("No listing ID provided");
            }

            const listing = await this.IndexedDBHelper.get(listingStore, id);
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
            listing.tags = listingData.tags || [];
            listing.last_modified_ts = new Date().toISOString();
            
            await this.IndexedDBHelper.put(listingStore, listing);
            return { id };
        } catch (error) {
            throw error;
        }
    }

    async updateListingStatus(listingId, newStatus) {
        const tx = this.IndexedDBHelper.createTransaction(['listings'], 'readwrite');
        const listingStore = this.IndexedDBHelper.getStore(tx, 'listings');
        
        try {
            const currentListing = await this.IndexedDBHelper.get(listingStore, listingId);
            
            if (!currentListing) {
                throw new Error(`Listing not found: ${listingId}`);
            }
            
            const requiredFields = ['id', 'name', 'description', 'trigger_mode', 'sign_ups_limit', 'vc_properties', 'tags', 'status'];
            const missingFields = requiredFields.filter(field => !currentListing[field]);
            
            if (missingFields.length > 0) {
                console.error('Listing is missing required fields:', currentListing);
                throw new Error(`Listing is missing required fields: ${missingFields.join(', ')}`);
            }
            
            const updatedListing = {
                ...currentListing,
                status: newStatus,
                last_modified_ts: new Date().toISOString(),
                published_ts: newStatus === 'published' ? new Date().toISOString() : currentListing.published_ts
            };
            
            await this.IndexedDBHelper.put(listingStore, updatedListing);
            
            return {
                id: updatedListing.id,
                name: updatedListing.name,
                description: updatedListing.description,
                trigger_mode: updatedListing.trigger_mode,
                sign_ups_limit: updatedListing.sign_ups_limit,
                vc_properties: updatedListing.vc_properties,
                tags: updatedListing.tags,
                status: updatedListing.status,
                created_ts: updatedListing.created_ts,
                last_modified_ts: updatedListing.last_modified_ts,
                published_ts: updatedListing.published_ts,
                deleted_ts: updatedListing.deleted_ts
            };
        } catch (error) {
            console.error('Error in updateListingStatus:', error);
            throw error;
        }
    }

    async updateSignupStatus(userId, listingId, status) {
        const tx = this.IndexedDBHelper.createTransaction(['users', 'listings', 'user_listings'], 'readwrite');
        const userStore = this.IndexedDBHelper.getStore(tx, 'users');
        const listingStore = this.IndexedDBHelper.getStore(tx, 'listings');
        const userListingsStore = this.IndexedDBHelper.getStore(tx, 'user_listings');

        const signup = await this.IndexedDBHelper.get(userListingsStore, [userId, listingId]);
        
        if (!signup) {
            throw new Error("Signup not found");
        }

        const updatedSignup = {
            ...signup,
            status: status,
            last_modified_ts: new Date().toISOString()
        };
        
        await this.IndexedDBHelper.put(userListingsStore, updatedSignup);

        const user = await this.IndexedDBHelper.get(userStore, userId);
        
        if (user) {
            const userSignup = user.signups.find(s => s.listing_id === listingId);
            if (userSignup) {
                userSignup.status = status;
                userSignup.last_modified_ts = updatedSignup.last_modified_ts;
                
                const updatedUser = {
                    ...user,
                    signups: [...user.signups]
                };
                
                await this.IndexedDBHelper.put(userStore, updatedUser);
            }
        }

        const listing = await this.IndexedDBHelper.get(listingStore, listingId);
        
        if (listing) {
            const listingSignupIndex = listing.signups.findIndex(([uid, _]) => uid === userId);
            if (listingSignupIndex !== -1) {
                const updatedListing = {
                    ...listing,
                    signups: [...listing.signups]
                };
                updatedListing.signups[listingSignupIndex][1] = status;
                
                await this.IndexedDBHelper.put(listingStore, updatedListing);
            }

            if (listing.trigger_mode === ListingTriggerMode.AUTO && status === UserListingStatus.COMPLETED) {
                await this.createVCIssueJob(userId, listingId);
            }
        }

        return updatedSignup;
    }

    async getTags() {
        await this.ensureInitialized();

        const tx = this.IndexedDBHelper.createTransaction(['tags'], 'readonly');
        const store = this.IndexedDBHelper.getStore(tx, 'tags');
        const index = this.IndexedDBHelper.getIndex(store, 'created_ts');
        
        return new Promise((resolve, reject) => {
            const request = index.openCursor(null, 'prev');
            const results = [];
            let count = 0;
            
            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    const tag = cursor.value;
                    if (!tag.archived_ts) {
                        const vc_properties = tag.vc_properties || {};
                        const formattedTag = {
                            ...tag,
                            vc_properties: {
                                title: tag.title || vc_properties.title || '',
                                achievementType: tag.achievementType || vc_properties.achievementType || '',
                                expireInDays: tag.expireInDays || vc_properties.expireInDays || null
                            }
                        };
                        results.push(formattedTag);
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

    async createTag(tagData) {
        const tx = this.IndexedDBHelper.createTransaction(['tags'], 'readwrite');
        const store = this.IndexedDBHelper.getStore(tx, 'tags');
        
        const index = this.IndexedDBHelper.getIndex(store, 'name');
        const existingTag = await this.IndexedDBHelper.getByIndex(index, tagData.name);
        if (existingTag) {
            throw new Error("Tag already exists");
        }

        const tagDoc = createTagDocument({
            ...tagData,
            title: tagData.title || '',
            achievementType: tagData.achievementType || '',
            expireInDays: tagData.expireInDays ? parseInt(tagData.expireInDays) : null,
            vc_properties: {
                title: tagData.title || '',
                achievementType: tagData.achievementType || '',
                expireInDays: tagData.expireInDays ? parseInt(tagData.expireInDays) : null
            }
        });
        await this.IndexedDBHelper.add(store, tagDoc);
        return tagDoc;
    }

    async updateTag(tagData) {
        const tx = this.IndexedDBHelper.createTransaction(['tags'], 'readwrite');
        const store = this.IndexedDBHelper.getStore(tx, 'tags');
        
        const index = this.IndexedDBHelper.getIndex(store, 'name');
        const existingTag = await this.IndexedDBHelper.getByIndex(index, tagData.name);
        
        if (!existingTag) {
            throw new Error("Tag not found");
        }

        const updatedTag = {
            ...existingTag,
            description: tagData.description,
            can_issue_oca: tagData.can_issue_oca,
            title: tagData.title || '',
            achievementType: tagData.achievementType || '',
            expireInDays: tagData.expireInDays ? parseInt(tagData.expireInDays) : null,
            vc_properties: {
                title: tagData.title || '',
                achievementType: tagData.achievementType || '',
                expireInDays: tagData.expireInDays ? parseInt(tagData.expireInDays) : null
            },
            last_modified_ts: new Date().toISOString()
        };

        await this.IndexedDBHelper.put(store, updatedTag);
        return updatedTag;
    }

    async addTagToListings(tagId, listingIds) {
        const tx = this.IndexedDBHelper.createTransaction(['listings'], 'readwrite');
        const store = this.IndexedDBHelper.getStore(tx, 'listings');
        
        try {
            for (const listingId of listingIds) {
                const listing = await this.IndexedDBHelper.get(store, listingId);
                if (!listing) {
                    console.warn(`Listing not found: ${listingId}`);
                    continue;
                }
                
                if (!listing.tags.includes(tagId)) {
                    listing.tags.push(tagId);
                    listing.last_modified_ts = new Date().toISOString();
                    await this.IndexedDBHelper.put(store, listing);
                }
            }
            return { status: "successful" };
        } catch (error) {
            console.error('Error in addTagToListings:', error);
            throw new Error('Failed to add tag to listings');
        }
    }

    async archiveTag(tagId) {
        const tx = this.IndexedDBHelper.createTransaction(['tags'], 'readwrite');
        const store = this.IndexedDBHelper.getStore(tx, 'tags');
        
        try {
            const tag = await this.IndexedDBHelper.get(store, tagId);
            if (!tag) {
                throw new Error("Tag not found");
            }
            
            tag.archived_ts = new Date().toISOString();
            tag.last_modified_ts = new Date().toISOString();
            
            await this.IndexedDBHelper.put(store, tag);
            return { message: "Tag archived successfully" };
        } catch (error) {
            throw error;
        }
    }

    async getListings({ page = 0, pageSize = 10, searchText, searchTags, searchStatus, includeUserSignups = false, userId = null, showAllStatuses = false }) {
        await this.ensureInitialized();
        
        const tx = this.IndexedDBHelper.createTransaction(['listings', 'tags', 'user_listings'], 'readonly');
        const listingStore = this.IndexedDBHelper.getStore(tx, 'listings');
        const tagStore = this.IndexedDBHelper.getStore(tx, 'tags');
        const userListingsStore = this.IndexedDBHelper.getStore(tx, 'user_listings');
        const index = this.IndexedDBHelper.getIndex(listingStore, 'name');
        
        return new Promise((resolve, reject) => {
            const request = index.openCursor(null, 'prev');
            const results = [];
            let count = 0;
            let allListings = [];
            
            request.onsuccess = async (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    const listing = cursor.value;
                    allListings.push(listing);
                    
                    const statusMatches = showAllStatuses || listing.status === ListingStatus.ACTIVE;
                    if (statusMatches && this.matchesListingFilters(listing, { searchText, searchTags })) {
                        let shouldIncludeListing = true;
                        
                        if (includeUserSignups && userId && searchStatus && searchStatus !== "all") {
                            const userSignupStatus = await this.getUserSignupStatus(listing, userId);
                            shouldIncludeListing = userSignupStatus === searchStatus;
                        }
                        
                        if (shouldIncludeListing) {
                            if (count >= page * pageSize && count < (page + 1) * pageSize) {
                                if (includeUserSignups && userId) {
                                    listing.sign_up_status = await this.getUserSignupStatus(listing, userId);
                                }
                                
                                const signupsCount = await new Promise((resolve) => {
                                    const userListingsIndex = this.IndexedDBHelper.getIndex(userListingsStore, 'listing_id');
                                    const signupsRequest = userListingsIndex.openCursor(null, 'prev');
                                    let count = 0;
                                    
                                    signupsRequest.onsuccess = (event) => {
                                        const signupCursor = event.target.result;
                                        if (signupCursor) {
                                            const signup = signupCursor.value;
                                            if (signup.listing_id === listing.id && 
                                                (signup.status === UserListingStatus.APPROVED || signup.status === UserListingStatus.PENDING || signup.status === UserListingStatus.COMPLETED)) {
                                                count++;
                                            }
                                            signupCursor.continue();
                                        } else {
                                            resolve(count);
                                        }
                                    };
                                    
                                    signupsRequest.onerror = (error) => {
                                        console.error('Error in signups cursor:', error);
                                        resolve(0);
                                    };
                                });
                                
                                let fallbackCount = 0;
                                if (listing.signups && Array.isArray(listing.signups)) {
                                    fallbackCount = listing.signups.filter((signup) => {
                                        if (Array.isArray(signup) && signup.length >= 2) {
                                            const status = signup[1];
                                            return status === UserListingStatus.APPROVED || status === UserListingStatus.PENDING || status === UserListingStatus.COMPLETED;
                                        } else if (signup && typeof signup === 'object' && signup.status) {
                                            return signup.status === UserListingStatus.APPROVED || signup.status === UserListingStatus.PENDING || signup.status === UserListingStatus.COMPLETED;
                                        }
                                        return false;
                                    }).length;
                                }
                                
                                const finalSignupsCount = Math.max(signupsCount, fallbackCount);
                                
                                const tagNames = [];
                                if (listing.tags && listing.tags.length > 0) {
                                    for (const tagId of listing.tags) {
                                        try {
                                            const tag = await this.IndexedDBHelper.get(tagStore, tagId);
                                            if (tag && !tag.archived_ts) {
                                                tagNames.push(tag.name);
                                            }
                                        } catch (error) {
                                            console.warn(`Failed to fetch tag ${tagId}:`, error);
                                        }
                                    }
                                }
                                
                                results.push({
                                    ...listing,
                                    signups_count: finalSignupsCount,
                                    tag_names: tagNames
                                });
                            }
                            count++;
                        }
                    }
                    cursor.continue();
                } else {
                    resolve({ listings: results, total: count });
                }
            };

            request.onerror = (event) => {
                console.error('Error fetching listings:', event.target.error);
                reject(event.target.error);
            };
        });
    }

    async getAchievementsByOCId(ocId, { page = 0, pageSize = 10 }) {
        const user = await this.getUserByOCId(ocId);
        if (!user?.user) {
            return { data: [], total: 0 };
        }

        const tx = this.IndexedDBHelper.createTransaction(['user_listings', 'listings', 'vc_issue_jobs'], 'readonly');
        const userListingsStore = this.IndexedDBHelper.getStore(tx, 'user_listings');
        const listingsStore = this.IndexedDBHelper.getStore(tx, 'listings');
        const vcJobsStore = this.IndexedDBHelper.getStore(tx, 'vc_issue_jobs');
        const index = this.IndexedDBHelper.getIndex(userListingsStore, 'user_id');

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
                    const request = index.openCursor(null, 'prev');
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
                                        job.listing_id === signup.listing_id &&
                                        job.status === VcIssueJobStatus.SUCCESS
                                    );
                                    
                                    if (vcJob && count >= (page - 1) * pageSize && count < page * pageSize) {
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

    async createVCIssueJob(userId, listingId) {
        const tx = this.IndexedDBHelper.createTransaction(['vc_issue_jobs', 'users', 'listings'], 'readwrite');
        const vcJobsStore = this.IndexedDBHelper.getStore(tx, 'vc_issue_jobs');
        const usersStore = this.IndexedDBHelper.getStore(tx, 'users');
        const listingsStore = this.IndexedDBHelper.getStore(tx, 'listings');
        
        const user = await this.IndexedDBHelper.get(usersStore, userId);
        
        const listing = await this.IndexedDBHelper.get(listingsStore, listingId);
        
        if (!user || !listing) {
            throw new Error("User or listing not found");
        }
        
        const now = new Date();
        const vcProperties = listing.vc_properties || {};
        
        const payload = {
            holderOcId: user.oc_id,
            credentialPayload: {
                awardedDate: now,
                validFrom: now,
                validUntil: vcProperties.expireInDays
                    ? new Date(now.getTime() + vcProperties.expireInDays * 24 * 60 * 60 * 1000)
                    : undefined,
                description: listing.description,
                credentialSubject: {
                    name: user.name,
                    email: user.email,
                    achievement: {
                        identifier: listing.id,
                        achievementType: vcProperties.achievementType || 'Achievement',
                        name: listing.name,
                        description: listing.description,
                    },
                },
            },
        };
        
        const job = {
            id: crypto.randomUUID(),
            user_id: userId,
            listing_id: listingId,
            payload: payload,
            status: VcIssueJobStatus.PENDING,
            retry_count: 0,
            created_ts: now.toISOString(),
            last_modified_ts: now.toISOString()
        };
        
        await this.IndexedDBHelper.add(vcJobsStore, job);
        
        return job;
    }

    matchesListingFilters(listing, { searchText, searchTags }) {
        if (searchText) {
            const searchLower = searchText.toLowerCase();
            const nameMatch = listing.name?.toLowerCase().includes(searchLower);
            const descMatch = listing.description?.toLowerCase().includes(searchLower);
            if (!nameMatch && !descMatch) {
                return false;
            }
        }
        if (searchTags && searchTags.length > 0) {
            const listingTags = listing.tags || [];
            const listingTagStrings = listingTags.map(tag => String(tag));
            const searchTagStrings = searchTags.map(tag => String(tag));
            
            const hasAllTags = searchTagStrings.every(searchTag => listingTagStrings.includes(searchTag));
            if (!hasAllTags) {
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

    // ===== Master Admin Management (localStorage) =====
    _getMasterAdminFromStorage() {
        try {
            const masterAdmin = localStorage.getItem('master_admin_ocid');
            return masterAdmin || null;
        } catch (error) {
            console.error('Failed to get master admin from localStorage:', error);
            return null;
        }
    }

    _setMasterAdminToStorage(ocId) {
        try {
            localStorage.setItem('master_admin_ocid', ocId);
        } catch (error) {
            console.error('Failed to set master admin in localStorage:', error);
            throw new Error('Failed to set master admin');
        }
    }

    _clearMasterAdminFromStorage() {
        try {
            localStorage.removeItem('master_admin_ocid');
        } catch (error) {
            console.error('Failed to clear master admin from localStorage:', error);
        }
    }

    // ===== Admin Management =====
    async adminConfig(adminOCIDs = null) {
        const tx = this.IndexedDBHelper.createTransaction(['admin_configs'], adminOCIDs !== null ? 'readwrite' : 'readonly');
        const store = this.IndexedDBHelper.getStore(tx, 'admin_configs');
        
        const adminConfig = await this.IndexedDBHelper.get(store, 'admin_config');
        
        if (adminOCIDs !== null) {
            // Update admin list in IndexedDB
            const config = createAdminConfigsDocument({
                admin_ocids: adminOCIDs,
                isMasterAdmin: false // We don't use this field anymore
            });
            await this.IndexedDBHelper.put(store, config);
            return { message: "Admin configs updated successfully" };
        } else {
            // Return both master admin and admin list
            const masterAdminOCId = this._getMasterAdminFromStorage();
            return { 
                admin_ocids: adminConfig?.admin_ocids || [],
                master_admin_ocid: masterAdminOCId,
                isMasterAdmin: !!masterAdminOCId
            };
        }
    }

    async setMasterAdmin(ocId) {
        // Check if master admin already exists in localStorage
        const existingMasterAdmin = this._getMasterAdminFromStorage();
        
        if (existingMasterAdmin) {
            throw new Error("A master admin already exists");
        }

        // Set master admin in localStorage
        this._setMasterAdminToStorage(ocId);
        
        // Also ensure the user is in the admin list in IndexedDB
        const tx = this.IndexedDBHelper.createTransaction(['admin_configs'], 'readwrite');
        const store = this.IndexedDBHelper.getStore(tx, 'admin_configs');
        
        const adminConfig = await this.IndexedDBHelper.get(store, 'admin_config');
        if (!adminConfig) {
            // Create new admin config if it doesn't exist
            const newConfig = createAdminConfigsDocument({
                admin_ocids: [ocId],
                isMasterAdmin: false // We don't use this field anymore, but keep for compatibility
            });
            await this.IndexedDBHelper.put(store, newConfig);
        } else if (!adminConfig.admin_ocids.includes(ocId)) {
            // Add to admin list if not already there
            adminConfig.admin_ocids.push(ocId);
            adminConfig.last_modified_ts = new Date().toISOString();
            await this.IndexedDBHelper.put(store, adminConfig);
        }
        
        return { 
            admin_ocids: [ocId],
            isMasterAdmin: true,
            master_admin_ocid: ocId
        };
    }

    async isMasterAdmin(ocId) {
        const masterAdminOCId = this._getMasterAdminFromStorage();
        
        if (!masterAdminOCId) {
            return false;
        }
        
        return masterAdminOCId === ocId;
    }

    async isAdmin(ocId) {
        // Master admins automatically have admin permissions
        const isMasterAdmin = await this.isMasterAdmin(ocId);
        if (isMasterAdmin) {
            return true;
        }
        
        const tx = this.IndexedDBHelper.createTransaction(['admin_configs'], 'readonly');
        const store = this.IndexedDBHelper.getStore(tx, 'admin_configs');
        
        const adminConfig = await this.IndexedDBHelper.get(store, 'admin_config');
        
        return adminConfig?.admin_ocids?.includes(ocId);
    }

    async makeAdmin(ocId) {
        const tx = this.IndexedDBHelper.createTransaction(['admin_configs'], 'readwrite');
        const store = this.IndexedDBHelper.getStore(tx, 'admin_configs');
        
        const adminConfig = await this.IndexedDBHelper.get(store, 'admin_config');
        if (!adminConfig) {
            throw new Error("Admin config not found");
        }
        
        if (!adminConfig.admin_ocids.includes(ocId)) {
            adminConfig.admin_ocids.push(ocId);
            adminConfig.last_modified_ts = new Date().toISOString();
            await this.IndexedDBHelper.put(store, adminConfig);
        }
        
        return { message: "Admin added successfully" };
    }

    async removeAdmin(ocId) {
        const tx = this.IndexedDBHelper.createTransaction(['admin_configs'], 'readwrite');
        const store = this.IndexedDBHelper.getStore(tx, 'admin_configs');
        
        const adminConfig = await this.IndexedDBHelper.get(store, 'admin_config');
        if (!adminConfig) {
            throw new Error("Admin config not found");
        }
        
        adminConfig.admin_ocids = adminConfig.admin_ocids.filter(id => id !== ocId);
        adminConfig.last_modified_ts = new Date().toISOString();
        await this.IndexedDBHelper.put(store, adminConfig);
        
        return { message: "Admin removed successfully" };
    }

    async getUsers({ page = 0, pageSize = 10, searchText }) {
        const tx = this.IndexedDBHelper.createTransaction(['users'], 'readonly');
        const store = this.IndexedDBHelper.getStore(tx, 'users');
        
        const users = await this.IndexedDBHelper.getAll(store);
        const filteredUsers = searchText 
            ? users.filter(user => user.search_text.toLowerCase().includes(searchText.toLowerCase()))
            : users;
        
        filteredUsers.sort((a, b) => new Date(b.created_ts) - new Date(a.created_ts));
        
        const start = page * pageSize;
        const end = start + pageSize;
        const paginatedUsers = filteredUsers.slice(start, end);
        
        return { 
            users: paginatedUsers, 
            total: filteredUsers.length 
        };
    }

    async getAllListings() {
        const tx = this.IndexedDBHelper.createTransaction(['listings'], 'readonly');
        const listingStore = this.IndexedDBHelper.getStore(tx, 'listings');
        
        const listings = await this.IndexedDBHelper.getAll(listingStore);
        return listings || [];
    }

    async getListingSignups(listingId) {
        const tx = this.IndexedDBHelper.createTransaction(['listings', 'users', 'user_listings', 'vc_issue_jobs'], 'readonly');
        const listingStore = this.IndexedDBHelper.getStore(tx, 'listings');
        const userStore = this.IndexedDBHelper.getStore(tx, 'users');
        const userListingsStore = this.IndexedDBHelper.getStore(tx, 'user_listings');
        const vcJobsStore = this.IndexedDBHelper.getStore(tx, 'vc_issue_jobs');
        
        const listing = await this.IndexedDBHelper.get(listingStore, listingId);
        
        if (!listing) {
            return { data: [], total: 0 };
        }
        
        return new Promise((resolve, reject) => {
            const signups = [];
            
            const userListingsIndex = this.IndexedDBHelper.getIndex(userListingsStore, 'listing_id');
            const signupsRequest = userListingsIndex.openCursor(null, 'prev');
            
            signupsRequest.onsuccess = async (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    const userListing = cursor.value;
                    if (userListing.listing_id === listingId) {
                        try {
                            const user = await this.IndexedDBHelper.get(userStore, userListing.user_id);
                            
                            if (user) {
                                const vcJobs = [];
                                const vcJobsRequest = vcJobsStore.openCursor(null, 'prev');
                                vcJobsRequest.onsuccess = (vcEvent) => {
                                    const vcCursor = vcEvent.target.result;
                                    if (vcCursor) {
                                        const job = vcCursor.value;
                                        if (job.user_id === userListing.user_id && job.listing_id === userListing.listing_id) {
                                            vcJobs.push(job);
                                        }
                                        vcCursor.continue();
                                    } else {
                                        const vcCount = vcJobs.length;
                                        let vcStatus = null;
                                        
                                        if (vcCount > 0) {
                                            const vcPendingCount = vcJobs.filter(job => job.status === VcIssueJobStatus.PENDING).length;
                                            const vcFailedCount = vcJobs.filter(job => job.status === VcIssueJobStatus.FAILED).length;
                                            const vcSuccessCount = vcJobs.filter(job => job.status === VcIssueJobStatus.SUCCESS).length;
                                            
                                            if (vcPendingCount > 0) {
                                                vcStatus = VcIssueJobStatus.PENDING;
                                            } else if (vcFailedCount > 0) {
                                                vcStatus = VcIssueJobStatus.FAILED;
                                            } else if (vcSuccessCount > 0) {
                                                vcStatus = VcIssueJobStatus.SUCCESS;
                                            }
                                        }
                                        
                                        signups.push({
                                            user_id: user.id,
                                            listing_id: listingId,
                                            user_name: user.name,
                                            user_oc_id: user.oc_id,
                                            status: userListing.status,
                                            trigger_mode: listing.trigger_mode,
                                            vc_issue_status: vcStatus,
                                            vc_count: vcCount,
                                            created_ts: userListing.created_ts
                                        });
                                        cursor.continue();
                                    }
                                };
                                vcJobsRequest.onerror = (error) => {
                                    console.error('Error fetching VC jobs:', error);
                                    cursor.continue();
                                };
                            } else {
                                cursor.continue();
                            }
                        } catch (error) {
                            console.warn(`Failed to fetch user ${userListing.user_id}:`, error);
                            cursor.continue();
                        }
                    } else {
                        cursor.continue();
                    }
                } else {
                    resolve({ data: signups, total: signups.length });
                }
            };
            
            signupsRequest.onerror = (error) => {
                console.error('Error fetching signups:', error);
                reject(error);
            };
        });
    }

}

const dbService = new DBService();
export default dbService; 