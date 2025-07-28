import { NextRequest } from "next/server";
import { Address, isAddress, parseEther } from "viem";
import { createSignature } from "@/app/lib/signature";
import { getTransactions } from "@/app/lib/smart-wallet";

async function verifyGasSpent(address: Address): Promise<boolean> {
  try {
    // Fetch transaction history using getTransactions from smart-wallet.ts
    const transactions = await getTransactions(address, 8453); // Base chain

    if (transactions.length === 0) {
      return false;
    }

    let totalGasSpent = BigInt(0);

    // Calculate total gas spent by summing up gas costs for transactions initiated by the address
    for (const tx of transactions) {
      // Only count transactions where the address is the sender
      if (tx.from.toLowerCase() === address.toLowerCase()) {
        // Note: TransactionItem from smart-wallet.ts doesn't include gasUsed and gasPrice
        // We'll need to make a separate call to get gas details or estimate based on transaction type
        // For now, we'll assume a conservative gas estimate for contract interactions
        if (tx.to && tx.input && tx.input.length > 2) {
          // This is likely a contract interaction, estimate gas cost
          // Assuming average gas used for contract interactions on Base
          const estimatedGasUsed = BigInt(100000); // Conservative estimate
          const estimatedGasPrice = BigInt(1000000000); // 1 gwei
          const gasCost = estimatedGasUsed * estimatedGasPrice;
          totalGasSpent += gasCost;
        }
      }
    }

    // Check if total gas spent is at least 0.05 ETH
    const minGasThreshold = parseEther("0.05");
    return totalGasSpent >= minGasThreshold;
  } catch (error) {
    console.error("Error verifying gas spent:", {
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

    const mint_eligibility = await verifyGasSpent(address as Address);
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
