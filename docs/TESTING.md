# Hands-on testing log (fill in as real attempts are made)

Rules: never paste secrets. Blur client IDs/secrets in screenshots. Record times honestly, including dead ends.

## Per attempt (copy the block)

```
App:
Date / who:
Start time → end time (hands-on minutes):
What I did, in order:
Where the guide was right:
Where the guide was wrong or missing (quote the sentence):
Surprises / blockers and how I resolved them:
Did anything require waiting? How long?
Screenshots (secrets blurred): yes/no
```

After each attempt, add an entry to `tested_log` in `data/guides/<slug>.json`, change only the steps/claims actually done to `"tag": "tested"`, then run `npm run validate`.

## Planned attempts
1. GitHub OAuth App (expect ~10-20 min, instant)
2. Notion public connection
3. Google Cloud OAuth client in Testing mode with a test user (do NOT submit for verification)

## Prediction vs outcome for unseen apps (live agent)
Before running the agent, write your own prediction of the tier for 3 apps not in the library (for example Linear, Zoom, Dropbox), then compare with the agent's output and with the provider's real docs. Record agreements and disagreements here; this is the honest accuracy check.

| App | My predicted tier (before) | Agent tier | Provider docs say | Notes |
|---|---|---|---|---|

## Claim audit
Pick 10-12 claims across guides, open the source, and mark each Confirmed / Corrected / Unverifiable here.

| Guide | Claim | Result | Note |
|---|---|---|---|

## Live-agent audit (read-through, not hands-on) - 2026-10-20/21
Generated guides for 23 apps outside the library were read next to their step logs and sources: TikTok, Zoom, Instagram, Snapchat, Amazon, Asana, PayPal, Google Photos, PhonePe, Figma, Twilio, Canva, Dropbox, Square, Airtable, Spotify, Etsy, Xero, Mailchimp, Box, Webflow, Intercom, Okta. None of these is a registration, so nothing here is "tested".

| Fault found | Seen in | Fix |
|---|---|---|
| Marketplace listing raised the tier | Square | Tier 3/4 needs a Sourced review step, else Tier 2 |
| Forum-only numbers tagged Sourced | Dropbox | Community-only numbers become Reported; forum pages never official |
| Quota/certification page not read | Spotify, Xero | Three fixed gate searches, best provider pages read |
| Absence ("no review mentioned") tagged Sourced | Airtable, Xero, Okta | Absence is Unknown/Inferred |
| Source did not support the claim | Okta | Claim must share wording with its cited page |
| Console steps marked "you or agent" | Dropbox, Box, Mailchimp, Webflow | Console steps are always "you" |
| Unrelated search noise (partner programs) | Airtable, Intercom, Okta | Query changed to quotas and limits |

## Failure catalog: every fault found in generated guides, and what now stops it
Each row came from reading real generated guides (23 apps in the first audit, 10 more in the re-tests). "Second review" is the independent pass in `lib/audit.ts`, which catches the same classes of fault in cases the rules below do not name.

| Fault seen | Apps | Stopped by |
|---|---|---|
| Quote not on the page | many | `enforce`: quote must literally appear in a page fetched in that run |
| Sourced claim whose page does not say it | Airtable, Okta | `enforce`: shared-wording check; second review (unsupported) |
| Year or figure not on the cited page | Spotify, Airtable | `enforce`: years and figures of 10+ must be on a cited page |
| Number only on a forum page presented as sourced | Spotify, Intercom | `enforce`: community-only evidence becomes reported |
| "No review mentioned" shown as a finding | Xero, Okta, Calendly | `enforce`: absence is never sourced |
| High tier resting on a forum post | Square, Reddit | `enforce`: tier cap, run after the community downgrade |
| Console steps given to the agent | Webflow, Etsy | `enforce`: provider-console steps are always "you" |
| Limit stated for all apps, quote said private apps | Intercom | second review (wrong_scope); prompt rule |
| Two reviews blended in one wait | Intercom | second review (mixed); prompt rule |
| Release-note and other trivia as gotchas | Okta, Reddit | `enforce`: unsupported off-topic gotchas dropped; second review (off_topic) |
| Another product of the provider mixed in | Reddit (Devvit), Stripe | second review (off_topic, wrong_scope); prompt rule |
| Older and newer policy both stated | Spotify | prompt rule; second review (wrong_scope) |
| Example figure presented as a hard limit | Airtable | prompt rule; second review (wrong_scope) |
| Account-verification, review-article or homepage read as a gate page | Airtable, Intercom, Linear, Stripe | probe candidates must match review or quota wording and not an off-topic title |
| Bot-check page titled "Just a moment..." | Discord, Reddit | search-engine title kept |
| Search results about other products | Linear | empty result instead of off-app pages |
| Wrong library match for "Teams", "LinkedIn Ads" | home search | exact or prefix match only |

What this cannot promise: the second review is itself a model, so it can miss a fault or flag a good claim (it only ever removes or lowers a tag, never adds). No layer replaces a person registering the app. Run the apps in `docs/TEST-QUESTIONS.md` after any change to the agent and read the guides against their sources.
