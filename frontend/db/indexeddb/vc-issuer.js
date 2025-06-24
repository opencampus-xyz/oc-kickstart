import dbService from './dbService.js';
import { VcIssueJobStatus } from '../../constants.js';

class VCIssuer {
  constructor() {
    this.ocaIssuanceUrl = process.env.NEXT_PUBLIC_OCA_ISSUANCE_URL;
    this.ocaIssuanceApiKey = process.env.NEXT_PUBLIC_OCA_ISSUANCE_API_KEY;
    this.maxRetries = 3;
    this.intervalId = null;
  }

  async queryPendingVCJobs() {
    
    if (!dbService.db) {1
      return [];
    }
    
    return new Promise((resolve, reject) => {
      try {
        const transaction = dbService.db.transaction(['vc_issue_jobs'], 'readonly');
        const store = transaction.objectStore('vc_issue_jobs');
        const index = store.index('status');

        const request = index.getAll(VcIssueJobStatus.PENDING);
        
        request.onsuccess = () => {
          const pendingJobs = request.result || [];

          resolve(pendingJobs);
        };
        
        request.onerror = (error) => {
          console.error('Error querying pending VC jobs:', error);
          console.error('Error details:', {
            error: error.target?.error,
            errorCode: error.target?.error?.code,
            errorName: error.target?.error?.name
          });
          reject(error);
        };
      } catch (error) {
        console.error('Error creating transaction:', error);
        reject(error);
      }
    });
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
        await this.updateVCJobStatus(jobId, VcIssueJobStatus.SUCCESS);
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
    await dbService.initPromise;
    
    if (!dbService.db) {
      console.warn('Database not ready yet, skipping VC job status update');
      return;
    }
    
    return new Promise((resolve, reject) => {
      const transaction = dbService.db.transaction(['vc_issue_jobs'], 'readwrite');
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
    await dbService.initPromise;
    
    if (!dbService.db) {
      console.warn('Database not ready yet, skipping VC job retry count increment');
      return;
    }
    
    return new Promise((resolve, reject) => {
      const transaction = dbService.db.transaction(['vc_issue_jobs'], 'readwrite');
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
      
      const results = await Promise.allSettled(
        pendingVCJobs.map(async (job) => await this.issueVC(job))
      );
      
    } catch (error) {
      console.error('Error running VC issuer:', error);
    }
  }

  checkConfiguration() {
    if (!this.ocaIssuanceUrl) {
      console.error('ERROR: NEXT_PUBLIC_OCA_ISSUANCE_URL is not set');
      return false;
    }
    
    if (!this.ocaIssuanceApiKey) {
      console.error('ERROR: NEXT_PUBLIC_OCA_ISSUANCE_API_KEY is not set');
      return false;
    }
    
    return true;
  }

  async testIssuer() {
    if (!this.checkConfiguration()) {
      console.error('VC Issuer is not properly configured');
      return;
    }
    
    const { jobs, statusCounts } = await this.checkVCJobsStatus();
    
    const pendingJobs = jobs.filter(job => job.status === VcIssueJobStatus.PENDING);
    
    if (pendingJobs.length > 0) {
      await this.run();
      
      const { statusCounts: newStatusCounts } = await this.checkVCJobsStatus();
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

  async checkVCJobsStatus() {
    await dbService.initPromise;
    
    if (!dbService.db) {
      console.warn('Database not ready yet, skipping VC jobs status check');
      return { jobs: [], statusCounts: {} };
    }
    
    return new Promise((resolve, reject) => {
      const transaction = dbService.db.transaction(['vc_issue_jobs'], 'readonly');
      const store = transaction.objectStore('vc_issue_jobs');
      
      const request = store.getAll();
      
      request.onsuccess = () => {
        const jobs = request.result || [];
        const statusCounts = jobs.reduce((acc, job) => {
          acc[job.status] = (acc[job.status] || 0) + 1;
          return acc;
        }, {});
        
        resolve({ jobs, statusCounts });
      };
      
      request.onerror = (error) => {
        console.error('Error checking VC jobs status:', error);
        reject(error);
      };
    });
  }
}

export class VCIssuerService {
  constructor() {
    this.intervalId = null;
  }

  static getInstance() {
    if (!VCIssuerService.instance) {
      VCIssuerService.instance = new VCIssuer();
    }
    return VCIssuerService.instance;
  }
}

export default VCIssuerService;
