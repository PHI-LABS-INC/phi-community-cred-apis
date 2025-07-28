import { NextRequest } from "next/server";
import { Address, isAddress } from "viem";
import { createSignature } from "@/app/lib/signature";
import { getTransactions } from "@/app/lib/smart-wallet";

async function verifyGenesisActivity(address: Address): Promise<boolean> {
  try {
    // Base Mainnet launched on August 9, 2023
    // First 30 days would be until September 8, 2023
    const baseMainnetLaunch = new Date("2023-08-09T00:00:00Z");
    const thirtyDaysAfterLaunch = new Date(
      baseMainnetLaunch.getTime() + 30 * 24 * 60 * 60 * 1000
    );
    const launchTimestamp = Math.floor(baseMainnetLaunch.getTime() / 1000);
    const endTimestamp = Math.floor(thirtyDaysAfterLaunch.getTime() / 1000);

    // Fetch transaction history using getTransactions from smart-wallet.ts
    const transactions = await getTransactions(address, 8453); // Base chain

    if (transactions.length === 0) {
      return false;
    }

    // Check for minting activities during the first 30 days
    for (const tx of transactions) {
      if (!tx.timeStamp) continue;
      const txTimestamp = parseInt(tx.timeStamp);

      // Skip transactions outside the genesis period
      if (txTimestamp < launchTimestamp || txTimestamp > endTimestamp) {
        continue;
      }

      // Check if the address initiated this transaction (is the sender)
      if (tx.from.toLowerCase() === address.toLowerCase()) {
        // Look for mint-related function calls
        const input = tx.input?.toLowerCase() || "";

        // Common mint function signatures and patterns
        const mintPatterns = [
          "mint",
          "safemint",
          "publicmint",
          "freemint",
          "claim",
          "0x40c10f19", // mint(address,uint256)
          "0xa0712d68", // mint(uint256)
          "0x1249c58b", // mint()
          "0x6a627842", // mint(address)
        ];

        // Check if transaction involves minting
        const isMint = mintPatterns.some((pattern) => input.includes(pattern));

        if (isMint) {
          return true;
        }

        // Also check for NFT contract interactions that might be mints
        if (input.length > 10 && tx.to) {
          // This could be a contract interaction for minting
          return true;
        }
      }
    }

    return false;
  } catch (error) {
    console.error("Error verifying genesis activity:", {
      error,
      address,
      timestamp: new Date().toISOString(),
    });
    return false;
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

    const mint_eligibility = await verifyGenesisActivity(address as Address);
    const signature = await createSignature({
      address: address as Address,
      mint_eligibility,
    });

    return new Response(JSON.stringify({ mint_eligibility, signature }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
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
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        },
      }
    );
  }
}
