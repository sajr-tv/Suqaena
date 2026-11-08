# SUQAENA

Premium women's fashion storefront for the UAE and GCC.

## Run

Use Node.js 20+ with `npm ci` and `npm start`. Railway uses `npm start` and `/health`. The original homepage remains available without shop configuration.

## Supplier catalogue

The dashboard is available at `/shop/admin` after signing in at `/shop/account` with the configured administrator account. Select a UTF-8 CSV file or paste CSV. Export Excel workbooks as UTF-8 CSV before importing.

Use one row per variant. Include every variant for each product being updated. A new import creates drafts and replaces previously imported variants for the same supplier and product ID. A product must be reviewed and published again after replacement. Use a consistent supplier identifier and retain SKU identifiers when refreshing an existing variant. Select multiple rows in the dashboard to publish, unpublish or remove them. To edit in bulk, reimport the corrected rows. Storefront prices use AED, and quotes convert to local currency at checkout. The margin formula is wholesale divided by one minus the gross margin fraction. The optional `retail_aed` column overrides it per variant.

Use supplier-approved catalogue files and images on an approved HTTPS asset host. Images are rendered from that host. The server does not download remote URLs. Use `|` between image URLs and put `yes` in `image_permission` when the supplier has authorized use. Keep the supplier's written authorization on file. Use official Alibaba HTTPS listing links when available. Verify single-unit availability and image rights before publishing.

## Environment configuration

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string. The app creates the four shop tables on first access. |
| `SHOP_ORIGIN` | Exact HTTPS origin for state-changing requests. Defaults to `https://suqaena.com`. Use the preview origin in isolated environments. |
| `SHOP_ADMIN_EMAIL` | Reserved administrator sign-in address. |
| `SHOP_ADMIN_PASSWORD` | Random, unique secret of at least 20 characters. Set privately in Railway. Changing it invalidates administrator authorization on existing sessions. |
| `SUPPLIER_IMAGE_HOSTS` | Comma-separated exact hostnames of approved image sources. |
| `SHOP_SHIPPING_JSON` | Country-keyed objects with a local-currency `fee`, `rate` in local currency per AED, and an `eta` string. Supported keys are AE, SA, QA, KW, BH and OM. Leave unverified markets unconfigured. |
| `SHOP_TEST_CHECKOUT` | Set to `true` in a test environment to allow the administrator to create test orders. |

Test orders can be reviewed by the administrator and given a test tracking reference visible to the owning account. Customer checkout, COD, live payment and supplier submission require separate activation and verification. Current test checkout does not collect real addresses or reserve stock. Keep it disabled in production.

## Verification and release

Run `npm test` for CSV validation. Set `SHOP_TEST_DATABASE_URL` to a disposable PostgreSQL database to run the end-to-end HTTP test. It creates and removes a dedicated test schema.

Production deploys from `main`. For a production release, review the feature branch, provide persistent PostgreSQL, set the required admin variables and verify the deployed homepage, health endpoint and dashboard. Use an isolated database for acceptance testing. Verify supplier permission, single-unit fulfilment, shipping charges, estimates and courier COD remittance country by country.

Alibaba's official ICBU DropShipping documentation lists product lookup, buyer order creation, freight and tracking. Use of these APIs requires verifying app access and authorization for SUQAENA. The file import is the current supplier ingestion workflow. The integration does not call Alibaba endpoints.
