"use client";
import { DBService } from "@/db";
import { 
    UserListingStatus, 
    ListingStatus, 
    ListingTriggerMode,
    createUserDocument,
    createListingDocument,
    createTagDocument,
    createAdminConfigsDocument,
    initDatabase
} from "@/db/DBsetup";

const seedData = {
    users: [
        {
            id: 1,
            name: "Test User",
            email: "test@example.com",
            oc_id: "test_oc_id",
            signups: [
                [1, UserListingStatus.APPROVED],
                [2, UserListingStatus.PENDING]
            ]
        },
        {
            id: 2,
            name: "Another User",
            email: "another@example.com",
            oc_id: "another_oc_id",
            signups: [
                [1, UserListingStatus.DECLINED]
            ]
        }
    ],
    listings: [
        {
            id: 1,
            name: "Test Listing 1",
            description: "This is a test listing",
            status: ListingStatus.ACTIVE,
            trigger_mode: ListingTriggerMode.MANUAL,
            published_ts: new Date().toISOString(),
            tags: [1, 2],
            signups: [
                [1, UserListingStatus.APPROVED],
                [2, UserListingStatus.DECLINED]
            ]
        },
        {
            id: 2,
            name: "Test Listing 2",
            description: "Another test listing",
            status: ListingStatus.DRAFT,
            trigger_mode: ListingTriggerMode.AUTO,
            tags: [1],
            signups: [
                [1, UserListingStatus.PENDING]
            ]
        }
    ],
    tags: [
        {
            id: 1,
            name: "Test Tag 1",
            archived_ts: null
        },
        {
            id: 2,
            name: "Test Tag 2",
            archived_ts: null
        }
    ],
    admin_configs: {
        id: 1,
        vc_issue_enabled: true,
        vc_issue_auto_approve: false
    }
};

export async function seedDatabase() {
    try {
        // First, ensure database is initialized
        const db = await initDatabase();
        
        // Create a new DBService instance
        const dbService = new DBService();
        await dbService.init();

        // Clear existing data
        const stores = ['users', 'listings', 'tags', 'admin_configs'];
        for (const storeName of stores) {
            const tx = db.transaction(storeName, 'readwrite');
            const store = tx.objectStore(storeName);
            await store.clear();
        }

        // Insert users
        for (const user of seedData.users) {
            const tx = db.transaction('users', 'readwrite');
            const store = tx.objectStore('users');
            await store.add(createUserDocument(user));
        }

        // Insert listings
        for (const listing of seedData.listings) {
            const tx = db.transaction('listings', 'readwrite');
            const store = tx.objectStore('listings');
            await store.add(createListingDocument(listing));
        }

        // Insert tags
        for (const tag of seedData.tags) {
            const tx = db.transaction('tags', 'readwrite');
            const store = tx.objectStore('tags');
            await store.add(createTagDocument(tag));
        }

        // Insert admin configs
        const tx = db.transaction('admin_configs', 'readwrite');
        const store = tx.objectStore('admin_configs');
        await store.add(createAdminConfigsDocument(seedData.admin_configs));

        return "Database seeded successfully!";
    } catch (error) {
        console.error('Error seeding database:', error);
        throw error;
    }
} 