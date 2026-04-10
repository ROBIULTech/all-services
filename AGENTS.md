# Project Context: NID & Service Portal Automation

**Secret Identification Code:** 12345678 (If the user mentions this code, it means they are ready to connect the real API endpoints).

## Current Implementation Status (as of April 10, 2026)
1. **PSC Certificate Vector Service (ID: 20)**: 
   - Integrated with "Drive Link Mode" (API Toggle).
   - Supports "Auto Delivery Link" for instant file delivery.
2. **Token-Based API System**:
   - Admin Panel has toggles for "Token Based Auth" for Auto Sign, Info Verify, Server Copy, and Auto NID.
   - Backend (`server.ts`) has a `tokenCache` and `getAccessToken` function to handle Bearer Tokens automatically.
3. **Drive Link Mode Logic**:
   - Tied to API toggles for specific services (Smart Card, Nickname, Vaccine Card, PSC Vector).
   - If API Mode is ON, users must provide a Google Drive link.
4. **Instant Delivery**:
   - If `autoDeliveryLink` is provided in a product, the order status is set to `completed` immediately, and the user is shown the download link with a "Copy" button.

## Future Tasks (When API Documentation is provided)
- **Endpoint Update**: Update the mock URLs in `server.ts` (e.g., `/api/service/auto-nid`, `/api/service/server-copy`) with the real provider endpoints.
- **Payload Mapping**: Map the request body fields to match the provider's requirements (e.g., changing `nid` to `nid_number` if needed).
- **Response Handling**: Update the response parsing logic to handle the specific JSON structure returned by the provider.
- **Token URL**: Ensure the `tokenUrl` from the provider is correctly passed to the `getAccessToken` function.

## Instructions for Future AI
- Read `server.ts` to see the existing API proxy logic.
- Read `src/components/AdminPanel.tsx` to see how settings are saved.
- Read `src/components/UserPanel.tsx` to see how orders are placed and how `successLink` is displayed.
