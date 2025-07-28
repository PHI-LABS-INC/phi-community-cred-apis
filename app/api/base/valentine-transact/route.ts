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
 * This function uses getTransactions from smart-wallet.ts to fetch all transactions for the given address
 * and then filters them using the Valentine's Day time window (using Feb 14, 2025 as an example).
 *
 * @param address - The Ethereum address to verify.
 * @returns {Promise<boolean>} - True if at least one transaction occurred during Valentine's Day; otherwise, false.
 */
async function verifyValentinesTransact(address: Address): Promise<boolean> {
  // Define Valentine's Day (UTC) time window — using Feb 14, 2025 as an example.
  const valentinesStartTimestamp = 1739491200; // Feb 14, 2025 00:00:00 UTC
  const valentinesEndTimestamp = 1739577599; // Feb 14, 2025 23:59:59 UTC

  try {
    // Fetch all transactions using getTransactions from smart-wallet.ts
    const transactions = await getTransactions(address, 8453); // Base chain

    // Check if any transaction occurred during the defined Valentine's Day time window.
    return transactions.some((tx) => {
      if (!tx.timeStamp) return false;
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
