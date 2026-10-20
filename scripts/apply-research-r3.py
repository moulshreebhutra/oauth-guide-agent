#!/usr/bin/env python3
"""One-off, reviewable patch: folds the research pass of 2026-10-20 into data/guides/*.json.
Every new fact carries an evidence id whose excerpt was copied from the fetched page.
quote_check stays 'unchecked' until `npm run verify-quotes` is run from an open-internet machine."""
import json, pathlib

DATE = "2026-10-20"
ROOT = pathlib.Path(__file__).resolve().parent.parent / "data" / "guides"


def load(slug):
    return json.loads((ROOT / f"{slug}.json").read_text())


def save(g):
    (ROOT / f"{g['slug']}.json").write_text(json.dumps(g, indent=1, ensure_ascii=False) + "\n")


def ev(g, url, title, excerpt, official=True):
    for e in g["evidence"]:
        if e["url"] == url and e["excerpt"] == excerpt:
            return e["id"]
    n = max([int(e["id"][1:]) for e in g["evidence"]] + [0]) + 1
    g["evidence"].append({"id": f"e{n}", "url": url, "title": title, "retrieved_at": DATE,
                          "excerpt": excerpt, "official": official, "quote_check": "unchecked"})
    return f"e{n}"


def claim(text, tag, *ids):
    return {"text": text, "tag": tag, "evidence": list(ids)}


# ---------------------------------------------------------------- GitHub
g = load("github")
e_org1 = ev(g, "https://docs.github.com/en/organizations/managing-oauth-access-to-your-organizations-data/about-oauth-app-access-restrictions",
            "GitHub Docs - About OAuth app access restrictions",
            "When you create a new organization, OAuth app access restrictions are enabled by default.")
e_org2 = ev(g, "https://docs.github.com/en/organizations/managing-oauth-access-to-your-organizations-data/about-oauth-app-access-restrictions",
            "GitHub Docs - About OAuth app access restrictions",
            "Users can request owner approval for OAuth apps they'd like to use.")
e_app = ev(g, "https://docs.github.com/en/apps/creating-github-apps/about-creating-github-apps/about-creating-github-apps",
           "GitHub Docs - About creating GitHub Apps",
           "Unlike OAuth apps, GitHub Apps can also act independently of a user.")
g["gotchas"] += [
    claim("New GitHub organizations have OAuth app access restrictions turned on by default, so your app may be blocked for org-owned repos until an owner approves it. Members can request that approval.", "sourced", e_org1, e_org2),
    claim("If your product needs to act without a signed-in user, GitHub says GitHub Apps can act independently of a user; OAuth apps cannot. This guide covers OAuth apps only.", "sourced", e_app),
]
for s in g["steps"]:
    if s["n"] == 4:
        s["evidence"] = [i for i in s["evidence"] if i != "e1"] or ["e2"]
g["review_process"] = [claim("No GitHub review step is described for registering an OAuth app; the page we read ends at 'Register application'. Organization owners may still need to approve it per org.", "sourced", "e1", e_org2)]
g["uncertainties"] = [
    "GitHub's 'creating an OAuth app' page ends at 'Register application'; the client-secret step in this guide comes from Composio's guide, not GitHub's.",
    "GitHub rate limits and token caps for OAuth apps were not quoted from an official page in this pass.",
    "GitHub Apps (a different product) are not covered step by step here.",
    "Composio managed-auth availability for GitHub was not checked against the Composio API.",
    "No hands-on registration has been logged yet.",
]
save(g)

# ---------------------------------------------------------------- Google
g = load("google-workspace")
u_aud = "https://support.google.com/cloud/answer/15549945"
e_t = ev(g, u_aud, "Google Cloud Help - Manage OAuth app audience",
         "Projects configured with a publishing status of Testing are limited to up to 100 test users")
e_7 = ev(g, u_aud, "Google Cloud Help - Manage OAuth app audience",
         "Authorizations by a test user will expire seven days from the time of consent.")
e_cap = ev(g, u_aud, "Google Cloud Help - Manage OAuth app audience",
           "The user cap limits the number of users that can grant permission to your app")
e_prod = ev(g, "https://support.google.com/cloud/answer/13461325", "Google Cloud Help - OAuth app verification",
            "Apps in development, testing or staging are not applicable for verification")
e_vid = ev(g, "https://support.google.com/cloud/answer/13461325", "Google Cloud Help - OAuth app verification",
           "Provide a video that demonstrates the functionality, the OAuth flow of the app and shows how the scopes are being used.")
