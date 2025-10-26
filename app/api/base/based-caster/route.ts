import { NextRequest } from "next/server";
import { Address, isAddress } from "viem";
import { createSignature } from "@/app/lib/signature";

// Neynar API configuration
const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY;
const NEYNAR_BASE_URL = "https://api.neynar.com/v2";

interface NeynarUser {
  fid: number;
  username: string;
  display_name: string;
  pfp_url: string;
  follower_count: number;
  following_count: number;
  verifications: string[];
  verified_addresses: {
    eth_addresses: string[];
    sol_addresses: string[];
  };
}

interface NeynarCastsResponse {
  casts: {
    object: string;
    hash: string;
    thread_hash: string;
    parent_hash?: string;
    parent_url?: string;
    root_parent_url?: string;
    parent_author: {
      fid?: number;
    };
    author: {
      object: string;
      fid: number;
      username: string;
      display_name: string;
      pfp_url: string;
    };
    text: string;
    timestamp: string;
    embeds: object[];
    reactions: {
      likes_count: number;
      recasts_count: number;
      likes: object[];
      recasts: object[];
    };
    replies: {
      count: number;
    };
    mentioned_profiles: object[];
  }[];
  next?: {
    cursor?: string;
  };
}

async function getFidFromAddress(address: string): Promise<number | null> {
  try {
    const response = await fetch(
      `${NEYNAR_BASE_URL}/farcaster/user/bulk-by-address?addresses=${address}`,
      {
        headers: {
          Accept: "application/json",
          "x-api-key": NEYNAR_API_KEY || "",
        },
      }
    );

    if (!response.ok) {
      return null;
    }

    const data: Record<string, NeynarUser[]> = await response.json();
    const users = data[address.toLowerCase()];

    return users && users.length > 0 ? users[0].fid : null;
  } catch (error) {
    console.error("Error fetching FID from address:", error);
    return null;
  }
}

async function verifyUserHasPosted(fid: number): Promise<boolean> {
  try {
    // Fetch user's casts using the Feed API
    const url = new URL(`${NEYNAR_BASE_URL}/farcaster/feed`);
    url.searchParams.append("fid", fid.toString());
    url.searchParams.append("limit", "1"); // We only need to check if there's at least 1 cast

    const response = await fetch(url.toString(), {
      headers: {
        Accept: "application/json",
        "x-api-key": NEYNAR_API_KEY || "",
      },
    });

    if (!response.ok) {
      console.error(`Failed to fetch casts: ${response.status}`);
      return false;
    }

    const data: NeynarCastsResponse = await response.json();

    // Check if user has any casts
    return data.casts && data.casts.length > 0;
  } catch (error) {
    console.error("Error fetching user casts:", error);
    return false;
  }
}

async function verifyBasedCaster(address: Address): Promise<boolean> {
  try {
    if (!NEYNAR_API_KEY) {
      console.error("Neynar API key not configured");
      return false;
    }

    // Get FID from address
    const fid = await getFidFromAddress(address);
    if (!fid) {
      console.log(`No Farcaster profile found for address ${address}`);
      return false;
    }

    // Check if user has posted anything
    const hasPosted = await verifyUserHasPosted(fid);

    if (hasPosted) {
      console.log(`User ${address} has posted on Farcaster`);
    } else {
      console.log(`User ${address} has not posted anything on Farcaster`);
    }

    return hasPosted;
  } catch (error) {
    console.error("Error verifying based-caster status:", {
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

    if (!NEYNAR_API_KEY) {
      return new Response(
        JSON.stringify({ error: "Neynar API key not configured" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const mint_eligibility = await verifyBasedCaster(address as Address);
    const signature = await createSignature({
      address: address as Address,
      mint_eligibility,
    });

    return new Response(JSON.stringify({ mint_eligibility, signature }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Error processing GET request:", {
      error,
      timestamp: new Date().toISOString(),
    });
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Internal server error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
