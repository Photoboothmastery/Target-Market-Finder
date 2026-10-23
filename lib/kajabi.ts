// Thin client for Kajabi's public API (https://developers.kajabi.com).
// Two calls only, both documented endpoints:
//   1. POST /v1/oauth/token          - exchange client_id/secret for a token
//   2. GET  /v1/contacts?filter[...] - list contacts granted a given offer

const KAJABI_API_BASE = "https://api.kajabi.com/v1";

async function getAccessToken(): Promise<string> {
  const res = await fetch(`${KAJABI_API_BASE}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "client_credentials",
      client_id: process.env.KAJABI_CLIENT_ID,
      client_secret: process.env.KAJABI_CLIENT_SECRET,
    }),
  });

  if (!res.ok) {
    throw new Error(`Kajabi OAuth token request failed: ${res.status} ${await res.text()}`);
  }

  const data = await res.json();
  return data.access_token as string;
}

type KajabiContact = {
  id: string;
  type: "contacts";
  attributes: {
    name: string | null;
    email: string;
  };
};

/**
 * Returns the email addresses of every contact on the site who has been
 * granted the given offer, paging through all results.
 */
export async function getEmailsWithOffer(offerId: string): Promise<string[]> {
  const token = await getAccessToken();
  const siteId = process.env.KAJABI_SITE_ID;

  const emails: string[] = [];
  let page = 1;
  const pageSize = 100;

  while (true) {
    const url =
      `${KAJABI_API_BASE}/contacts` +
      `?filter[site_id]=${siteId}` +
      `&filter[has_offer_id]=${offerId}` +
      `&page[size]=${pageSize}&page[number]=${page}` +
      `&fields[contacts]=email`;

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.api+json",
      },
    });

    if (!res.ok) {
      throw new Error(
        `Kajabi contacts request failed for offer ${offerId}: ${res.status} ${await res.text()}`
      );
    }

    const body = await res.json();
    const contacts: KajabiContact[] = body.data ?? [];
    for (const c of contacts) {
      if (c.attributes?.email) emails.push(c.attributes.email.toLowerCase());
    }

    const totalPages: number | undefined = body.meta?.total_pages;
    if (!totalPages || page >= totalPages) break;
    page += 1;
  }

  return emails;
}
