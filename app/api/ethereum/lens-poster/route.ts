import { NextRequest } from "next/server";
import { Address, isAddress } from "viem";
import { createSignature } from "@/app/lib/signature";

// Lens GraphQL API endpoint
const LENS_API_URL = "https://api.lens.xyz/graphql";

// GraphQL query to check if an address has a Lens profile using accountsBulk
const ACCOUNTS_BULK_QUERY = `
  query AccountBulk($request: AccountsBulkRequest!) {
    accountsBulk(request: $request) {
      username {
        localName
        ownedBy
      }
    }
  }
`;

// GraphQL query to get account feed stats for posting activity
const ACCOUNT_FEEDS_STATS_QUERY = `
  query AccountFeedsStats($address: EvmAddress!) {
    accountFeedsStats(request: { account: $address }) {
      posts
      comments
      reposts
      quotes
    }
  }
`;

// Type for the accountsBulk response
type AccountsBulkItem = {
  username: {
    localName: string;
    ownedBy: string;
  } | null;
};

/**
 * Verifies if an address has posted 10+ times on Lens
 *
 * @param address - Ethereum address to check
 * @returns Boolean indicating if address has posted 10+ times on Lens
 */
async function hasPosted10TimesOnLens(address: Address): Promise<boolean> {
  try {
    // First check if the address has a Lens account
    const response = await fetch(LENS_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: ACCOUNTS_BULK_QUERY,
        variables: {
          request: {
            ownedBy: [address],
          },
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const accountsBulk: AccountsBulkItem[] = data?.data?.accountsBulk ?? [];

    // Check if the address has any Lens accounts
    if (accountsBulk.length === 0) return false;

    // Check posting activity for each account
    for (const accountItem of accountsBulk) {
      if (!accountItem.username?.ownedBy) continue;

      const statsResponse = await fetch(LENS_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: ACCOUNT_FEEDS_STATS_QUERY,
          variables: { address: accountItem.username.ownedBy },
        }),
      });

      if (!statsResponse.ok) {
        continue; // Skip this account if stats fail
      }

      const statsData = await statsResponse.json();
      const feedStats = statsData.data?.accountFeedsStats;

      console.log(feedStats);

      if (feedStats) {
        const totalPosts = feedStats.posts || 0;
        const totalComments = feedStats.comments || 0;
        const totalReposts = feedStats.reposts || 0;
        const totalQuotes = feedStats.quotes || 0;

        const totalPublications =
          totalPosts + totalComments + totalReposts + totalQuotes;

        if (totalPublications >= 10) {
          return true;
        }
      }
    }

    return false; // No account with 10+ publications found
  } catch (error) {
    console.error("Error verifying Lens posting activity:", {
      error,
      address,
      timestamp: new Date().toISOString(),
    });
    return false;
  }
}

export async function GET(req: NextRequest) {
  try {
    const address = req.nextUrl.searchParams.get("address");

    if (!address || !isAddress(address)) {
      return new Response(
        JSON.stringify({ error: "Invalid address provided" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Get verification result
    const mint_eligibility = await hasPosted10TimesOnLens(address as Address);

    // Generate cryptographic signature of the verification result
    const signature = await createSignature({
      address: address as Address,
      mint_eligibility,
    });

    return new Response(JSON.stringify({ mint_eligibility, signature }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in handler:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
