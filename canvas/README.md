# Area A Canvass — Mill Bay / Malahat

Mobile canvassing map for CVRD Electoral Area A.

## Property panel
When a property is opened, the panel now shows only:
- Civic address (when CVRD AddressBC returns one)
- Phone number
- Email
- Four colour-coded canvassing buttons:
  - Supporter — green
  - Visited — blue
  - Reach out — orange
  - Against — red

Tapping a property opens the main property panel directly; there is no intermediate map popup. Tapping a status button immediately changes the parcel to that colour. The map colours use a stronger, more opaque overlay for easier canvassing at a glance. A **Clear category** button removes the colour/category while keeping any saved phone/email details. Phone and email save automatically for the selected parcel.

The Parcel ID, PID, Plan, canvasser-name field, claim/release controls and numeric parcel heading have been removed from the property panel.

## Shared use with Supabase
If you used the earlier prototype, run `supabase_schema.sql` in the Supabase SQL editor before using this build. It migrates the old `claimed` status to `reachout`, adds phone/email fields and enables the four new statuses.

In Supabase Authentication > Providers, enable Anonymous Sign-Ins. Enable Realtime for `canvass_status` in Database > Publications if you want changes to appear live on multiple devices.

## Privacy
This version can store phone numbers, email addresses and canvassing status. Secure access to the Supabase project and handle the data in accordance with applicable privacy, election and campaign requirements.


## Cache note
This build uses cache-busted app assets and disables the service worker on localhost/127.0.0.1 so local testing cannot accidentally mix an old JavaScript file with the new interface. On a deployed site, the v5 service worker updates immediately and removes older app caches.