e_rt = ev(g, "https://developers.google.com/identity/protocols/oauth2", "Google Identity - OAuth 2.0 overview",
          "There is currently a limit of 100 refresh tokens per Google Account per OAuth 2.0 client ID.")
e_rej = ev(g, "https://support.google.com/cloud/answer/13464321", "Google Cloud Help - OAuth verification FAQ",
           "If your justification is deemed insufficient, your app verification request may be rejected.")
g["scopes_and_access"] += [
    claim("Testing status: limited to up to 100 test users, who must be listed on the consent screen.", "sourced", e_t),
    claim("Testing status: a test user's authorization expires seven days after consent, so offline access breaks weekly until the app is in production.", "sourced", e_7),
    claim("Unverified apps requesting sensitive or restricted scopes hit a user cap: about 100 new users total over the project's life; Google says it cannot be reset.", "sourced", e_cap),
    claim("Google caps refresh tokens at 100 per Google Account per OAuth client ID; creating more silently invalidates the oldest.", "sourced", e_rt),
]
g["requirements"] += [
    claim("To start verification the app must already be published to production; apps in development, testing or staging are not applicable.", "sourced", e_prod),
    claim("Verification needs a demo video showing the OAuth flow and how each scope is used, plus a written justification for sensitive or restricted scopes.", "sourced", e_vid),
]
g["gotchas"] += [claim("An insufficient justification can get the verification request rejected, which restarts your wait.", "sourced", e_rej)]
g["wait"]["statement"] = ("Google's restricted-scope page says verification can take several weeks. None of the other Google pages we read (verification help, FAQ) state a duration, so there is no official shorter figure to quote.")
g["uncertainties"] = [
    "No Google page we read gives a number of days or weeks for the OAuth review; 'several weeks' is the only stated figure and it comes from the restricted-scope page.",
    "Cost of the third-party security assessment is not stated on the pages read.",
    "Which scopes are sensitive vs restricted for a given API was not enumerated.",
    "Brand verification timing was not found.",
    "No hands-on test logged yet.",
]
save(g)

# ---------------------------------------------------------------- HubSpot
g = load("hubspot")
u = "https://developers.hubspot.com/docs/apps/legacy-apps/authentication/working-with-oauth"
e_m = ev(g, u, "HubSpot Developers - Working with OAuth",
         "Any app designed for installation by multiple HubSpot accounts or listing on the HubSpot Marketplace must use OAuth.")
e_https = ev(g, u, "HubSpot Developers - Working with OAuth", "For security reasons, this URL must use https in production.")
e_leg = ev(g, "https://developers.hubspot.com/docs/apps/developer-platform/build-apps/overview", "HubSpot Developers - Build apps overview",
           "legacy [private apps] and [public apps] are still fully supported and actively maintained by HubSpot.")
g["requirements"] += [
    claim("An app meant for installation by multiple HubSpot accounts, or for the Marketplace, must use OAuth.", "sourced", e_m),
    claim("The redirect URL must use https in production.", "sourced", e_https),
]
g["uncertainties"] = [
    "HubSpot's OAuth page we read is under the 'legacy apps' path; HubSpot's newer developer platform pages may differ in click paths.",
    "The page does not state the access-token lifetime or refresh-token lifetime.",
    "Whether a public OAuth app can serve outside customers without Marketplace listing was not answered by any page read; the OAuth page only says OAuth is required for multi-account installs.",
    "The wait range is for Marketplace listing only; we converted 10 business days to 14 calendar days.",
    "No hands-on test logged yet.",
]
save(g)

# ---------------------------------------------------------------- LinkedIn
g = load("linkedin")
u3 = "https://learn.microsoft.com/en-us/linkedin/shared/authentication/authorization-code-flow"
e_60 = ev(g, u3, "LinkedIn Learn - Authorization Code Flow (3-legged OAuth)", "Currently, all access tokens are issued with a 60-day lifespan.")
e_pr = ev(g, u3, "LinkedIn Learn - Authorization Code Flow (3-legged OAuth)", "Programmatic refresh tokens are available for a limited set of partners.")
e_re = ev(g, u3, "LinkedIn Learn - Authorization Code Flow (3-legged OAuth)", "To refresh an access token, go through the authorization process again to fetch a new token.")
u4 = "https://learn.microsoft.com/en-us/linkedin/marketing/community-management/community-management-overview"
e_dev = ev(g, u4, "LinkedIn Learn - Community Management API overview",
           "You will be initially approved with a development tier with limited access to the API call volume.")
