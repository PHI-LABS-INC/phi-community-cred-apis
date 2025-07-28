import { NextRequest } from "next/server";
import { Address } from "viem";
import { isAddress } from "viem";
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
    for (const tx of transactions) {
      // Only include transactions where the sender is the provided address
      if (tx.from && tx.from.toLowerCase() === address.toLowerCase()) {
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
    console.log("Total gas spent:", totalGasSpent);

    // Define the threshold: 0.1 ETH in wei
    const threshold = BigInt("10000000000000000000000");
    return totalGasSpent >= threshold;
  } catch (error) {
    console.error("Error verifying gas spent on Base:", error);
    return false;
  }
}

export async function GET(req: NextRequest) {
  try {
    const address = req.nextUrl.searchParams.get("address");

    if (!address || !isAddress(address)) {
      return new Response(
        JSON.stringify({ error: "Invalid Ethereum address provided" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
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
    console.error("Error in Base gas verification handler:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
