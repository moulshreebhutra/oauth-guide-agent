// Guides are imported statically so they are bundled into every route (no runtime file reads).
// tests/guides-index.test.ts fails if a data/guides/*.json file is missing here.
import github from "./github.json";
import googleWorkspace from "./google-workspace.json";
import hubspot from "./hubspot.json";
import linkedin from "./linkedin.json";
import meta from "./meta.json";
import microsoftOutlook from "./microsoft-outlook.json";
import notion from "./notion.json";
import salesforce from "./salesforce.json";
import shopify from "./shopify.json";
import slack from "./slack.json";

export const RAW_GUIDES: unknown[] = [
  github,
  googleWorkspace,
  hubspot,
  linkedin,
  meta,
  microsoftOutlook,
  notion,
  salesforce,
  shopify,
  slack,
];
export const GUIDE_FILES = ["github", "google-workspace", "hubspot", "linkedin", "meta", "microsoft-outlook", "notion", "salesforce", "shopify", "slack"];
