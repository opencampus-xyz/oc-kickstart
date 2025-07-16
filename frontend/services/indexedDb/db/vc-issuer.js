import { VcIssueJobStatus } from '@/constants.js';

class VCIssuer {
  constructor(dbService) {
    this.ocaIssuanceUrl = process.env.NEXT_PUBLIC_OCA_ISSUANCE_URL;
    this.ocaIssuanceApiKey = process.env.NEXT_PUBLIC_OCA_ISSUANCE_API_KEY;
    this.maxRetries = 3;
    this.intervalId = null;
    this.dbService = dbService;
  }

  async queryPendingVCJobs() {
    return await this.dbService.queryPendingVCJobs()
  }

  async issueVC(job) {
    const { id: jobId, retry_count, payload } = job;
    let result = {};
    try {
      const response = await fetch(this.ocaIssuanceUrl, {
        method: "POST",
        body: JSON.stringify(payload),
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": this.ocaIssuanceApiKey,
        },
      });

      result.status_code = response.status;
      result.status_text = response.statusText;
      
      try {
        result.data = await response.json();
      } catch (jsonError) {
        console.error(`[VCIssuer] Failed to parse JSON response:`, jsonError);
        result.data = null;
      }
    } catch (error) {
      result.error = error.message;
    }

    try {
      if (result.status_code === 200) {
        await this.updateVCJobStatus(jobId, VcIssueJobStatus.SUCCESS);
      } else if (result.status_code === 400 && result.data?.error?.subType === 'DUPLICATE_ISSUANCE_ERROR') {
        await this.updateVCJobStatus(jobId, VcIssueJobStatus.FAILED);
      } else if (result.status_code !== 500) {
        await this.updateVCJobStatus(jobId, VcIssueJobStatus.FAILED);
      } else if (result.status_code === 500) {
        if (retry_count < this.maxRetries) {
          await this.incrementVCJobRetryCount(jobId);
          await this.updateVCJobStatus(jobId, VcIssueJobStatus.FAILED);
        }
      }
    } catch (error) {
      console.error('[VCIssuer] Error updating VC job status:', error);
    }

    return result;
  }

  async updateVCJobStatus(jobId, status) {
    if (!this.dbService.db) {
      console.warn('Database not ready yet, skipping VC job status update');
      return;
    }
    
    return new Promise((resolve, reject) => {
      const transaction = this.dbService.db.transaction(['vc_issue_jobs'], 'readwrite');
      const store = transaction.objectStore('vc_issue_jobs');
      
      const getRequest = store.get(jobId);
      
      getRequest.onsuccess = () => {
        const job = getRequest.result;
        if (job) {
          job.status = status;
          job.last_modified_ts = new Date().toISOString();
          
          const updateRequest = store.put(job);
          updateRequest.onsuccess = () => resolve(updateRequest.result);
          updateRequest.onerror = (error) => {
            console.error('Error updating VC job status:', error);
            reject(error);
          };
        } else {
          reject(new Error(`VC job with ID ${jobId} not found`));
        }
      };
      
      getRequest.onerror = (error) => {
        console.error('Error getting VC job:', error);
        reject(error);
      };
    });
  }

  async incrementVCJobRetryCount(jobId) {
    if (!this.dbService.db) {
      console.warn('Database not ready yet, skipping VC job retry count increment');
      return;
    }
    
    return new Promise((resolve, reject) => {
      const transaction = this.dbService.db.transaction(['vc_issue_jobs'], 'readwrite');
      const store = transaction.objectStore('vc_issue_jobs');
      
      const getRequest = store.get(jobId);
      
      getRequest.onsuccess = () => {
        const job = getRequest.result;
        if (job) {
          job.retry_count = (job.retry_count || 0) + 1;
          job.last_modified_ts = new Date().toISOString();
          
          const updateRequest = store.put(job);
          updateRequest.onsuccess = () => resolve(updateRequest.result);
          updateRequest.onerror = (error) => {
            console.error('Error incrementing VC job retry count:', error);
            reject(error);
          };
        } else {
          reject(new Error(`VC job with ID ${jobId} not found`));
        }
      };
      
      getRequest.onerror = (error) => {
        console.error('Error getting VC job:', error);
        reject(error);
      };
    });
  }

  async run() {
    try {
      const pendingVCJobs = await this.queryPendingVCJobs();
      if (!pendingVCJobs.length) {
        return;
      }
      
      await Promise.allSettled(
        pendingVCJobs.map(async (job) => await this.issueVC(job))
      );
      
    } catch (error) {
      console.error('Error running VC issuer:', error);
    }
  }

  checkConfiguration() {
    if (!this.ocaIssuanceUrl) {
      throw new Error('ERROR: NEXT_PUBLIC_OCA_ISSUANCE_URL is not set');
    }
    
    if (!this.ocaIssuanceApiKey) {
      throw new Error('ERROR: NEXT_PUBLIC_OCA_ISSUANCE_API_KEY is not set');
    }
  }

  startService(intervalMs) {
    this.checkConfiguration();
    if (this.intervalId) {
      this.stopService();
    }
    
    this.run();
    
    this.intervalId = setInterval(() => {
      this.run();
    }, intervalMs);
  }

  stopService() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

}

export class VCIssuerService {
  constructor() {
    this.intervalId = null;
  }

  static getInstance(dbService) {
    if (!VCIssuerService.instance) {
      VCIssuerService.instance = new VCIssuer(dbService);
    }
    return VCIssuerService.instance;
  }
}

export default VCIssuerService;
