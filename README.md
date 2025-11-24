## Tattoo Portfolio Generator

Static Nuxt 3 site generator that mirrors a Google Drive folder tree. Every folder becomes a page, subfolders become subpages, and all images inside a folder render as a minimalist gallery styled after the Default Dark+ palette.

### Features
- Google Drive service account auth with automatic folder-to-route mapping
- Recursive gallery pages with breadcrumb navigation and modal zoom
- Static generation via `nuxt generate`, including pre-rendered dynamic routes
- Responsive, dark, minimal UI tailored for tattoo portfolios

### Prerequisites
- Google Cloud project with Drive API enabled
- Service account that can read the portfolio Drive (share the root folder with the service account email)
- Node.js 18+

### Setup
1. Copy the environment template and fill in your credentials:
   ```bash
   cp env.example .env
   ```
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL`: service account email
   - `GOOGLE_SERVICE_ACCOUNT_KEY`: JSON private key contents (keep literal `\n` sequences)
   - `GOOGLE_DRIVE_ROOT_ID`: ID of the root folder that holds your portfolio

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the dev server:
   ```bash
   npm run dev
   ```

4. Generate the static site:
   ```bash
   npm run generate
   ```
   The fully static output lives in `.output/public`.

### Deployment Notes
- Regenerate whenever the Drive structure changes to keep routes in sync.
- Adjust the cache TTL via `DRIVE_CACHE_TTL` (ms) if you need fresher data between rebuilds.
- Ensure the Drive files are shared publicly or are accessible through the service account for the generated links to work.