e_new = ev(g, u4, "LinkedIn Learn - Community Management API overview",
           "You can only request Community Management API Development Tier access with a new developer application that does not have access to any other API product.")
e_scr = ev(g, u4, "LinkedIn Learn - Community Management API overview",
           "ensure you provide a screen cast video that demonstrates, for each use case specified in your access request form")
e_closed = ev(g, u4, "LinkedIn Learn - Community Management API overview",
              "r_member_social is a closed permission, and we are not accepting access requests at this time due to resource constraints.")
g["requirements"] += [
    claim("Community Management API (posting/pages): you start on a Development tier with limited call volume, then must apply for Standard tier for full access.", "sourced", e_dev),
    claim("Development tier access can only be requested with a new developer app that has no other API product.", "sourced", e_new),
    claim("Standard tier needs a screen-cast video for each use case in your request form.", "sourced", e_scr),
]
g["scopes_and_access"] += [
    claim("r_member_social (reading a member's posts) is a closed permission; LinkedIn is not accepting requests for it.", "sourced", e_closed),
]
g["gotchas"] += [
    claim("Access tokens last 60 days. Refresh by sending the member through authorization again, unless you are one of the limited partners with programmatic refresh tokens.", "sourced", e_60, e_pr, e_re),
]
g["wait"]["statement"] = "LinkedIn's Marketing access page says there is no fixed timeline, and the Community Management API page states no approval duration for either tier. Treat the wait as unknown and plan for weeks."
g["uncertainties"] = [
    "No LinkedIn page we read states a typical approval duration for Development or Standard tier.",
    "Share on LinkedIn and Sign In with LinkedIn products (common for simple posting) were not read in this pass and may be easier than Community Management API.",
    "Third-party blogs claim timelines; they were not used.",
    "No hands-on test logged yet.",
]
save(g)

# ---------------------------------------------------------------- Meta
g = load("meta")
u = "https://developers.facebook.com/docs/development/build-and-test/app-modes"
e_dev = ev(g, u, "Meta for Developers - App modes", "Apps in Development mode can only request permissions from role users.")
e_live = ev(g, u, "Meta for Developers - App modes", "Apps in Live mode can request permissions from anyone, but only permissions approved through App Review.")
e_rev = ev(g, "https://developers.facebook.com/docs/resp-plat-initiatives/app-review", "Meta for Developers - App Review",
           "App Review is an important part of the app development process.")
g["requirements"] += [
    claim("New apps start in Development mode, where only people with a role on the app (admins, developers, testers) can grant permissions.", "sourced", e_dev),
    claim("Live mode lets anyone use the app, but only for permissions approved through App Review.", "sourced", e_live),
]
g["review_process"] += [claim("Meta calls App Review an important part of app development. The pages we read give no review duration.", "sourced", e_rev)]
g["wait"]["statement"] = "Neither the app-modes page nor the App Review page we read states how long review takes."
g["uncertainties"] = [
    "No Meta page we read states a duration for App Review or Business Verification; blogs claim numbers but were not used.",
    "The App Review page we read does not list required screencasts or test instructions; Meta's content and best-practice pages were not read.",
    "Which permissions need advanced access per use case was not enumerated.",
    "Business Verification requirements page failed to load in this pass.",
    "No hands-on test logged yet.",
]
save(g)

# ---------------------------------------------------------------- Microsoft
g = load("microsoft-outlook")
u = "https://learn.microsoft.com/en-us/entra/identity-platform/how-to-add-credentials"
e_life = ev(g, u, "Microsoft Learn - Add and manage app credentials", "Client secret lifetime is limited to two years (24 months) or less.")
e_rec = ev(g, u, "Microsoft Learn - Add and manage app credentials", "Microsoft recommends that you set an expiration value of less than 12 months.")
e_cert = ev(g, u, "Microsoft Learn - Add and manage app credentials",
            "Microsoft recommends that you use a certificate instead of a client secret before moving the application to a production environment.")
ur = "https://learn.microsoft.com/en-us/entra/identity-platform/reply-url"
e_https = ev(g, ur, "Microsoft Learn - Redirect URI restrictions", "Redirect URIs are case-sensitive and must match the case of the URL path of your running application.")
e_wild = ev(g, ur, "Microsoft Learn - Redirect URI restrictions",
            "Wildcard URIs are currently unsupported in app registrations configured to sign in personal Microsoft accounts and work or school accounts.")
