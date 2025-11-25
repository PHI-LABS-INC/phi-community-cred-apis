import { NextRequest } from "next/server";
import { Address, isAddress } from "viem";
import { createSignature } from "@/app/lib/signature";
import { getTransactions } from "@/app/lib/smart-wallet";

const JESSE_CONTRACT = "0x50f88fe97f72cd3e75b9eb4f747f59bceba80d59" as Address;

export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get("address");

  if (!address || !isAddress(address)) {
    return new Response(
      JSON.stringify({ error: "Invalid Ethereum address provided" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    // Verify if the wallet bought $JESSE on launch day (November 20, 2025)
    const mint_eligibility = await verifyJesseDayOnePurchase(
      address as Address
    );

    // Generate a signature including the verification result
    const signature = await createSignature({
      address: address as Address,
      mint_eligibility,
    });

    return new Response(
      JSON.stringify({
        mint_eligibility,
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
    console.error("Error verifying JESSE day one purchase:", error);
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
 * Verifies if a wallet bought $JESSE on launch day (November 20, 2025).
 * This function uses getTransactions from smart-wallet.ts to fetch all transactions for the given address
 * and then filters them to find transactions to the JESSE contract on launch day.
 *
 * @param address - The Ethereum address to verify.
 * @returns {Promise<boolean>} - True if at least one transaction to JESSE contract occurred on launch day; otherwise, false.
 */
async function verifyJesseDayOnePurchase(address: Address): Promise<boolean> {
  // Define launch day (UTC) time window — November 20, 2025
  const launchDayStart = 1763596800; // November 20, 2025 00:00:00 UTC
  const launchDayEnd = 1763683199; // November 20, 2025 23:59:59 UTC

  try {
    // Fetch all transactions using getTransactions from smart-wallet.ts
    const transactions = await getTransactions(address, 8453); // Base chain

    // Check if any transaction to JESSE contract occurred during launch day
    return transactions.some((tx) => {
      if (!tx.timeStamp || !tx.to) return false;

      const txTimestamp = Number(tx.timeStamp);
      const isOnLaunchDay =
        txTimestamp >= launchDayStart && txTimestamp <= launchDayEnd;

      if (!isOnLaunchDay) return false;

      // Check if transaction is to the JESSE contract
      const isJesseContract =
        tx.to.toLowerCase() === JESSE_CONTRACT.toLowerCase();

      return isJesseContract;
    });
  } catch (error) {
    console.error("Fetch error:", error);
    return false;
  }
}
