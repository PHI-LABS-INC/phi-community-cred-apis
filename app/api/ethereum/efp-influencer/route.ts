import { NextRequest } from "next/server";
import { Address, isAddress } from "viem";
import { createSignature } from "@/app/lib/signature";
import { verifyMultipleWalletsSimple } from "@/app/lib/multiWalletVerifier";

interface EFPListRecord {
  address: string;
  tag: string;
}

interface EFPUser {
  address: string;
  followers: number;
  following: number;
  verified: boolean;
  lists: EFPListRecord[];
}

async function fetchEFPData(address: Address): Promise<EFPUser | null> {
  try {
    const response = await fetch(
      `https://api.ethfollow.xyz/api/v1/users/${address.toLowerCase()}`
    );

    if (response.status === 404) {
      // User not found in EFP
      return null;
    }

    if (!response.ok) {
      throw new Error(`EFP API error: ${response.status}`);
    }

    const data: EFPUser = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching EFP data:", error);
    throw new Error(
      `Failed to fetch EFP data: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

async function verifyEFPInfluencer(address: Address): Promise<boolean> {
  try {
    console.log("Checking EFP influencer status for address:", address);

    const efpData = await fetchEFPData(address);

    if (!efpData) {
      console.log(`Address ${address} not found in EFP`);
      return false;
    }

    // Define influencer criteria
    const minFollowers = 50; // Minimum followers to be considered an influencer
    const hasFollowers = efpData.followers >= minFollowers;

    console.log(
      `Address ${address} has ${efpData.followers} followers on EFP (threshold: ${minFollowers})`
    );

    return hasFollowers;
  } catch (error) {
    console.error("Error verifying EFP influencer:", error);
    throw new Error(
      `Failed to verify EFP influencer status: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
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
      verifyEFPInfluencer
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
