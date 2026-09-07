# Area A Canvass Map — Mill Bay / Malahat

Mobile canvassing map for CVRD Area A.

## Version 8 changes
- Fixed the Android Chrome dialog drift bug. The property dialog is now a centered fixed card with a 12px minimum margin from every screen edge.
- Removed manual `visualViewport.offsetLeft` / `offsetTop` positioning, which could push the dialog partially off-screen on Android Chrome.
- Added `interactive-widget=resizes-content` so the visible page resizes when the Android keyboard opens.
- The dialog keeps its own internal scrolling and the close button remains accessible.
- The close button remains fixed at the top of the visible property sheet.
- Voter names are now editable as paired **Given Names** and **Last Name** fields.
- Each address has **+ Add name** and **Remove** controls.
- Name edits are stored as property/address overrides. Removing every name from an address is preserved as an intentional empty list rather than restoring the spreadsheet names.
- The original voter spreadsheet data remains bundled in `data/voter_names.json` and is used whenever no manual override exists.

## Canvassing categories
- Supporter — green
- Visited — blue
- Reach out — orange
- Against — red
- Clear category returns the property to unmarked while retaining phone/email and voter-name edits.

## Shared data / upgrade step
Phone, email, canvassing category and voter-name edits can sync through Supabase using `canvass_status`.

**If you are upgrading an existing Supabase project, run `supabase_schema.sql` once before using Version 7.** It adds the `voter_names` JSON column required for editable names.

The initial spreadsheet-derived names do not need to be imported to Supabase; only manual additions/removals/edits are stored there.
