import { BaseServiceProvider } from "../providers";

export class BackendServiceProvider extends BaseServiceProvider {
  _authToken;
  _serviceEndpoint;

  constructor(authToken, serviceEndpoint) {
    super();
    this._authToken = authToken;
    this._serviceEndpoint = serviceEndpoint;
    this._isInit = true;
  }

  async _fetchWithAuthToken(url, options) {
    if(!this._authToken) return {};
    const headers = {
      ...options.headers,
      Authorization: `Bearer ${this._authToken}`,
    };

    const response = await fetch(`${this._serviceEndpoint}${url}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const respBody = await response.json();
      throw new Error(respBody?.error?.message || "Unknown API error");
    }

    return response;
  }

  // Public endpoints
  async publicGetAchievementsByOCId(ocId, { page = 0, pageSize = 10 }) {
    const urlParams = new URLSearchParams({ page, pageSize }).toString();
    const response = await fetch(`${this._serviceEndpoint}/public/achievements/${ocId}?${urlParams}`,
    {
      method: "GET",
    });
    return response.json();
  }

  async publicGetListingById(id) {
    const response = await fetch(`${this._serviceEndpoint}/public/listings/${id}`, {
      method: "GET",
    });
    return response.json();
  }

  async publicGetListings({searchTitle, searchTags, page, pageSize}) {
    const urlParams = new URLSearchParams({
      page,
      pageSize,
    });

    if(!!searchTags?.length){
      urlParams.set('searchTags', searchTags)
    }

    if(!!searchTitle?.length){
      urlParams.set('searchTitle', searchTitle)
    }

    const response = await fetch(`${this._serviceEndpoint}/public/listings?${urlParams}`, {
      method: "GET",
    });

    return response.json();
  }

  async publicGetTags() {
    const response = await fetch(`${this._serviceEndpoint}/public/tags`, {
      method: "GET",
    });
    return response.json();
  }

  // ===== User Endpoints =====
  async getSelfUser() {
    const response = await this._fetchWithAuthToken("/user", {
      method: "GET",
    });

    return response.json();
  }

  async signUp(name, email) {
    const response = await this._fetchWithAuthToken("/signup", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name, email }),
    });

    return response.json();
  }

  // Auth User Endpoints
  async updateUsername(username) {
    const response = await this._fetchWithAuthToken("/auth-user/update-username", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username }),
    });

    return response.json();
  }
  
  async getListings({searchTitle, searchTags, page, pageSize, searchStatus}) {
    const urlParams = new URLSearchParams({
      page,
      pageSize,
    });

    if(searchStatus){
      urlParams.set('searchStatus', searchStatus)
    }

    if(!!searchTags?.length){
      urlParams.set('searchTags', searchTags)
    }

    if(!!searchTitle?.length){
      urlParams.set('searchTitle', searchTitle)
    }

    const response = await this._fetchWithAuthToken(`/auth-user/listings?${urlParams}`, {
      method: "GET",
    });

    return response.json();
  }

  async signupForListing(listingId) {
    const response = await this._fetchWithAuthToken("/auth-user/signup-for-listing", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ listingId }),
    });

    return response.json();
  }
  async getUserSignups({ page = 0, pageSize = 10, searchText }) {
    const urlParams = new URLSearchParams({
      page,
      pageSize,
    });

    if(!!searchText?.length){
      urlParams.set('searchText', 'searchText')
    }

    const response = await this._fetchWithAuthToken(`/auth-user/sign-ups?${urlParams}`, {
      method: "GET",
    });

    return response.json();
  }

  async getUserListingSignUpStatus(listingId) {
    const response = await this._fetchWithAuthToken(`/auth-user/listing-signup-status/${listingId}`, {
      method: "GET",
    });

    return response.json();
  }

  // ===== Admin Endpoints =====
  async adminCreateTag(tagData) {
    const response = await this._fetchWithAuthToken("/admin/tag", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(tagData),
    });

    return response.json();
  }

  async adminUpdateTag(tagId, tagData) {
    const response = await this._fetchWithAuthToken(`/admin/tag/${tagId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(tagData),
    });

    return response.json();
  }

  async adminArchiveTag(tagId) {
    const response = await this._fetchWithAuthToken(`/admin/tag/${tagId}/archive`, {
      method: "POST",
    });

    return response.json();
  }

  async adminGetListings({
    page = 0,
    pageSize = 10,
    searchText,
  } = {}) {
    const urlParams = new URLSearchParams({
      page,
      pageSize,
    });

    if(searchText){
      urlParams.set('searchText', searchText)
    }

    const response = await this._fetchWithAuthToken(`/admin/listings?${urlParams}`, {
      method: "GET",
    });
    return response.json();
  }

  async adminGetListingById(id) {
    const response = await this._fetchWithAuthToken(`/admin/listings/${id}`, {
      method: "GET",
    });
    return response.json();
  }

  async adminGetListingSignups(listingId) {
    const response = await this._fetchWithAuthToken(`/admin/listings/${listingId}/signups`, {
      method: "GET",
    });
    return response.json();
  }

  async adminUpdateSignupStatus(userId, listingId, status) {
    const response = await this._fetchWithAuthToken(`/admin/listings/${listingId}/signups/${userId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status }),
    });

    return response.json();
  }

  async adminCreateVCIssueJobs(userId, listingId) {
    const response = await this._fetchWithAuthToken(`/admin/listings/${listingId}/issue`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ userId }),
    });

    return response.json();
  }

  async adminCreateListing(listingData) {
    const response = await this._fetchWithAuthToken("/admin/listings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(listingData),
    });

    return response.json();
  }

  async adminUpdateListing(id, listingData) {
    const response = await this._fetchWithAuthToken(`/admin/listings/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(listingData),
    });

    return response.json();
  }

  async adminPublishListing(id) {
    const response = await this._fetchWithAuthToken(`/admin/listings/${id}/publish`, {
      method: "POST",
    });

    return response.json();
  }

  async adminDeleteListing(id) {
    const response = await this._fetchWithAuthToken(`/admin/listings/${id}/delete`, {
      method: "POST",
    });

    return response.json();
  }

  async adminGetUsers({ page = 0, pageSize = 10, searchText }) {
    const urlParams = new URLSearchParams({
      page,
      pageSize,
    });

    if(searchText?.length){
      urlParams.set('searchText', searchText)
    }

    const response = await this._fetchWithAuthToken(`/admin/users?${urlParams}`, {
      method: "GET",
    });

    return response.json();
  }

  async adminGetTags({page = 0, pageSize = 10, searchText}) {
    const urlParams = new URLSearchParams({
      page,
      pageSize,
    });

    if(searchText?.length){
      urlParams.set('searchText', searchText)
    }

    const response = await this._fetchWithAuthToken(`/admin/tags?${urlParams}`, {
      method: "GET",
    });

    return response.json();
  }

  async adminAddTagToListings(tagId, listingIds) {
    const response = await this._fetchWithAuthToken(`/admin/tags/${tagId}/add-to-listings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ listingIds }),
    });

    return response.json();
  }

  // ===== Admin Management =====
  async getAdminConfig() {
    const response = await this._fetchWithAuthToken("/master-admin/admin-configs", {
      method: "GET",
    });

    return response.json();
  }

  async setAdminOCIDs(adminOCIDs) {
    const response = await this._fetchWithAuthToken("/master-admin/admin-configs", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ adminOCIDs }),
    });

    return response.json();
  }
}
