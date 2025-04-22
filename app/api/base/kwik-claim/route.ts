import { NextRequest } from "next/server";
import { Address, isAddress } from "viem";
import { createSignature } from "@/app/lib/signature";

const API_KEY = process.env.KWIK_CLAIM_API_KEY;
if (!API_KEY) {
  throw new Error("No API key configured");
}

interface KwikClaimOpportunity {
  type: string;
  address: string;
  usdAmount: number;
}

/**
 * Fetches airdrop opportunities from KwikClaim API
 * @param address - Ethereum address to check
 * @returns Promise<KwikClaimOpportunity[]> Array of opportunities
 */
async function fetchKwikClaimOpportunities(address: string): Promise<KwikClaimOpportunity[]> {
  try {
    const response = await fetch(
      `http://api.kwikclaim.com/v1/public/opportunities?address=${address}`,
      {
        headers: {
          'x-api-key': API_KEY as string
        }
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching KwikClaim data:", error);
    throw new Error("Failed to fetch KwikClaim opportunities");
  }
}

/**
 * Verifies if an address has any airdrop or reward opportunities on KwikClaim
 * @param address - Ethereum address to check
 * @returns Promise<boolean> Whether address has any airdrops or rewards
 */
async function verifyKwikClaimAirdrops(address: Address): Promise<boolean> {
  try {
    const opportunities = await fetchKwikClaimOpportunities(address);
    
    // Filter for airdrop or reward opportunities with USD value
    const validOpportunities = opportunities.filter(opp => 
      (opp.type === "airdrop" || opp.type === "reward") && opp.usdAmount > 0
    );

    return validOpportunities.length > 0;
  } catch (error) {
    console.error("Error verifying KwikClaim airdrops:", error);
    throw new Error("Failed to verify KwikClaim airdrops");
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

    // Get verification results
    const mint_eligibility = await verifyKwikClaimAirdrops(address as Address);

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
