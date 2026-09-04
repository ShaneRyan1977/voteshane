# CVRD Area A Canvass Map Prototype

Mobile-first interactive parcel map for CVRD Electoral Area A (Mill Bay / Malahat). It uses the supplied CVRD parcel and electoral-area data.

## What it does
- Shows 2,562 Area A parcels.
- Tap a parcel to view its parcel ID/PID and status.
- Claim a parcel for yourself.
- Mark it visited.
- Release a claim.
- Shared mode syncs changes between volunteers through Supabase Realtime.
- Demo mode stores changes only in the current browser/device.

## Make it collaborative
1. Create a free Supabase project.
2. In Authentication, enable Anonymous Sign-Ins.
3. Run `supabase_schema.sql` in the SQL editor.
4. Enable Realtime for `canvass_status`.
5. Host this folder on HTTPS (GitHub Pages, Netlify, Cloudflare Pages, etc.).
6. Open the URL on a phone, enter the Supabase URL and anon key once.

For a campaign, keep the public map limited to parcel coverage. Do not put voter names, phone numbers, addresses tied to individuals, or other sensitive personal information in this prototype.

Source: Cowichan Valley Regional District GIS parcel/electoral-area data supplied by the user.
