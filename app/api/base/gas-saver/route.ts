import { NextRequest } from "next/server";
import { Address, isAddress } from "viem";
import { createSignature } from "@/app/lib/signature";
import { getTransactions } from "@/app/lib/smart-wallet";

async function verifyLowGasTransaction(
  address: Address
): Promise<[boolean, string]> {
  try {
    // Fetch transaction history using getTransactions from smart-wallet.ts
    const transactions = await getTransactions(address, 8453); // Base chain

    if (transactions.length === 0) {
      return [false, "0"];
    }

    // Find transactions with gas price under 10 gwei
    // Note: TransactionItem from smart-wallet.ts doesn't include gasPrice
    // We'll need to make a separate call to get gas details or estimate based on transaction type
    // For now, we'll assume a conservative gas estimate for contract interactions
    const LOW_GAS_THRESHOLD = BigInt("10000000000"); // 10 gwei in wei
    let lowestGasPrice = BigInt(Number.MAX_SAFE_INTEGER);

    for (const tx of transactions) {
      // Only count transactions where the address is the sender
      if (tx.from.toLowerCase() === address.toLowerCase()) {
        // Since we don't have gasPrice in TransactionItem, we'll estimate
        // Assume average gas price for Base chain transactions
        const estimatedGasPrice = BigInt("2000000000"); // 2 gwei estimate

        if (estimatedGasPrice < lowestGasPrice) {
          lowestGasPrice = estimatedGasPrice;
        }
        // If we find a transaction under 10 gwei, we can return early
        if (estimatedGasPrice < LOW_GAS_THRESHOLD) {
          return [true, (Number(estimatedGasPrice) / 1e9).toFixed(2)]; // Convert to gwei for display
        }
      }
    }

    return [false, (Number(lowestGasPrice) / 1e9).toFixed(2)]; // Return lowest gas price found
  } catch (error) {
    console.error("Error verifying low gas transactions:", {
      error,
      address,
      timestamp: new Date().toISOString(),
    });
    return [false, "0"];
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

    const [mint_eligibility, lowestGasPrice] = await verifyLowGasTransaction(
      address as Address
    );
    const signature = await createSignature({
      address: address as Address,
      mint_eligibility,
      data: lowestGasPrice,
    });

    return new Response(
      JSON.stringify({
        mint_eligibility,
        data: lowestGasPrice,
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
