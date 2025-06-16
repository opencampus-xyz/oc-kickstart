"use client";

export const UserListingStatus = {
    PENDING: 'pending',
    DECLINED: 'declined',
    APPROVED: 'approved',
    COMPLETED: 'completed'
};

export const ListingTriggerMode = {
    MANUAL: 'manual',
    AUTO: 'auto'
};

export const ListingStatus = {
    DRAFT: 'draft',
    ACTIVE: 'active',
    DELETED: 'deleted'
};

export const VcIssueJobStatus = {
    PENDING: 'pending',
    SUCCESS: 'success',
    FAILED: 'failed'
};

const DB_NAME = 'oc_generics_db';
const DB_VERSION = 2;

export function initDatabase() {
    // Only run on client side
    if (typeof window === 'undefined') {
        return Promise.resolve(null);
    }

    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = (event) => {
            console.error('Database error:', event.target.error);
            reject(event.target.error);
        };

        request.onsuccess = (event) => {
            const db = event.target.result;
            console.log('Database opened successfully');
            resolve(db);
        };

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            console.log('Database upgrade needed');

            // Create object stores and indexes
            createObjectStores(db);
        };
    });
}

function createObjectStores(db) {

    // Users store
    const usersStore = db.createObjectStore('users', { keyPath: 'id' });
    usersStore.createIndex('email', 'email', { unique: true });
    usersStore.createIndex('oc_id', 'oc_id', { unique: true });
    usersStore.createIndex('search_text', 'search_text', { unique: false });
    usersStore.createIndex('signups', 'signups', { unique: false, multiEntry: true }); // Array of { listing_id, status, created_ts }

    // Listings store
    const listingsStore = db.createObjectStore('listings', { keyPath: 'id' });
    listingsStore.createIndex('name', 'name', { unique: false });
    listingsStore.createIndex('description', 'description', { unique: false });
    listingsStore.createIndex('published_ts', 'published_ts', { unique: false });
    listingsStore.createIndex('deleted_ts', 'deleted_ts', { unique: false });
    listingsStore.createIndex('created_ts', 'created_ts', { unique: false });
    listingsStore.createIndex('last_modified_ts', 'last_modified_ts', { unique: false });
    listingsStore.createIndex('trigger_mode', 'trigger_mode', { unique: false });
    listingsStore.createIndex('status', 'status', { unique: false });
    listingsStore.createIndex('published_by', 'published_by', { unique: false });
    listingsStore.createIndex('sign_ups_limit', 'sign_ups_limit', { unique: false });
    listingsStore.createIndex('vc_properties', 'vc_properties', { unique: false });
    listingsStore.createIndex('signups', 'signups', { unique: false, multiEntry: true }); //array of [user_id, status]
    listingsStore.createIndex('tags', 'tags', { unique: false, multiEntry: true }); //array of tag_id

    // User-Listings junction store
    const userListingsStore = db.createObjectStore('user_listings', { keyPath: ['user_id', 'listing_id'] });
    userListingsStore.createIndex('user_id', 'user_id', { unique: false });
    userListingsStore.createIndex('listing_id', 'listing_id', { unique: false });

    // Tags store
    const tagsStore = db.createObjectStore('tags', { keyPath: 'id' });
    tagsStore.createIndex('description', 'description', { unique: false });
    tagsStore.createIndex('name', 'name', { unique: true });
    tagsStore.createIndex('archived_ts', 'archived_ts', { unique: false });
    tagsStore.createIndex('created_ts', 'created_ts', { unique: false });
    tagsStore.createIndex('last_modified_ts', 'last_modified_ts', { unique: false });
    tagsStore.createIndex('can_issue_oca', 'can_issue_oca', { unique: false });
    tagsStore.createIndex('vc_properties', 'vc_properties', { unique: false });

    // VC Issue Jobs store
    const vcIssueJobsStore = db.createObjectStore('vc_issue_jobs', { keyPath: 'id' });
    vcIssueJobsStore.createIndex('status', 'status', { unique: false });
    vcIssueJobsStore.createIndex('created_ts', 'created_ts', { unique: false });
    vcIssueJobsStore.createIndex('last_modified_ts', 'last_modified_ts', { unique: false });
    vcIssueJobsStore.createIndex('vc_properties', 'vc_properties', { unique: false });

    // Admin configs store
    const admin_configsStore = db.createObjectStore('admin_configs', { keyPath: 'id' });
    admin_configsStore.createIndex('admin_ocids', 'admin_ocids', { unique: false });
    admin_configsStore.createIndex('isMasterAdmin', 'isMasterAdmin', { unique: true });

}

export function addTimestamps(obj) {
    const now = new Date().toISOString();
    return {
        ...obj,
        created_ts: now,
        last_modified_ts: now
    };
}

export function createUserDocument(userData) {
    return addTimestamps({
        ...userData,
        id: crypto.randomUUID(), // Generate a unique ID
        signups: [], // Array of { listing_id, status, created_ts }
        profile: userData.profile || {},
        search_text: `${userData.name || ''} ${userData.email || ''}`.trim()
    });
}

export function createListingDocument(listingData) {
    return addTimestamps({
        ...listingData,
        id: crypto.randomUUID(), // Generate a unique ID
        tags: [], // Array of tag_id
        signups: [], // Array of [user_id, status]
        vc_properties: listingData.vc_properties || {},
        status: listingData.status || ListingStatus.DRAFT,
        trigger_mode: listingData.trigger_mode || ListingTriggerMode.MANUAL,
        sign_ups_limit: listingData.sign_ups_limit || null,
        published_ts: listingData.published_ts || null,
        deleted_ts: listingData.deleted_ts || null
    });
}

export function createTagDocument(tagData) {
    return addTimestamps({
        ...tagData,
        id: crypto.randomUUID(), // Generate a unique ID
        listings: [], // Array of listing_id
        vc_properties: tagData.vc_properties || {},
        can_issue_oca: tagData.can_issue_oca || false,
        archived_ts: tagData.archived_ts || null
    });
}

export function createAdminConfigsDocument(configData) {
    return {
        id: 'admin_config',
        admin_ocids: configData.admin_ocids || [],
        ...addTimestamps(configData)
    };
}

export {
    DB_NAME,
    DB_VERSION
}; 