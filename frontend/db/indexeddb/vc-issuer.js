import dbService from './dbService.js';

class VCIssuer {
  constructor() {
    this.ocaIssuanceUrl = process.env.NEXT_PUBLIC_OCA_ISSUANCE_URL;
    this.ocaIssuanceApiKey = process.env.NEXT_PUBLIC_OCA_ISSUANCE_API_KEY;
    this.maxRetries = 3;
    this.intervalId = null;
  }

  async queryPendingVCJobs() {
    await dbService.initPromise;
    
    if (!dbService.db) {
      console.warn('Database not ready yet, skipping VC job query');
      return [];
    }
    
    console.log('Querying for pending VC jobs...');
    console.log('Database state:', {
      dbExists: !!dbService.db,
      dbName: dbService.db?.name,
      dbVersion: dbService.db?.version
    });
    
    return new Promise((resolve, reject) => {
      try {
        const transaction = dbService.db.transaction(['vc_issue_jobs'], 'readonly');
        const store = transaction.objectStore('vc_issue_jobs');
        const index = store.index('status');
        
        console.log('Transaction created, store:', store.name);
        console.log('Index created:', index.name);
        
        const request = index.getAll('pending');
        
        request.onsuccess = () => {
          const pendingJobs = request.result || [];
          console.log(`Found ${pendingJobs.length} pending VC jobs:`, pendingJobs.map(job => ({
            id: job.id,
            user_id: job.user_id,
            listing_id: job.listing_id,
            status: job.status,
            retry_count: job.retry_count
          })));
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

    console.log(`Issuing VC for job ${jobId} (retry: ${retry_count})`);
    console.log('Payload:', payload);

    let result = {};
    try {
      console.log(`Making request to ${this.ocaIssuanceUrl}`);
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
      result.data = await response.json();
      
      console.log(`VC issuance response: ${result.status_code} ${result.status_text}`, result.data);
    } catch (error) {
      result.error = error.message;
      console.error('VC issuance error:', error);
    }

    try {
      // Update job status based on response
      if (result.status_code === 200) {
        await this.updateVCJobStatus(jobId, 'success');
      } else if (result.status_code !== 500) {
        await this.updateVCJobStatus(jobId, 'failed');
      } else if (result.status_code === 500) {
        if (retry_count < this.maxRetries) {
          await this.incrementVCJobRetryCount(jobId);
        } else {
          await this.updateVCJobStatus(jobId, 'failed');
          await this.incrementVCJobRetryCount(jobId);
        }
      }
    } catch (error) {
      console.error('Error updating VC job:', error);
    }

    return result;
  }

  async updateVCJobStatus(jobId, status) {
    await dbService.initPromise;
    
    // Additional safety check
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
          job.updated_at = new Date().toISOString();
          
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
    
    // Additional safety check
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
          job.updated_at = new Date().toISOString();
          
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
    console.log('=== VC Issuer Run Started ===');
    try {
      const pendingVCJobs = await this.queryPendingVCJobs();
      console.log(`Found ${pendingVCJobs.length} pending VC jobs`);
      
      if (!pendingVCJobs.length) {
        console.log('No pending jobs to process');
        return;
      }

      console.log(
        `Issuing ${pendingVCJobs.length} VC jobs at ${new Date().toISOString()}`
      );
      
      const results = await Promise.allSettled(
        pendingVCJobs.map(async (job) => await this.issueVC(job))
      );
      
      console.log('VC issuance results:', results.map((result, index) => ({
        jobId: pendingVCJobs[index].id,
        status: result.status,
        value: result.value,
        reason: result.reason
      })));
      
      console.log('=== VC Issuer Run Completed ===');
    } catch (error) {
      console.error('Error running VC issuer:', error);
      console.log('=== VC Issuer Run Failed ===');
    }
  }

  // Check if the issuer is properly configured
  checkConfiguration() {
    console.log('VC Issuer Configuration:');
    console.log('- OCA Issuance URL:', this.ocaIssuanceUrl);
    console.log('- OCA API Key:', this.ocaIssuanceApiKey ? 'Set' : 'Not set');
    console.log('- Max Retries:', this.maxRetries);
    
    if (!this.ocaIssuanceUrl) {
      console.error('ERROR: NEXT_PUBLIC_OCA_ISSUANCE_URL is not set');
      return false;
    }
    
    if (!this.ocaIssuanceApiKey) {
      console.error('ERROR: NEXT_PUBLIC_OCA_ISSUANCE_API_KEY is not set');
      return false;
    }
    
    console.log('✓ VC Issuer is properly configured');
    return true;
  }

  // Manual test method
  async testIssuer() {
    console.log('=== Testing VC Issuer ===');
    
    // Check configuration
    if (!this.checkConfiguration()) {
      console.error('VC Issuer is not properly configured');
      return;
    }
    
    // Check current VC jobs status
    const { jobs, statusCounts } = await this.checkVCJobsStatus();
    
    // Check for pending jobs
    const pendingJobs = jobs.filter(job => job.status === 'pending');
    console.log(`Found ${pendingJobs.length} pending jobs`);
    
    if (pendingJobs.length > 0) {
      console.log('Running issuer on pending jobs...');
      await this.run();
      
      // Check status again after running
      const { statusCounts: newStatusCounts } = await this.checkVCJobsStatus();
      console.log('Status after running issuer:', newStatusCounts);
    } else {
      console.log('No pending jobs to process');
    }
    
    console.log('=== VC Issuer Test Complete ===');
  }

  // Start the VC issuer service to run periodically
  startService(intervalMs = 30000) { // Default: run every 30 seconds
    console.log('=== Starting VC Issuer Service ===');
    console.log('Configuration check:');
    this.checkConfiguration();
    
    if (this.intervalId) {
      console.log('Stopping existing service...');
      this.stopService();
    }
    
    console.log(`Starting VC issuer service with ${intervalMs}ms interval`);
    
    // Run immediately
    console.log('Running initial VC issuer check...');
    this.run();
    
    // Then set up periodic execution
    this.intervalId = setInterval(() => {
      console.log('Running periodic VC issuer check...');
      this.run();
    }, intervalMs);
    
    console.log('=== VC Issuer Service Started ===');
  }

  // Stop the VC issuer service
  stopService() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('VC issuer service stopped');
    }
  }

  // Run once manually
  async runOnce() {
    console.log('Running VC issuer once manually');
    await this.run();
  }

  // Check current state of VC jobs
  async checkVCJobsStatus() {
    await dbService.initPromise;
    
    // Additional safety check
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
        
        console.log('VC Jobs Status Summary:', statusCounts);
        console.log('All VC Jobs:', jobs.map(job => ({
          id: job.id,
          user_id: job.user_id,
          listing_id: job.listing_id,
          status: job.status,
          retry_count: job.retry_count,
          created_ts: job.created_ts
        })));
        
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
