export class BaseServiceProvider {
  _isInit = false;

  get isInit() {
    return this._isInit;
  }

  async init() {
    // unimplemented
  }

  // Public endpoints
  async publicGetAchievementsByOCId(ocId, { page = 0, pageSize = 10 }) {}

  async publicGetListingById(id) {}

  async publicGetListings({searchTitle, searchTags, page, pageSize}) {}

  async publicGetTags() {}

  // ===== User Endpoints =====
  async getSelfUser() {}

  async signUp(name, email) {}

  // Auth User Endpoints
  async updateUsername(username) {}
  
  async getListings({searchTitle, searchTags, page, pageSize, searchStatus}) {}

  async signupForListing(listingId) {}

  async getUserSignups({ page = 0, pageSize = 10, searchText }) {}

  async getUserListingSignUpStatus(listingId) {}

  // ===== Admin Endpoints =====
  async adminCreateTag(tagData) {}

  async adminUpdateTag(tagId, tagData) {}

  async adminArchiveTag(tagId) {}

  async adminGetListings({
    page = 0,
    pageSize = 10,
    searchText,
  }) {}

  async adminGetListingById(id) {}

  async adminGetListingSignups(listingId) {}

  async adminUpdateSignupStatus(userId, listingId, status) {}

  async adminCreateVCIssueJobs(userId, listingId) {}

  async adminCreateListing(listingData) {}

  async adminUpdateListing(id, listingData) {}

  async adminPublishListing(id) {}

  async adminDeleteListing(id) {}

  async adminGetUsers({ page = 0, pageSize = 10, searchText }) {}

  async adminGetTags({page =0, pageSize=10,searchText}) {}

  async adminAddTagToListings(tagId, listingIds) {}

  // ===== Admin Management =====
  async getAdminConfig() {}

  async setAdminOCIDs(adminOCIDs) {}
}
