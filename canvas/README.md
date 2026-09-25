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


Version 15 — voter search fix
- Fixes a Version 14 bug where an empty Supabase voter-name override could hide valid spreadsheet voters from search.
- Name search now also accepts address terms, e.g. "Christine Ryan 841".
- Exact full-name matches receive higher ranking.
- Search result de-duplication now prefers the edited version of the same voter/address instead of displaying duplicates.


Version 16 — search ranking + watermark
- Exact Given Names and Last Name matches rank ahead of middle-name/loose matches.
- Removed the ranking boost for voter records merely because they had been saved to Supabase.
- Increased voter search results from 12 to 30.
- Added a two-digit version watermark (16) at bottom-left.


Version 17: Registered-voter properties now receive a small black map dot with a white halo. The dot is a separate non-interactive overlay, so Supporter/Visited/Reach out/Against parcel colours remain unchanged. The app resolves voter addresses from CVRD AddressBC within Area A and caches the cue locations on the device for faster subsequent loads. Version watermark updated to 17.


Version 18 — registered-voter cue redo
- Replaces the tiny registered-voter dots with a thick black dashed parcel outline over a white halo.
- Keeps Supporter/Visited/Reach out/Against fill colours unchanged.
- Replaces the v17 one-shot bulk AddressBC request with smaller street batches and fallbacks so the voter-to-parcel mapping is much more reliable on mobile browsers.
- Shows mapping progress/count in the bottom-left legend and caches resolved parcel IDs for faster later loads.


Version 19 — registered voter cue fix
- Restores the missing addressHasRegisteredVoter helper that caused Version 18's background cue scan to fail.
- Uses the same voter-name association as the property dialog.
- Any opened property with one or more effective voter names is immediately marked.
- Saved manually edited/added voter names also mark their parcel.
- Cue is a heavy black dashed outline with white halo; at zoom 15+ a black V badge appears inside the parcel.
- Existing Supporter/Visited/Reach out/Against fill colours are unchanged.


Version 20 — toned-down registered-voter cue
- Removes the heavy dashed voter outlines and large V badges.
- Registered-voter properties now use a small semi-transparent dark dot with a thin white edge.
- Dots appear only at zoom 16 and closer so neighbourhood-wide views remain readable.
- Existing Supporter / Visited / Reach out / Against parcel colours are unchanged.
