# Area A Canvass Map — Mill Bay / Malahat

## Version 9 changes
- Supabase is preconfigured in the app. Canvassers no longer need to enter a Project URL or key.
- Added a password gate before the map and shared data load.
- Password access is remembered only for the current browser session/tab session.
- All Version 8 Android dialog centering fixes and editable voter names are retained.

## Shared persistence
The app connects automatically to the configured Supabase project and uses anonymous authentication. Ensure **Anonymous Sign-Ins** remain enabled in Supabase and that `supabase_schema.sql` has been run.

## Security note
This is a static GitHub Pages app. The publishable Supabase key is intended to be public, but a client-side password gate is only a practical access deterrent, not strong authentication. Anyone technically able to inspect the site's source code can bypass a purely client-side gate. For stronger access control, use real authenticated user accounts or put the site behind an authenticated hosting layer.

## Canvassing categories
- Supporter — green
- Visited — blue
- Reach out — orange
- Against — red
- Clear category returns the property to unmarked while retaining phone/email and voter-name edits.


Version 10: Clicking Supporter, Visited, Reach out, or Against now saves the property and immediately closes the property dialog. Visible voter-name edits are included in the same save before closing.


Version 14: Reverted to the pre-Mail-In application. The main search box now searches voter Given Names and Last Names as well as addresses. Repeated name matches are shown in a selectable results list with the voter address. Edited voter names stored in Supabase are also included in search.
