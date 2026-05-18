# Project Context: NID & Service Portal Automation

**Secret Identification Code:** 12345678 (If the user mentions this code, it means they are ready to connect the real API endpoints).

## Current Implementation Status (as of May 18, 2026)
1. **API Settings Options**: 
   - Admin Panel has toggles and configuration fields for Service APIs (Auto Sign, Info Verify, Server Copy, Auto NID, Smart Voter).
   - "Drive Link Mode" toggles are available for specific services.
2. **Manual Mode by Default**:
   - Although the UI is present, all services should remain in "Manual Mode" unless the user provides documentation and keys.
3. **Admin Branding Control**:
   - Admin can change Site Name, Site Description, and Logo (Upload/URL) from the Admin Panel.
   - These changes reflect on the Title, Favicon, Sidebar, and Login screen.
4. **Instant Delivery**:
   - If `autoDeliveryLink` is provided in a product, the order status is set to `completed` immediately.

## Instructions for Future AI
- The API settings UI is restored as per user request.
- Do NOT activate API connections automatically without documentation.
- All order processing is primarily done through "Order Management" unless specifically configured by the admin.
