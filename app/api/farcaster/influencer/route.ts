import { NextRequest } from "next/server";
import { Address, isAddress } from "viem";
import { createSignature } from "@/app/lib/signature";
import { verifyMultipleWalletsSimple } from "@/app/lib/multiWalletVerifier";

const WEB3_BIO_API_URL = "https://api.web3.bio/profile/farcaster";

interface Web3BioResponse {
  address: string;
  identity: string;
  platform: string;
  displayName: string;
  avatar: string;
  description: string;
  social: {
    uid: number;
    follower: number;
    following: number;
  };
}

async function verifyFarcasterInfluencer(address: Address): Promise<boolean> {
  try {
    console.log("Checking Farcaster followers for address:", address);

    const url = `${WEB3_BIO_API_URL}/${address}`;
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      console.error(`Failed to fetch Farcaster profile: ${response.status}`);
      return false;
    }

    const profile = (await response.json()) as Web3BioResponse;

    if (!profile.social) {
      console.log(`No Farcaster social data found for address ${address}`);
      return false;
    }

    const followerCount = profile.social.follower;
    console.log(`Found ${followerCount} followers for address ${address}`);

    return followerCount > 500;
  } catch (error) {
    console.error("Error verifying Farcaster Influencer status:", {
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

    const { mint_eligibility } = await verifyMultipleWalletsSimple(
      req,
      verifyFarcasterInfluencer
    );

    const signature = await createSignature({
      address: address as Address, // Always use the primary address for signature
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
