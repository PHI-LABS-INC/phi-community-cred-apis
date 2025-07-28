import { NextRequest, NextResponse } from "next/server";
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

interface NeynarCast {
  hash: string;
  author: {
    fid: number;
  };
  text: string;
  embeds: object[];
  frames?: object[];
  reactions: {
    likes_count: number;
    recasts_count: number;
  };
}

interface NeynarCastsResponse {
  casts: NeynarCast[];
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

function extractDegenTipsFromText(text: string): number {
  // Regular expression to match DEGEN tips in various formats
  // Patterns: "100 $DEGEN", "$DEGEN 100", "100 degen", "degen 100", etc.
  const degenRegex =
    /(?:^|\s)(?:(\d+(?:\.\d+)?)\s*\$?degen|\$?degen\s*(\d+(?:\.\d+)?))/gi;
  let totalTips = 0;
  let match;

  while ((match = degenRegex.exec(text)) !== null) {
    const amount = parseFloat(match[1] || match[2]);
    if (!isNaN(amount)) {
      totalTips += amount;
    }
  }

  return totalTips;
}

async function getUserDegenActivity(fid: number): Promise<number> {
  try {
    let totalDegen = 0;
    let cursor: string | undefined;
    let hasMore = true;

    // Fetch all casts for the user and look for DEGEN tips using the Feed API
    while (hasMore) {
      const url = new URL(`${NEYNAR_BASE_URL}/farcaster/feed`);
      url.searchParams.append("fid", fid.toString());
      url.searchParams.append("limit", "100");
      if (cursor) {
        url.searchParams.append("cursor", cursor);
      }

      const response = await fetch(url.toString(), {
        headers: {
          Accept: "application/json",
          "x-api-key": NEYNAR_API_KEY || "",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch casts: ${response.status}`);
      }

      const data: NeynarCastsResponse = await response.json();

      // Extract DEGEN tips from cast text
      for (const cast of data.casts) {
        const tips = extractDegenTipsFromText(cast.text);
        totalDegen += tips;
      }

      if (data.next?.cursor && data.casts.length === 100) {
        cursor = data.next.cursor;
      } else {
        hasMore = false;
      }

      // Stop early if we've already hit 1000+ DEGEN
      if (totalDegen >= 1000) {
        break;
      }
    }

    // Also check for received tips by searching for mentions of the user
    try {
      const mentionsUrl = new URL(`${NEYNAR_BASE_URL}/farcaster/casts/search`);
      mentionsUrl.searchParams.append("q", `@${fid} degen`);
      mentionsUrl.searchParams.append("limit", "100");

      const mentionsResponse = await fetch(mentionsUrl.toString(), {
        headers: {
          Accept: "application/json",
          "x-api-key": NEYNAR_API_KEY || "",
        },
      });

      if (mentionsResponse.ok) {
        const mentionsData: NeynarCastsResponse = await mentionsResponse.json();
        for (const cast of mentionsData.casts) {
          const tips = extractDegenTipsFromText(cast.text);
          totalDegen += tips;
        }
      }
    } catch (error) {
      console.warn("Error fetching mentions for DEGEN tips:", error);
    }

    return totalDegen;
  } catch (error) {
    console.error("Error fetching user DEGEN activity:", error);
    throw error;
  }
}

async function verifyDegenBeliever(
  address: Address
): Promise<{ eligible: boolean; degenAmount: number }> {
  try {
    const fid = await getFidFromAddress(address);
    if (!fid) {
      return { eligible: false, degenAmount: 0 };
    }

    const degenAmount = await getUserDegenActivity(fid);
    return { eligible: degenAmount >= 1000, degenAmount };
  } catch (error) {
    console.error("Error verifying DEGEN believer:", {
      error,
      address,
      timestamp: new Date().toISOString(),
    });
    throw new Error(
      `Failed to verify DEGEN believer: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get("address");
  const addresses = req.nextUrl.searchParams.get("addresses");

  if (!address || !isAddress(address)) {
    return NextResponse.json(
      { error: "Invalid address provided" },
      { status: 400 }
    );
  }

  if (!NEYNAR_API_KEY) {
    return NextResponse.json(
      { error: "Neynar API key not configured" },
      { status: 500 }
    );
  }

  try {
    const addressesToCheck: Address[] = [address as Address];
    if (addresses) {
      const additionalAddresses = addresses
        .split(",")
        .map((addr: string) => addr.trim())
        .filter((addr: string) => isAddress(addr)) as Address[];
      addressesToCheck.push(...additionalAddresses);
    }

    let mint_eligibility = false;
    let data = "0";

    for (const addr of addressesToCheck) {
      try {
        const result = await verifyDegenBeliever(addr);
        if (result.eligible) {
          mint_eligibility = true;
          data = result.degenAmount.toString();
          break;
        }
      } catch (error) {
        console.warn(`Error checking address ${addr}:`, error);
      }
    }

    const signature = await createSignature({
      address: address as Address,
      mint_eligibility,
      data,
    });

    return NextResponse.json(
      { mint_eligibility, data, signature },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error processing GET request:", {
      error,
      timestamp: new Date().toISOString(),
    });
    return NextResponse.json(
      { error: "Please try again later" },
      { status: 500 }
    );
  }
}
