import { Address } from "viem";
import { isAddress } from "viem";
import { NextRequest } from "next/server";
import { createSignature } from "@/app/lib/signature";

export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get("address");

  if (!address || !isAddress(address)) {
    return new Response(
      JSON.stringify({ error: "Invalid Ethereum address provided" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const gasSpent = await verifyBaseGasSpent(address as Address);
    const signature = await createSignature({
      address: address as Address,
      mint_eligibility: gasSpent,
    });

    return new Response(
      JSON.stringify({ mint_eligibility: gasSpent, signature }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error("Error in base gas verification:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    });
  }
}

async function verifyBaseGasSpent(address: Address): Promise<boolean> {
  const BASESCAN_API_KEY = process.env.BASE_SCAN_API_KEY_02;
  if (!BASESCAN_API_KEY) {
    console.error("Missing BaseScan API key");
    return false;
  }

  // Fetch the transaction list from BaseScan for the provided address.
  // We check if the address has initiated any transaction (i.e., spent gas).
  const apiUrl = `https://api.basescan.org/api?module=account&action=txlist&address=${address.toLowerCase()}&startblock=0&endblock=latest&sort=asc&apikey=${BASESCAN_API_KEY}`;
  try {
    const response = await fetch(apiUrl);
    const data = await response.json();

    if (!data || data.status !== "1" || !Array.isArray(data.result)) {
      console.error("Error fetching transaction data from BaseScan:", data);
      return false;
    }

    // Check if any transaction was initiated by the address
    return data.result.some((tx: { from: string }) => {
      return tx.from.toLowerCase() === address.toLowerCase();
    });
  } catch (error) {
    console.error("Fetch error:", error);
    return false;
  }
}
