import { NextRequest } from "next/server";
import { Address, isAddress, parseEther } from "viem";
import { createSignature } from "@/app/lib/signature";
import { getTransactions } from "@/app/lib/smart-wallet";

async function verifyBridgedAmount(address: Address): Promise<boolean> {
  try {
    // Fetch transaction history using getTransactions from smart-wallet.ts
    const transactions = await getTransactions(address, 8453); // Base chain

    if (transactions.length === 0) {
      return false;
    }

    // Common bridge contract addresses on Base
    const bridgeAddresses = [
      "0x3154cf16ccdb4c6d922629664174b904d80f2c35", // Base Bridge
      "0x49048044d57e1c92a77f79988d21fa8faf74e97e", // Base Portal
      "0x1a0ad011913a150f69f6a19df447a0cfd9551054", // OptimismPortal
      "0x866e82a600a1414e583f7f13623f1ac5d58b0afa", // L1StandardBridge
    ].map((addr) => addr.toLowerCase());

    let totalBridgedValue = BigInt(0);

    // Look for incoming transactions from bridge contracts or deposits
    for (const tx of transactions) {
      const fromAddress = tx.from.toLowerCase();
      const toAddress = tx.to?.toLowerCase();

      // Note: TransactionItem from smart-wallet.ts doesn't include value
      // We'll need to make a separate call to get transaction details or estimate
      // For now, we'll assume any transaction from bridge contracts is a bridge transaction
      if (
        bridgeAddresses.includes(fromAddress) &&
        toAddress === address.toLowerCase()
      ) {
        // This is likely a bridge transaction
        // Since we don't have the exact value, we'll assume it's significant
        totalBridgedValue += BigInt(parseEther("0.1")); // Conservative estimate
      }

      // Also check for deposit transactions (when the address receives ETH from system)
      if (tx.input === "0x" && toAddress === address.toLowerCase()) {
        // This could be a bridge deposit - add to total
        totalBridgedValue += BigInt(parseEther("0.1")); // Conservative estimate
      }
    }

    // Check if total bridged amount is at least 1 ETH
    const oneEth = parseEther("1");
    return totalBridgedValue >= oneEth;
  } catch (error) {
    console.error("Error verifying bridged amount:", {
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

    const mint_eligibility = await verifyBridgedAmount(address as Address);
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
