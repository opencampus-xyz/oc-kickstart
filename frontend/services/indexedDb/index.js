import { BaseServiceProvider } from "../providers";
import { DBService } from "./db/dbService";
import VCIssuerService from "./db/vc-issuer";

export class IndexedDbServiceProvider extends BaseServiceProvider {
  _dbService;
  _userOcId;

  constructor(userOcId) {
    super();
    this._dbService = new DBService();
    this._userOcId = userOcId;
    this.vcIssuerInitialized = false;
  }

  async _initVCIssuer() {
    if (this.vcIssuerInitialized) {
      return;
    }

    const vcIssuer = VCIssuerService.getInstance(this._dbService);
    vcIssuer.startService(
      Math.max(
        30000,
        (parseInt(process.env.NEXT_PUBLIC_VC_ISSUER_INTERVAL) || 30) * 1000
      )
    );

    this.vcIssuerInitialized = true;
  }

  async init() {
    if (!this.isInit) {
      await this._dbService.init();
      await this._initVCIssuer();
      this._isInit = true;
    }
  }

  // ===== Public Endpoints =====
  async publicGetAchievementsByOCId(ocId, { page = 0, pageSize = 10 }) {
    let achievements = [],
      total = 0;
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_ANALYTICS_URL}?pageSize=${pageSize}&page=${page-1}&holderOcid=${ocId}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      const analyticsResp = await response.json();
      total = analyticsResp.total;
      const metadataEndpoints = analyticsResp.data.map(
        (data) => data.metadataEndpoint
      );
      await Promise.all(
        metadataEndpoints.map(async (metadataEndpoint) => {
          try {
            const achievementMetadata = await fetch(metadataEndpoint);
            const metadataResult = await achievementMetadata.json();
            if (metadataResult.metadata) {
              achievements.push(metadataResult.metadata);
            }
          } catch (error) {
            console.error(error);
            throw new Error("Failed to fetch achievements");
          }
        })
      );
    } catch (error) {
      console.error(error);
      throw new Error("Failed to fetch achievements");
    }
    return { data: achievements, total };
  }

  async publicGetListingById(id) {
    return await this._dbService.getPublicListingById(id);
  }

  async publicGetListings({
    page,
    pageSize,
    searchTitle,
    searchStatus,
    searchTags,
  }) {
    return await this._dbService.getListings({
      page: parseInt(page) || 0,
      pageSize: parseInt(pageSize) || 10,
      searchText: searchTitle,
      searchTags: searchTags,
      searchStatus: searchStatus,
    });
  }

  async publicGetTags() {
    const tagsResponse = await this._dbService.getTags();
    return tagsResponse.data;
  }

  // ===== User Endpoints =====
  async getSelfUser() {
    const userData = await this._dbService.getUserByOCId(this._userOcId);

    if (!userData) {
      return {
        isAdmin: false,
        isMasterAdmin: false,
        isRegisteredUser: false,
        user: null,
      };
    } else {
      return userData;
    }
  }
  // Method Interfaces
  async signUp(name, email) {
    const userData = {
      name: name || "",
      email: email || "",
      oc_id: this._userOcId,
      profile: {},
      signups: [],
    };
    const response = await this._dbService.createUser(userData);
    return {
      isAdmin: false,
      isMasterAdmin: false,
      isRegisteredUser: true,
      user: response,
    };
  }

  // Auth User Endpoints
  async updateUsername(username) {
    return await this._dbService.updateUsername(this._userOcId, username);
  }

  async getListings({ page, pageSize, searchTitle, searchStatus, searchTags }) {
    const userForListings = await this._dbService.getAuthUserByOcId(
      this._userOcId
    );
    return await this._dbService.getListings({
      page: parseInt(page) || 0,
      pageSize: parseInt(pageSize) || 10,
      searchText: searchTitle,
      searchTags: searchTags,
      searchStatus: searchStatus,
      includeUserSignups: true,
      userId: userForListings?.id,
    });
  }

  async signupForListing(listingId) {
    const user = await this._dbService.getAuthUserByOcId(this._userOcId);
    if (!user?.name) {
      throw new Error("Missing username for signing up for listing");
    }
    await this._dbService.signupForListing(user.id, listingId);
    return { message: "Signed up for listing successfully" };
  }

  async getUserSignups({ page = 0, pageSize = 10, searchText }) {
    const userForSignups = await this._dbService.getAuthUserByOcId(
      this._userOcId
    );
    return await this._dbService.getUserSignups({
      page: parseInt(page) || 0,
      pageSize: parseInt(pageSize) || 10,
      searchText: searchText,
      userId: userForSignups?.id,
    });
  }

  async getUserListingSignUpStatus(listingId) {
    const user = await this._dbService.getAuthUserByOcId(this._userOcId);
    if (!user) {
      return { sign_up_status: null };
    }
    return await this._dbService.getUserListingStatus(user.id, listingId);
  }

  // ===== Admin Endpoints =====
  async adminCreateTag(tagData) {
    return await this._dbService.createTag(tagData);
  }

  async adminUpdateTag(tagData) {
    return await this._dbService.updateTag(tagData);
  }

  async adminArchiveTag(tagId) {
    return await this._dbService.archiveTag(tagId);
  }

  async adminGetListings({ page = 0, pageSize = 10, searchText } = {}) {
    const data = await this._dbService.getListings({
      page: parseInt(page) || 0,
      pageSize: parseInt(pageSize) || 10,
      searchText: searchText,
      includeUserSignups: false,
      showAllStatuses: true,
    });
    return data;
  }

  async adminGetListingById(id) {
    return await this._dbService.getListingById(id);
  }

  async adminGetListingSignups(listingId) {
    return await this._dbService.getListingSignups(listingId);
  }

  async adminUpdateSignupStatus(userId, listingId, status) {
    return await this._dbService.updateSignupStatus(userId, listingId, status);
  }

  async adminCreateVCIssueJobs(userId, listingId) {
    return await this._dbService.createVCIssueJobs(userId, listingId);
  }

  async adminCreateListing(listingData) {
    return await this._dbService.createListing(listingData);
  }

  async adminUpdateListing(id, listingData) {
    return await this._dbService.updateListing(id, listingData);
  }

  async adminPublishListing(id) {
    return await this._dbService.updateListingStatus(id, "active");
  }

  async adminDeleteListing(id) {
    return await this._dbService.updateListingStatus(id, "deleted");
  }

  async adminGetUsers({ page = 0, pageSize = 10, searchText }) {
    const usersResponse = await this._dbService.getUsers({
      page: parseInt(page) || 0,
      pageSize: parseInt(pageSize) || 10,
      searchText: searchText,
    });
    return {
      data: usersResponse.users,
      total: usersResponse.total,
    };
  }

  async adminGetTags({ page = 0, pageSize = 10, searchText }) {
    return await this._dbService.getTags({ page, pageSize, searchText });
  }

  async adminAddTagToListings(tagId, listingIds) {
    try {
      await this._dbService.addTagToListings(tagId, listingIds);
      return { status: "successful" };
    } catch (error) {
      console.error("Error in add-tag interceptor:", error);
      throw error;
    }
  }

  // ===== Admin Management =====
  async getAdminConfig() {
    return await this._dbService.adminConfig();
  }

  async setAdminOCIDs(adminOCIDs) {
    return await this._dbService.adminConfig(adminOCIDs);
  }
}
