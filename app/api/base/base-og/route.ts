import { NextRequest } from "next/server";
import { Address, isAddress } from "viem";
import { createSignature } from "@/app/lib/signature";

const BASESCAN_API_KEY = process.env.BASE_SCAN_API_KEY_01;

export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get("address");

  if (!address || !isAddress(address)) {
    return new Response(
      JSON.stringify({ error: "Invalid Ethereum address provided" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    // Verify if the wallet has made any transaction on Base in August 2023.
    const transactedInAugust = await verifyAugustTransact(address as Address);

    // Generate a signature including the verification result.
    const signature = await createSignature({
      address: address as Address,
      mint_eligibility: transactedInAugust,
    });

    return new Response(
      JSON.stringify({
        mint_eligibility: transactedInAugust,
        signature,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error("Error verifying August transaction:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    });
  }
}

/**
 * Verifies if a wallet has made any transaction on Base in August 2023.
 * This function uses the BaseScan API to fetch all transactions for the given address
 * and then filters them using the August 2023 time window.
 *
 * @param address - The Ethereum address to verify.
 * @returns {Promise<boolean>} - True if at least one transaction occurred during August 2023; otherwise, false.
 */
async function verifyAugustTransact(address: Address): Promise<boolean> {
  // Define August 2023 (UTC) time window.
  const augustStartTimestamp = 1690848000; // August 1, 2023 00:00:00 UTC
  const augustEndTimestamp = 1693526399; // August 31, 2023 23:59:59 UTC

  // Fetch all transactions from the BaseScan API.
  // Note: We use startblock=0 and endblock=latest to get the complete history.
  const apiUrl = `https://api.basescan.org/api?module=account&action=txlist&address=${address.toLowerCase()}&startblock=0&endblock=latest&sort=asc&apikey=${BASESCAN_API_KEY}`;

  try {
    const response = await fetch(apiUrl);
    const data = await response.json();

    if (!data || data.status !== "1" || !Array.isArray(data.result)) {
      console.error("Error fetching transaction data from BaseScan:", data);
      return false;
    }

    // Check if any transaction occurred during the defined August time window.
    return data.result.some((tx: { timeStamp: string }) => {
      const txTimestamp = Number(tx.timeStamp);
      return (
        txTimestamp >= augustStartTimestamp && txTimestamp <= augustEndTimestamp
      );
    });
  } catch (error) {
    console.error("Fetch error:", error);
    return false;
  }
}
