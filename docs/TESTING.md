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
