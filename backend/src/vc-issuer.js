import db from "./db.js";

class VCIssuer {
  constructor() {
    this.ocaIssuanceUrl = process.env.OCA_ISSUANCE_URL;
    this.ocaIssuanceApiKey = process.env.OCA_ISSUANCE_API_KEY;
    this.maxRetries = 3;
  }

  async queryPendingVCJobs() {
    const response = await db.query(
      "SELECT * FROM vc_issue_jobs WHERE status = 'pending'"
    );
    return response.rows;
  }

  async issueVC(job) {
    const { id: jobId, retry_count, payload } = job;
    let result = {};
    let response;

    try {
      response = await fetch(this.ocaIssuanceUrl, {
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
    } catch (error) {
      console.error('Error issuing VC:', error);
      result.error = error.message;
      result.status_code = 500;
    }

    const client = await db.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        "INSERT INTO vc_issue_job_logs (job_id, payload, response) VALUES ($1, $2, $3)",
        [jobId, JSON.stringify(payload), JSON.stringify(result)]
      );

      if (result.status_code === 200) {
        await client.query(
          "UPDATE vc_issue_jobs SET status = 'success' WHERE id = $1",
          [jobId]
        );
      } else if (result.status_code !== 500) {
        await client.query(
          "UPDATE vc_issue_jobs SET status = 'failed' WHERE id = $1",
          [jobId]
        );
      } else if (result.status_code === 500) {
        if (retry_count < this.maxRetries) {
          await client.query(
            "UPDATE vc_issue_jobs SET retry_count = retry_count + 1 WHERE id = $1",
            [jobId]
          );
        } else {
          await client.query(
            "UPDATE vc_issue_jobs SET status = 'failed', retry_count = retry_count + 1 WHERE id = $1",
            [jobId]
          );
        }
      }

      await client.query("COMMIT");
    } catch (error) {
      console.error('Error updating job status:', error);
      await client.query("ROLLBACK");
      throw error;
    } finally {
      await client.release();
    }

    return result;
  }

  async run() {
    const pendingVCJobs = await this.queryPendingVCJobs();
    if (!pendingVCJobs.length) {
      return;
    }
    
    await Promise.allSettled(
      pendingVCJobs.map(async (job) => await this.issueVC(job))
    );
  }
}

export class VCIssuerService {
  constructor() {}

  static getInstance() {
    if (!VCIssuerService.instance) {
      VCIssuerService.instance = new VCIssuer();
    }
    return VCIssuerService.instance;
  }
}
