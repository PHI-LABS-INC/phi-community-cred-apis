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
    // Verify if the wallet has made any transaction on Base on Valentine's Day.
    const transactedOnValentines = await verifyValentinesTransact(
      address as Address
    );

    // Generate a signature including the verification result.
    const signature = await createSignature({
      address: address as Address,
      mint_eligibility: transactedOnValentines,
    });

    return new Response(
      JSON.stringify({
        mint_eligibility: transactedOnValentines,
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
    console.error("Error verifying Valentine's Day transaction:", error);
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
 * Verifies if a wallet has made any transaction on Base on Valentine's Day.
 * This function uses the BaseScan API to fetch all transactions for the given address
 * and then filters them using the Valentine's Day time window (using Feb 14, 2025 as an example).
 *
 * @param address - The Ethereum address to verify.
 * @returns {Promise<boolean>} - True if at least one transaction occurred during Valentine's Day; otherwise, false.
 */
async function verifyValentinesTransact(address: Address): Promise<boolean> {
  // Define Valentine's Day (UTC) time window — using Feb 14, 2025 as an example.
  const valentinesStartTimestamp = 1739491200; // Feb 14, 2025 00:00:00 UTC
  const valentinesEndTimestamp = 1739577599; // Feb 14, 2025 23:59:59 UTC

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

    // Check if any transaction occurred during the defined Valentine's Day time window.
    return data.result.some((tx: { timeStamp: string }) => {
      const txTimestamp = Number(tx.timeStamp);
      return (
        txTimestamp >= valentinesStartTimestamp &&
        txTimestamp <= valentinesEndTimestamp
      );
    });
  } catch (error) {
    console.error("Fetch error:", error);
    return false;
  }
}
