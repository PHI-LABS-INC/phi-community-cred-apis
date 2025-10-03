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
    // Verify if the wallet has made any transaction on Base in July or August 2023.
    const transactedInJulyAugust = await verifyJulyAugustTransact(
      address as Address
    );

    // Generate a signature including the verification result.
    const signature = await createSignature({
      address: address as Address,
      mint_eligibility: transactedInJulyAugust,
    });

    return new Response(
      JSON.stringify({
        mint_eligibility: transactedInJulyAugust,
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
 * Verifies if a wallet has made any transaction on Base in July or August 2023.
 * This function uses getTransactions from smart-wallet.ts to fetch all transactions for the given address
 * and then filters them using the July-August 2023 time window.
 *
 * @param address - The Ethereum address to verify.
 * @returns {Promise<boolean>} - True if at least one transaction occurred during July or August 2023; otherwise, false.
 */
async function verifyJulyAugustTransact(address: Address): Promise<boolean> {
  // Define July-August 2023 (UTC) time window.
  const julyStartTimestamp = 1688169600; // July 1, 2023 00:00:00 UTC
  const augustEndTimestamp = 1693526399; // August 31, 2023 23:59:59 UTC

  try {
    // Fetch all transactions using getTransactions from smart-wallet.ts
    const transactions = await getTransactions(address, 8453); // Base chain

    // Check if any transaction occurred during the defined July-August time window.
    return transactions.some((tx) => {
      if (!tx.timeStamp) return false;
      const txTimestamp = Number(tx.timeStamp);
      return (
        txTimestamp >= julyStartTimestamp && txTimestamp <= augustEndTimestamp
      );
    });
  } catch (error) {
    console.error("Fetch error:", error);
    return false;
  }
}
