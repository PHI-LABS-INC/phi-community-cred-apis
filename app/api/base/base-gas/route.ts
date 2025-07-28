import { Address } from "viem";
import { isAddress } from "viem";
import { NextRequest } from "next/server";
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
    const gasSpent = await verifyBaseGasSpent(address as Address);
    const signature = await createSignature({
      address: address as Address,
      mint_eligibility: gasSpent,
    });

    return new Response(
      JSON.stringify({ mint_eligibility: gasSpent, signature }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error("Error in base gas verification:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    });
  }
}

async function verifyBaseGasSpent(address: Address): Promise<boolean> {
  try {
    // Fetch transaction history using getTransactions from smart-wallet.ts
    const transactions = await getTransactions(address, 8453); // Base chain

    // Check if any transaction was initiated by the address
    return transactions.some((tx) => {
      return tx.from.toLowerCase() === address.toLowerCase();
    });
  } catch (error) {
    console.error("Fetch error:", error);
    return false;
  }
}
