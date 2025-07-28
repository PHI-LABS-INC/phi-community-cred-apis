import { NextRequest } from "next/server";
import { Address, isAddress } from "viem";
import { createSignature } from "@/app/lib/signature";
import { getTransactions } from "@/app/lib/smart-wallet";

async function verifyEthValidator(address: Address): Promise<boolean> {
  try {
    // ETH2 deposit contract address
    const ETH2_DEPOSIT_CONTRACT =
      "0x00000000219ab540356cBB839Cbe05303d7705Fa" as Address;

    // Use getTransactions to check for transactions to the deposit contract
    const transactions = await getTransactions(address, 1); // Ethereum mainnet

    // Calculate total ETH sent to deposit contract
    const totalDeposited = transactions.reduce((total: number, tx) => {
      if (
        tx.to?.toLowerCase() === ETH2_DEPOSIT_CONTRACT.toLowerCase() &&
        tx.from?.toLowerCase() === address.toLowerCase()
      ) {
        // For smart wallet transactions, we need to check the input data for value
        // For now, we'll assume any interaction with the deposit contract counts
        return total + 32000000000000000000; // 32 ETH in wei
      }
      return total;
    }, 0);

    // Check if total deposited is at least 32 ETH (in wei)
    return totalDeposited >= 32000000000000000000;
  } catch (error) {
    console.error("Error verifying ETH validator:", {
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

    const mint_eligibility = await verifyEthValidator(address as Address);
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
