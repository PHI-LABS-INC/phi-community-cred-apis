import { NextRequest } from "next/server";
import { Address, isAddress } from "viem";
import { createSignature } from "@/app/lib/signature";

interface ZoraCreatedCoinEdge {
  node: {
    id: string;
    createdAt: string;
    name?: string;
    symbol?: string;
    totalSupply?: string;
    uniqueHolders: number;
  };
}

interface ZoraProfileResponse {
  data: {
    profile?: {
      createdCoins?: {
        edges: ZoraCreatedCoinEdge[];
        totalCount: number;
      };
    };
  };
  errors?: unknown[];
}

const ZORA_API_ENDPOINT = "https://api.zora.co/universal/graphql";
const COMMUNITY_BACKED_THRESHOLD = 20; // Need 20+ holders

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

    // Get verification results
    const mint_eligibility = await verifyCommunityBacked(address as Address);

    // Generate cryptographic signature of the verification results
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

/**
 * Verifies if an address has a Creator Coin with over 20 holders on Zora
 *
 * @param address - Ethereum address to check
 * @returns Boolean indicating if address has a Creator Coin with 20+ holders
 */
async function verifyCommunityBacked(address: Address): Promise<boolean> {
  try {
    // Query to get user's created coins with unique holders count
    const query = `
      query CommunityBackedUser($address: String!) {
        profile(identifier: $address) {
          createdCoins(first: 10) {
            edges {
              node {
                uniqueHolders
              }
            }
          }
        }
      }
    `;

    const response = await fetch(ZORA_API_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "User-Agent": "Phi-Community-Cred-APIs/1.0",
      },
      body: JSON.stringify({
        query,
        variables: { address: address.toLowerCase() },
      }),
    });

    if (!response.ok) {
      console.error(`Zora API request failed with status ${response.status}`);
      return false;
    }

    const data: ZoraProfileResponse = await response.json();

    if (data.errors) {
      console.error("Zora API GraphQL errors:", data.errors);
      return false;
    }

    const profile = data.data?.profile;
    if (!profile?.createdCoins?.edges.length) {
      return false;
    }

    const createdCoins = profile.createdCoins.edges;
    let maxHolders = 0;

    // Check unique holders count for each coin
    for (const coinEdge of createdCoins) {
      const uniqueHolders = coinEdge.node.uniqueHolders || 0;
      maxHolders = Math.max(maxHolders, uniqueHolders);
    }

    return maxHolders >= COMMUNITY_BACKED_THRESHOLD;
  } catch (error) {
    console.error(
      `Error verifying Community Backed for address ${address}:`,
      error
    );
    return false;
  }
}
