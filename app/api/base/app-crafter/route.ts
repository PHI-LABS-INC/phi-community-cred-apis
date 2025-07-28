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

interface NeynarMiniApp {
  id: string;
  name: string;
  description: string;
  developer_fid: number;
  users_count: number;
  created_at: string;
  updated_at: string;
}

interface NeynarMiniAppsResponse {
  mini_apps: NeynarMiniApp[];
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

async function getUserMiniApps(
  fid: number
): Promise<{ hasEligibleApp: boolean; maxUsers: number }> {
  try {
    // Note: This is a hypothetical endpoint - the actual Neynar API may not have this exact endpoint
    // In a real implementation, you might need to:
    // 1. Check the user's casts for mini app announcements
    // 2. Use a different API that tracks mini app usage
    // 3. Implement custom logic to detect mini apps

    const url = new URL(`${NEYNAR_BASE_URL}/farcaster/mini-apps`);
    url.searchParams.append("developer_fid", fid.toString());
    url.searchParams.append("limit", "100");

    const response = await fetch(url.toString(), {
      headers: {
        Accept: "application/json",
        "x-api-key": NEYNAR_API_KEY || "",
      },
    });

    if (!response.ok) {
      // If the endpoint doesn't exist, try alternative approach
      return await checkMiniAppsFromCasts(fid);
    }

    const data: NeynarMiniAppsResponse = await response.json();

    let hasEligibleApp = false;
    let maxUsers = 0;

    for (const app of data.mini_apps) {
      if (app.users_count > maxUsers) {
        maxUsers = app.users_count;
      }
      if (app.users_count >= 50) {
        hasEligibleApp = true;
      }
    }

    return { hasEligibleApp, maxUsers };
  } catch (error) {
    console.error("Error fetching user mini apps:", error);
    // Fallback to checking casts for mini app mentions
    return await checkMiniAppsFromCasts(fid);
  }
}

async function checkMiniAppsFromCasts(
  fid: number
): Promise<{ hasEligibleApp: boolean; maxUsers: number }> {
  try {
    // Alternative approach: Check user's casts for mini app related content
    // Look for frames, external links, or mentions of mini apps

    const url = new URL(`${NEYNAR_BASE_URL}/farcaster/feed`);
    url.searchParams.append("fid", fid.toString());
    url.searchParams.append("limit", "100");

    const response = await fetch(url.toString(), {
      headers: {
        Accept: "application/json",
        "x-api-key": NEYNAR_API_KEY || "",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch casts: ${response.status}`);
    }

    const data: {
      casts: {
        text: string;
        reactions: {
          likes_count: number;
          recasts_count: number;
        };
        frames?: object[];
        embeds: object[];
      }[];
      next?: {
        cursor?: string;
      };
    } = await response.json();

    // Look for casts that mention mini apps, frames, or development
    const miniAppKeywords = [
      "mini app",
      "miniapp",
      "frame",
      "built",
      "created",
      "developed",
      "launch",
      "app",
      "tool",
      "dapp",
      "application",
    ];

    let suspectedMiniApps = 0;
    let maxEstimatedUsers = 0;

    for (const cast of data.casts) {
      const text = cast.text.toLowerCase();
      const hasKeywords = miniAppKeywords.some((keyword) =>
        text.includes(keyword)
      );

      if (hasKeywords) {
        suspectedMiniApps++;
        // Estimate users based on engagement (likes + recasts)
        const estimatedUsers =
          (cast.reactions.likes_count || 0) +
          (cast.reactions.recasts_count || 0) * 2;

        if (estimatedUsers > maxEstimatedUsers) {
          maxEstimatedUsers = estimatedUsers;
        }
      }

      // Check for frames which are a type of mini app
      if (cast.frames && cast.frames.length > 0) {
        suspectedMiniApps++;
        const frameUsers =
          (cast.reactions.likes_count || 0) +
          (cast.reactions.recasts_count || 0) * 3;
        if (frameUsers > maxEstimatedUsers) {
          maxEstimatedUsers = frameUsers;
        }
      }
    }

    // Conservative estimate: need at least 1 suspected mini app with 50+ estimated users
    const hasEligibleApp = suspectedMiniApps > 0 && maxEstimatedUsers >= 50;

    return { hasEligibleApp, maxUsers: maxEstimatedUsers };
  } catch (error) {
    console.error("Error checking mini apps from casts:", error);
    return { hasEligibleApp: false, maxUsers: 0 };
  }
}

async function verifyAppCrafter(
  address: Address
): Promise<{ eligible: boolean; maxUsers: number }> {
  try {
    const fid = await getFidFromAddress(address);
    if (!fid) {
      return { eligible: false, maxUsers: 0 };
    }

    const result = await getUserMiniApps(fid);
    return { eligible: result.hasEligibleApp, maxUsers: result.maxUsers };
  } catch (error) {
    console.error("Error verifying app crafter:", {
      error,
      address,
      timestamp: new Date().toISOString(),
    });
    throw new Error(
      `Failed to verify app crafter: ${
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
        const result = await verifyAppCrafter(addr);
        if (result.eligible) {
          mint_eligibility = true;
          data = result.maxUsers.toString();
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
