# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
- `bun dev` - Start development server with hot reload on port 3000
- `bun start` - Start production server on port 3000
- `bun gather-fonts.mjs` - Gather and sync fonts from Google Fonts to BunnyCDN

### Testing
- `bun test` - Run all tests
- `bun test css2.test.mjs` - Run specific test file
- `bun test --coverage` - Run tests with coverage report

## Architecture

This is a privacy-friendly Google Fonts replacement service built with Node.js/Fastify that serves fonts without logging user data.

### Core Components

**Main Server (`index.mjs`)**
- Fastify HTTP server handling font CSS requests
- Endpoints: `/css`, `/css2`, `/css2-next`, `/icon`
- Redirects root to https://fonts.coollabs.io in production
- Development-only `/demo` endpoint for testing

**Font CSS Handlers**
- `css.mjs` - Handles legacy `/css` endpoint (Google Fonts CSS v1 API)
- `css2.mjs` - Handles `/css2` endpoint (deprecated version)
- `css2-next.mjs` - Handles `/css2` and `/css2-next` endpoints (Google Fonts CSS v2 API)
- All handlers parse font family queries, generate @font-face rules, and serve CSS pointing to CDN-hosted fonts

**Font Data Sources**
- `font-cache.json` - Cached metadata for all Google Fonts
- `subsets.json` - Unicode ranges for font subsets
- Fonts served from BunnyCDN at `cdn.fonts.coollabs.io`

**Font Gathering (`gather-fonts.mjs`)**
- Downloads font files from Google Fonts
- Uploads to BunnyCDN storage zone
- Manages font-cache.json with metadata
- Concurrent downloading with progress tracking

### Key Implementation Details

The service works by:
1. Accepting Google Fonts API-compatible requests
2. Parsing font family, weight, style, and subset parameters
3. Generating CSS with @font-face rules pointing to CDN-hosted WOFF2 files
4. Serving fonts from BunnyCDN instead of Google's servers

Font URL pattern: `https://cdn.fonts.coollabs.io/[font-family]/[style-weight].woff2`

### Environment Variables

Required in `.env` file:
- `DOMAIN` - Domain for the service (e.g., "api.fonts.coollabs.io")
- `NODE_ENV` - Environment mode (development/production)

For font gathering:
- `BUNNY_API_KEY` - BunnyCDN API key for purging cache
- `BUNNY_STORAGE_API_KEY` - BunnyCDN storage zone API key for uploading fonts