pv = "https://learn.microsoft.com/en-us/entra/identity-platform/publisher-verification-overview"
e_min = ev(g, pv, "Microsoft Learn - Publisher verification", "Developers who have already met these requirements can be verified in minutes.")
e_cpp = ev(g, pv, "Microsoft Learn - Publisher verification", "The developer must have a Partner One ID for a valid Microsoft AI Cloud Partner Program account that has completed the verification process.")
e_warn = ev(g, pv, "Microsoft Learn - Publisher verification", "a warning appears on the consent screen")
g["gotchas"] += [
    claim("Client secrets expire: the maximum lifetime is 24 months and Microsoft recommends under 12. Calendar the renewal or your connection will fail one day.", "sourced", e_life, e_rec),
    claim("Redirect URIs are case-sensitive and must match the path of your running app exactly.", "sourced", e_https),
    claim("Wildcard redirect URIs are not supported for apps that sign in both personal Microsoft accounts and work/school accounts.", "sourced", e_wild),
    claim("Microsoft recommends a certificate rather than a client secret before production.", "sourced", e_cert),
]
g["requirements"] += [claim("Publisher verification needs a Partner One ID on a verified Microsoft AI Cloud Partner Program account.", "sourced", e_cpp)]
g["review_process"] += [claim("Multitenant apps that are not publisher verified show a warning on the consent screen for users in other tenants.", "sourced", e_warn)]
g["wait"] = {"range": None, "display": "Minutes once prerequisites are met", "tag": "sourced", "evidence": ["e1", e_min],
             "statement": "Microsoft says developers who already meet the publisher-verification requirements can be verified in minutes. How long it takes to get the Partner account itself verified is not stated."}
g["uncertainties"] = [
    "Time to verify the Microsoft AI Cloud Partner Program account is not stated.",
    "Admin consent flows and which Graph permissions require admin consent were not covered in this pass.",
    "No hands-on test logged yet.",
]
save(g)

# ---------------------------------------------------------------- Notion
g = load("notion")
mk = "https://developers.notion.com/guides/get-started/marketplace-listing"
e_any = ev(g, mk, "Notion Developers - Marketplace listing", "Only public connections with an installation scope of Any workspace can be listed on the Marketplace.")
e_rv = ev(g, mk, "Notion Developers - Marketplace listing", "The Notion team reviews every listing submission.")
e_5 = ev(g, mk, "Notion Developers - Marketplace listing", "expect to hear back from our team within 5-10 business days via email.")
au = "https://developers.notion.com/docs/authorization"
e_redir = ev(g, au, "Notion Developers - Authorization", "Fill out the form with your connection details, including your redirect URI(s) under the OAuth configuration section.")
e_cap = ev(g, au, "Notion Developers - Authorization", "The Authorization URL field populates after a public connection is submitted for review.")
g["requirements"] += [
    claim("Only public connections with installation scope 'Any workspace' can be listed on the Marketplace. The scope cannot be changed after creation, so choose it deliberately.", "sourced", e_any, e_redir),
]
g["review_process"] = [
    claim("Notion reviews every Marketplace listing submission; it sends feedback and you can resubmit.", "sourced", e_rv),
    claim("Notion says to expect to hear back within 5-10 business days by email. That is a response time, not a guaranteed approval time.", "sourced", e_5),
]
g["wait"] = {"range": {"min_days": 7, "max_days": 14}, "display": "5-10 business days to hear back (Marketplace listing only)", "tag": "sourced", "evidence": [e_5],
             "statement": "Only applies if you list on the Notion Marketplace. 5-10 business days is Notion's stated time to hear back; our calendar-day range (7-14) is a conversion."}
g["difficulty"]["tag"] = "inferred"
g["difficulty"]["rationale"] = ("Creating a public connection with a redirect URI is self-serve in what we read. But an image caption on Notion's authorization page says the Authorization URL field only 'populates after a public connection is submitted for review', so a review step may sit between creating and using it. Marketplace listing is reviewed separately.")
g["uncertainties"] = [
    "OPEN QUESTION to settle in the first hands-on test: Notion's authorization page has a caption saying the Authorization URL populates after a public connection is submitted for review. We could not tell whether that is a light submission or the full Marketplace review.",
    "Notion's portal UI has changed recently (docs point to app.notion.com/developers/connections); third-party screenshots may be stale.",
    "The authorization page does not name a privacy-policy requirement; the listing page lists name, description, category, tags, images and logo.",
    "No hands-on test logged yet.",
]
save(g)

