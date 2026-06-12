/**
 * Channel adapters for distribution auto-detect. Each adapter knows how to
 * list the ad names currently living in that channel's ads manager; the
 * matcher (lib/distribution-match) joins them back to Library concepts.
 *
 * Meta is implemented (Marketing API). LinkedIn and Google expose the same
 * interface but stay unconfigured until the team decides to wire them up —
 * the UI explains what is missing instead of hiding the option.
 */

export type Channel = "meta" | "linkedin" | "google";

export type ChannelAdapter = {
  channel: Channel;
  label: string;
  /** Human-readable list of env vars required to enable the adapter. */
  requiredEnv: string[];
  enabled: () => boolean;
  /** Names of ads currently in the channel's account (deduplicated). */
  fetchAdNames: () => Promise<string[]>;
};

const META_API_VERSION = "v23.0";
const META_PAGE_LIMIT = 200;
const META_MAX_PAGES = 50; // safety stop: 10k ads

async function fetchMetaAdNames(): Promise<string[]> {
  const token = process.env.META_ACCESS_TOKEN;
  const account = process.env.META_AD_ACCOUNT_ID;
  if (!token || !account) throw new Error("Meta is not configured.");
  const accountPath = account.startsWith("act_") ? account : `act_${account}`;
  // Overridable for tests / local stubs.
  const base = process.env.META_GRAPH_BASE_URL ?? "https://graph.facebook.com";

  const names = new Set<string>();
  let url: string | null =
    `${base}/${META_API_VERSION}/${accountPath}/ads` +
    `?fields=name,effective_status&limit=${META_PAGE_LIMIT}&access_token=${encodeURIComponent(token)}`;

  for (let page = 0; url && page < META_MAX_PAGES; page++) {
    const res = await fetch(url);
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Meta API error ${res.status}: ${body.slice(0, 300)}`);
    }
    const json: {
      data?: { name?: string }[];
      paging?: { next?: string };
    } = await res.json();
    for (const ad of json.data ?? []) {
      if (ad.name) names.add(ad.name);
    }
    url = json.paging?.next ?? null;
  }
  return [...names];
}

export const CHANNEL_ADAPTERS: Record<Channel, ChannelAdapter> = {
  meta: {
    channel: "meta",
    label: "Meta",
    requiredEnv: ["META_ACCESS_TOKEN", "META_AD_ACCOUNT_ID"],
    enabled: () => Boolean(process.env.META_ACCESS_TOKEN && process.env.META_AD_ACCOUNT_ID),
    fetchAdNames: fetchMetaAdNames,
  },
  linkedin: {
    channel: "linkedin",
    label: "LinkedIn",
    requiredEnv: ["LINKEDIN_ACCESS_TOKEN", "LINKEDIN_AD_ACCOUNT_ID"],
    enabled: () => false,
    fetchAdNames: async () => {
      throw new Error("LinkedIn auto-detect is not wired up yet.");
    },
  },
  google: {
    channel: "google",
    label: "Google",
    requiredEnv: ["GOOGLE_ADS_DEVELOPER_TOKEN", "GOOGLE_ADS_CUSTOMER_ID", "GOOGLE_ADS_REFRESH_TOKEN"],
    enabled: () => false,
    fetchAdNames: async () => {
      throw new Error("Google Ads auto-detect is not wired up yet.");
    },
  },
};
