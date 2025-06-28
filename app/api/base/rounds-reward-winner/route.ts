import { NextRequest, NextResponse } from "next/server";
import { Address, isAddress } from "viem";
import { createSignature } from "@/app/lib/signature";
import { verifyMultipleWallets } from "@/app/lib/multiWalletVerifier";

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
  mentioned_profiles: {
    fid: number;
    username?: string;
  }[];
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

async function getUserRoundsWins(fid: number): Promise<number> {
  try {
    let totalWins = 0;

    // Search for casts mentioning the user and Rounds wins
    // Look for patterns like "winner", "won", "reward", "rounds" etc.
    const searchQueries = [
      `@${fid} rounds winner`,
      `@${fid} rounds won`,
      `@${fid} rounds reward`,
      `winner @${fid}`,
      `congratulations @${fid}`,
    ];

    for (const query of searchQueries) {
      try {
        const url = new URL(`${NEYNAR_BASE_URL}/farcaster/casts/search`);
        url.searchParams.append("q", query);
        url.searchParams.append("limit", "50");

        const response = await fetch(url.toString(), {
          headers: {
            Accept: "application/json",
            "x-api-key": NEYNAR_API_KEY || "",
          },
        });

        if (response.ok) {
          const data: NeynarCastsResponse = await response.json();

          for (const cast of data.casts) {
            const text = cast.text.toLowerCase();
            const mentionsUser = cast.mentioned_profiles.some(
              (profile) => profile.fid === fid
            );

            // Check if this cast mentions rounds/winner/reward and the user
            if (
              mentionsUser &&
              (text.includes("rounds") ||
                text.includes("winner") ||
                text.includes("won") ||
                text.includes("reward") ||
                text.includes("prize"))
            ) {
              totalWins++;
            }
          }
        }
      } catch (error) {
        console.warn(`Error searching for query "${query}":`, error);
      }
    }

    // Also check the user's own casts for mentions of winning rounds
    try {
      const userCastsUrl = new URL(`${NEYNAR_BASE_URL}/farcaster/feed`);
      userCastsUrl.searchParams.append("fid", fid.toString());
      userCastsUrl.searchParams.append("limit", "100");

      const userCastsResponse = await fetch(userCastsUrl.toString(), {
        headers: {
          Accept: "application/json",
          "x-api-key": NEYNAR_API_KEY || "",
        },
      });

      if (userCastsResponse.ok) {
        const userCastsData: NeynarCastsResponse =
          await userCastsResponse.json();

        for (const cast of userCastsData.casts) {
          const text = cast.text.toLowerCase();

          // Look for self-reported wins
          if (
            (text.includes("won") || text.includes("winner")) &&
            (text.includes("rounds") ||
              text.includes("reward") ||
              text.includes("prize"))
          ) {
            totalWins++;
          }
        }
      }
    } catch (error) {
      console.warn("Error fetching user casts for rounds wins:", error);
    }

    // Alternative approach: Look for specific Rounds reward distribution patterns
    try {
      const roundsUrl = new URL(`${NEYNAR_BASE_URL}/farcaster/casts/search`);
      roundsUrl.searchParams.append("q", "rounds reward distribution");
      roundsUrl.searchParams.append("limit", "100");

      const roundsResponse = await fetch(roundsUrl.toString(), {
        headers: {
          Accept: "application/json",
          "x-api-key": NEYNAR_API_KEY || "",
        },
      });

      if (roundsResponse.ok) {
        const roundsData: NeynarCastsResponse = await roundsResponse.json();

        for (const cast of roundsData.casts) {
          const text = cast.text.toLowerCase();
          const mentionsUser = cast.mentioned_profiles.some(
            (profile) => profile.fid === fid
          );

          if (mentionsUser && text.includes("reward")) {
            totalWins++;
          }
        }
      }
    } catch (error) {
      console.warn("Error searching for rounds reward distributions:", error);
    }

    return totalWins;
  } catch (error) {
    console.error("Error fetching user rounds wins:", error);
    throw error;
  }
}

async function verifyRoundsRewardWinner(
  address: Address
): Promise<[boolean, string]> {
  try {
    const fid = await getFidFromAddress(address);
    if (!fid) {
      return [false, "0"];
    }

    const winsCount = await getUserRoundsWins(fid);
    return [winsCount >= 3, winsCount.toString()];
  } catch (error) {
    console.error("Error verifying rounds reward winner:", {
      error,
      address,
      timestamp: new Date().toISOString(),
    });
    throw new Error(
      `Failed to verify rounds reward winner: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get("address");

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
    const result = await verifyMultipleWallets(req, verifyRoundsRewardWinner);

    const signature = await createSignature({
      address: address as Address,
      mint_eligibility: result.mint_eligibility,
      data: result.data,
    });

    return NextResponse.json(
      {
        mint_eligibility: result.mint_eligibility,
        data: result.data,
        signature,
      },
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