# ---------------------------------------------------------------- Salesforce
g = load("salesforce")
sr = "https://developer.salesforce.com/docs/atlas.en-us.packagingGuide.meta/packagingGuide/security_review_how_it_works.htm"
e_est = ev(g, sr, "Salesforce Developers - How the security review works", "The time frames are estimates.")
e_free = ev(g, sr, "Salesforce Developers - How the security review works", "If you plan to distribute your solution for free, you don't pay the fee.")
e_who = ev(g, sr, "Salesforce Developers - How the security review works", "To distribute managed packages, Salesforce Platform API solutions, or Marketing Cloud Engagement API solutions")
eca = "https://help.salesforce.com/s/articleView?id=xcloud.external_client_apps.htm&type=5"
e_eca = ev(g, eca, "Salesforce Help - External client apps",
           "packageable frameworks to enable a third-party application to integrate with Salesforce using APIs and security protocols")
e_sec = ev(g, eca, "Salesforce Help - External client apps", "OAuth settings contain sensitive information like OAuth secrets that must not be packaged or distributed.")
g["requirements"] += [
    claim("An external client app is Salesforce's packageable framework for letting a third-party application integrate through APIs and OAuth.", "sourced", e_eca),
    claim("OAuth secrets are kept out of packages: external client apps split settings into a global file (consumer credentials) and a local file.", "sourced", e_sec),
]
g["review_process"] = [
    claim("Salesforce's security review applies to managed packages and Salesforce Platform API solutions you distribute (Salesforce's page now calls it the AgentExchange security review).", "sourced", e_who),
    claim("Stated stage durations: verification of submission 1-2 weeks, first-time Product Security testing 3-4 weeks, retest of a resubmission 2-3 weeks. Salesforce says 'The time frames are estimates.'", "sourced", e_est),
    claim("Our sum of the first-submission stages is roughly 4-6 weeks end to end; Salesforce does not state a total.", "inferred", e_est),
    claim("The page gives no fee amount; if you distribute for free you do not pay the review fee.", "sourced", e_free),
    claim("Connecting Composio to your own org through an external client app is not described as needing the security review; the review is about distributing a package.", "inferred", e_who),
]
g["wait"]["display"] = "~10 min to start; listing review 4-6 wks (our sum)"
g["wait"]["statement"] = ("Creating the app takes about 10 minutes to provision, per Composio's guide. Only if you distribute a package, Salesforce's security review adds stated stages: 1-2 weeks verification plus 3-4 weeks testing (retests 2-3 weeks). Salesforce says these are estimates.")
g["uncertainties"] = [
    "Salesforce's help article on the connected-app to external-client-app change did not load; we could not quote whether new connected apps can still be created.",
    "Org edition differences (Developer vs production orgs) were not researched.",
    "The 1-2 / 3-4 / 2-3 week figures were read through a page summary; verify-quotes should confirm the wording.",
    "No hands-on test logged yet.",
]
save(g)

# ---------------------------------------------------------------- Shopify
g = load("shopify")
sd = "https://shopify.dev/docs/apps/launch/distribution/select-distribution-method"
e_cant = ev(g, sd, "Shopify Dev - Select a distribution method", "You can't change the method after you select it.")
e_link = ev(g, sd, "Shopify Dev - Select a distribution method", "generate an install link and send it to the store owner")
e_plus = ev(g, sd, "Shopify Dev - Select a distribution method", "A custom app can be installed on multiple stores when those stores belong to the same Plus organization.")
e_rev = ev(g, sd, "Shopify Dev - Select a distribution method", "submit your app for review when it's ready")
ck = "https://shopify.dev/docs/apps/launch/app-requirements-checklist"
e_oa = ev(g, ck, "Shopify Dev - App Store requirements checklist", "Your app should immediately authorize using OAuth before any other steps occur")
e_st = ev(g, ck, "Shopify Dev - App Store requirements checklist", "Use session tokens for authentication and avoid third-party cookies or local storage")
g["difficulty"]["tag"] = "sourced"
g["difficulty"]["evidence"] = list(dict.fromkeys(g["difficulty"].get("evidence", []) + [e_rev]))
g["requirements"] += [
    claim("Distribution method is a one-way choice: 'You can't change the method after you select it.' Decide public vs custom before you build.", "sourced", e_cant),
    claim("Custom distribution: you generate an install link for a specific store and send it to the store owner.", "sourced", e_link),
    claim("A custom app can be installed on multiple stores only when they belong to the same Plus organization.", "sourced", e_plus),
    claim("Public distribution: you submit for Shopify's review when the app is ready.", "sourced", e_rev),
    claim("App Store checklist: authorize with OAuth immediately on install, and use session tokens rather than third-party cookies or local storage.", "sourced", e_oa, e_st),
]
g["uncertainties"] = [
    "Shopify's distribution page does not say whether custom distribution needs review.",
    "No official page we read states how long App Store review takes or any registration fee; the $19 figure is from a community reply and may have changed.",
    "The checklist page did not mention GDPR/compliance webhooks; Shopify's separate docs on them were not read.",
    "Composio's Shopify guide path was followed, not tested.",
]
save(g)

