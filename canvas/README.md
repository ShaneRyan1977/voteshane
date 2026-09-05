# Area A Canvass Map — Mill Bay / Malahat

Mobile canvassing map for CVRD Area A.

## Version 6 changes
- Property data-entry panel is locked to the visible mobile viewport so it cannot drift off-screen when the phone keyboard opens, closes, or the device rotates.
- The close button stays visible while the form scrolls.
- Voter names from `Voters_All_Groups_OCR(2).xlsx` are bundled into `data/voter_names.json` and displayed when a property is opened.
- Multiple names at the same civic address are shown together in a scrollable list.
- Exact duplicate name/address rows are shown once in the interface to avoid duplicate display, while the bundled source-derived data preserves the spreadsheet rows.
- Address results are filtered to the clicked parcel polygon where possible, reducing the chance of showing a neighbouring property's address.

## Canvassing categories
- Supporter — green
- Visited — blue
- Reach out — orange
- Against — red
- Clear category returns the property to unmarked while retaining phone/email.

## Shared data
Phone, email and canvassing category can sync through Supabase using `canvass_status`. Voter names are static data bundled with the app and do not need to be added to Supabase.

If upgrading from an older shared version, the existing `supabase_schema.sql` remains compatible.
