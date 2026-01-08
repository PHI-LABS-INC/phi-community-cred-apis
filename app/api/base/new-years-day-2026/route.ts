import { NextRequest } from "next/server";
import { Address, isAddress } from "viem";
import { createSignature } from "@/app/lib/signature";
import { getTransactions } from "@/app/lib/smart-wallet";

export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get("address");

  if (!address || !isAddress(address)) {
    return new Response(
      JSON.stringify({ error: "Invalid Ethereum address provided" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    // Verify if the wallet has made any transaction on Base on New Year's Day 2026.
    const transactedOnNewYears = await verifyNewYearsTransact(
      address as Address
    );

    // Generate a signature including the verification result.
    const signature = await createSignature({
      address: address as Address,
      mint_eligibility: transactedOnNewYears,
    });

    return new Response(
      JSON.stringify({
        mint_eligibility: transactedOnNewYears,
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
    console.error("Error verifying New Year's Day transaction:", error);
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
 * Verifies if a wallet has made any transaction on Base on New Year's Day 2026.
 * This function uses getTransactions from smart-wallet.ts to fetch all transactions for the given address
 * and then filters them using the New Year's Day time window (January 1, 2026).
 *
 * @param address - The Ethereum address to verify.
 * @returns {Promise<boolean>} - True if at least one transaction occurred during New Year's Day 2026; otherwise, false.
 */
async function verifyNewYearsTransact(address: Address): Promise<boolean> {
  // Define New Year's Day 2026 (UTC) time window — January 1, 2026.
  const newYearsStartTimestamp = 1735689600; // Jan 1, 2026 00:00:00 UTC
  const newYearsEndTimestamp = 1735775999; // Jan 1, 2026 23:59:59 UTC

  try {
    // Fetch all transactions using getTransactions from smart-wallet.ts
    const transactions = await getTransactions(address, 8453); // Base chain

    // Check if any transaction occurred during the defined New Year's Day time window.
    return transactions.some((tx) => {
      if (!tx.timeStamp) return false;
      const txTimestamp = Number(tx.timeStamp);
      return (
        txTimestamp >= newYearsStartTimestamp &&
        txTimestamp <= newYearsEndTimestamp
      );
    });
  } catch (error) {
    console.error("Fetch error:", error);
    return false;
  }
}