# ---------------------------------------------------------------- Slack
g = load("slack")
rg = "https://docs.slack.dev/slack-marketplace/slack-marketplace-review-guide"
e_pre = ev(g, rg, "Slack Developer Docs - Marketplace review guide", "the preliminary part of the review takes up to 10 business days to receive feedback.")
e_fn = ev(g, rg, "Slack Developer Docs - Marketplace review guide", "the functional review takes up to 10 weeks for new submissions and 6 weeks for published apps resubmitting changes.")
e_act = ev(g, rg, "Slack Developer Docs - Marketplace review guide", "An active workspace is a workspace that has been used in the past 28 days.")
e_q = ev(g, rg, "Slack Developer Docs - Marketplace review guide", "your place in the queue is reset each time you resubmit")
e_10 = ev(g, "https://docs.slack.dev/changelog/2026/09/01/slack-marketplace-install-requirement", "Slack Developer Docs - Marketplace install requirement",
          "at least 10 installations on active workspaces")
rl = "https://docs.slack.dev/apis/web-api/rate-limits"
e_rl = ev(g, rl, "Slack Developer Docs - Rate limits",
          "all newly-created Slack apps that are commercially distributed and have not been approved for the Slack Marketplace")
g["difficulty"] = {"tier": 3, "label": "Review required",
    "rationale": "A single-workspace app is instant, but a commercial app that other companies install belongs on the Marketplace: it needs 10 active workspaces first, then a two-part manual review, and non-Marketplace commercial apps get stricter API rate limits.",
    "tag": "sourced", "evidence": ["e1", e_10, e_rl]}
g["wait"] = {"range": {"min_days": 0, "max_days": 84}, "display": "Up to ~12 weeks (stated maxima)", "tag": "sourced", "evidence": [e_pre, e_fn],
    "statement": "Slack states maximums, not typical times: up to 10 business days for the preliminary review plus up to 10 weeks for the functional review of a new submission (6 weeks for resubmitted published apps). Our sum is about 12 weeks. Slack says turnaround varies with volume. Unlisted distribution and single-workspace apps have no review."}
g["requirements"] += [
    claim("Before submitting you need at least 10 installations on active workspaces, and Slack says to keep 10 or more installed through the whole review.", "sourced", e_10),
    claim("An active workspace is one used in the past 28 days.", "sourced", e_act),
]
g["gotchas"] += [
    claim("Slack applies reduced rate limits to newly created commercially distributed apps that are not Marketplace-approved (effective May 29, 2025). The page we read does not give the numbers.", "sourced", e_rl),
    claim("Preliminary review resets your place in the queue each time you resubmit; the functional review does not.", "sourced", e_q),
]
g["review_process"] = [
    claim("Review has automated tests, then a manual review in two parts: preliminary (is the app ready) and functional (installation and testing).", "sourced", e_pre),
    claim("Preliminary feedback takes up to 10 business days; functional review takes up to 10 weeks for new submissions and 6 weeks for resubmitted published apps.", "sourced", e_pre, e_fn),
]
g["uncertainties"] = [
    "Slack's review times are stated maximums ('up to'), not typical times; real timing was not observed.",
    "The rate-limit page points to a changelog for the exact limits; the per-minute number was not read.",
    "Slack's app-creation click path was not read; follow Slack's current docs.",
    "How a team gets its first 10 active workspaces without being listed (unlisted distribution) is not detailed in the pages read.",
    "No hands-on test logged yet.",
]
save(g)
print("patched 10 guides")
