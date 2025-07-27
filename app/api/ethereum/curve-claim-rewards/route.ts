import { NextRequest } from "next/server";
import { Address, isAddress } from "viem";
import { createSignature } from "@/app/lib/signature";

const ETHERSCAN_API = "https://api.etherscan.io/api";
const API_KEY = process.env.ETHERSCAN_API_KEY;

// Curve veCRV rewards claim contract
const CURVE_REWARDS_CLAIM = "0xa464e6dcda8ac41e03616f95f4bc98a13b8922dc";

type Tx = { to?: string };

async function hasClaimedRewards(address: Address): Promise<boolean> {
  const url = `${ETHERSCAN_API}?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&sort=desc&apikey=${API_KEY}`;

  try {
    const resp = await fetch(url);
    const data = await resp.json();

    if (!data || data.status === "0") {
      throw new Error("Failed to fetch transaction data");
    }

    if (!data.result || !Array.isArray(data.result)) return false;

    // Look for transactions to the Curve rewards claim contract
    return (data.result as Tx[]).some(
      (tx) => tx.to?.toLowerCase() === CURVE_REWARDS_CLAIM.toLowerCase()
    );
  } catch (error) {
    console.error("Error verifying Curve rewards claim:", {
      error,
      address,
      timestamp: new Date().toISOString(),
    });
    throw new Error(
      `Failed to verify Curve rewards claim: ${
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

    const mint_eligibility = await hasClaimedRewards(address as Address);
    const signature = await createSignature({
      address: address as Address,
      mint_eligibility,
    });

    return new Response(JSON.stringify({ mint_eligibility, signature }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
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
