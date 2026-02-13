<!-- /docs/self-hosted.md -->
# Self-Hosted Deployment & Data Handling (Formal)

## 1. Scope and Hosting Model

This product is delivered as a **self-hosted, local-first toolkit**.  
It does not require a vendor-hosted backend, cloud storage, or third‑party processing.

**All processing, storage, and distribution of report artifacts occur inside the customer’s environment.**

## 2. Data Handling Statement

- The vendor **does not receive, store, or process** customer data.
- All artifacts and logs are stored **locally** on customer infrastructure.
- Any data export (e.g., zips, CI artifacts, shared drives) is performed by the customer.

## 3. Security Responsibilities

Because this is self-hosted:

- **Access control** (who can read artifacts) is the customer’s responsibility.
- **Encryption at rest** is recommended for storage volumes that contain artifacts.
- **Encryption in transit** is required only for customer-controlled transfers (e.g., CI artifact storage, internal file servers).
- Audit trails, retention policies, and data lifecycle controls are governed by the customer’s internal policies.

## 4. Compliance and Regulatory Posture

The vendor is **not a data processor** for customer content, because no data leaves the customer environment by default.

Implications:

- **GDPR / PII**: The customer remains the data controller/processor for any personal data.
- **Data residency**: Determined solely by customer infrastructure.
- **Retention & deletion**: Controlled by customer policy and storage systems.

## 5. Optional Licensing / Commercial Access

If commercial licensing is required, it is handled via **license keys** and does not require data hosting.

Suggested pricing model:

1. **Monthly package with limits**
   - Example: monthly subscription with a capped number of runs/cases.

2. **One‑time usage / single request**
   - Example: single-run license or pay‑per‑run option.

3. **Enterprise / custom**
   - Pricing and limits defined by contract.

No user accounts or hosted authentication are required for self‑hosted licensing, unless the customer opts into an online license verification service.

## 6. Integration / Data Transfer Options

### A) File‑based (current)
- Share a `reports/<id>` folder or zip/tar archive.
- Fully offline and enterprise‑friendly.

### B) HTTP API (optional future)
- Runner uploads to a customer‑owned endpoint.
- Viewer fetches bundles from customer storage.
- Requires customer‑managed auth and storage.

### C) CI‑native
- Runner/Evaluator run inside CI.
- Artifacts published to CI storage.
- Viewer opens artifacts without vendor access.

## 7. Summary

This product is designed for **self-hosted, privacy‑preserving use**.  
All data control, storage, and access remain under the customer’s governance.
