import { NextRequest } from "next/server";
import { Address, isAddress } from "viem";
import { createSignature } from "@/app/lib/signature";

const EFP_API_URL = "https://data.ethfollow.xyz/api/v1";

interface StatsResponse {
  followers_count: number;
  following_count: number;
}

async function verifyEFPInfluencer(address: Address): Promise<boolean> {
  try {
    console.log("Checking EFP followers for address:", address);

    const url = `${EFP_API_URL}/users/${address.toLowerCase()}/stats`;
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      console.error(`Failed to fetch stats: ${response.status}`);
      return false;
    }

    const stats = (await response.json()) as StatsResponse;
    const followerCount = stats.followers_count;

    console.log(`Found ${followerCount} followers for address ${address}`);

    return followerCount >= 100;
  } catch (error) {
    console.error("Error verifying EFP Influencer status:", {
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

    const mint_eligibility = await verifyEFPInfluencer(address as Address);
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
