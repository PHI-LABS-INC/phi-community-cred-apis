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
    // Verify if the wallet has made any transaction on Base on Bitcoin Pizza Day.
    const transactedOnPizzaDay = await verifyPizzaDayTransact(
      address as Address
    );

    // Generate a signature including the verification result.
    const signature = await createSignature({
      address: address as Address,
      mint_eligibility: transactedOnPizzaDay,
    });

    return new Response(
      JSON.stringify({
        mint_eligibility: transactedOnPizzaDay,
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
    console.error("Error verifying Bitcoin Pizza Day transaction:", error);
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
 * Verifies if a wallet has made any transaction on Base on Bitcoin Pizza Day (May 22, 2025).
 * This function uses getTransactions from smart-wallet.ts to fetch all transactions for the given address
 * and then filters them using the Bitcoin Pizza Day time window.
 *
 * @param address - The Ethereum address to verify.
 * @returns {Promise<boolean>} - True if at least one transaction occurred during Bitcoin Pizza Day; otherwise, false.
 */
async function verifyPizzaDayTransact(address: Address): Promise<boolean> {
  // Define Bitcoin Pizza Day (UTC) time window — May 22, 2025
  const pizzaDayStartTimestamp = 1747958400; // May 22, 2025 00:00:00 UTC
  const pizzaDayEndTimestamp = 1748044799; // May 22, 2025 23:59:59 UTC

  try {
    // Fetch all transactions using getTransactions from smart-wallet.ts
    const transactions = await getTransactions(address, 8453); // Base chain

    // Check if any transaction occurred during the defined Bitcoin Pizza Day time window.
    return transactions.some((tx) => {
      if (!tx.timeStamp) return false;
      const txTimestamp = Number(tx.timeStamp);
      return (
        txTimestamp >= pizzaDayStartTimestamp &&
        txTimestamp <= pizzaDayEndTimestamp
      );
    });
  } catch (error) {
    console.error("Fetch error:", error);
    return false;
  }
}
