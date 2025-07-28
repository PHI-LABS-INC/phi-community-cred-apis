import { NextRequest } from "next/server";
import { Address, isAddress } from "viem";
import { createSignature } from "@/app/lib/signature";
import { getTransactions } from "@/app/lib/smart-wallet";

async function verifyEthereumOG(address: Address): Promise<boolean> {
  try {
    // Use getTransactions to get the transaction history
    const transactions = await getTransactions(address, 1); // Ethereum mainnet
    if (transactions && transactions.length > 0) {
      // Get the earliest transaction (lowest block number)
      const firstTransaction = transactions.reduce((min, tx) =>
        parseInt(tx.blockNumber) < parseInt(min.blockNumber) ? tx : min
      );
      // Check if the transaction block number is before or equal to block 2912406 (Dec 31, 2016)
      const isOG = parseInt(firstTransaction.blockNumber) <= 2912406;
      console.log(
        `Address ${address} first transaction block: ${firstTransaction.blockNumber}, 2016 status: ${isOG}`
      );
      return isOG;
    }
    // If no transactions found, not eligible
    console.log(`Address ${address} has no transactions before block 2912406`);
    return false;
  } catch (error) {
    console.error("Error verifying Ethereum 2016 status:", {
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

    const mint_eligibility = await verifyEthereumOG(address as Address);
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
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
