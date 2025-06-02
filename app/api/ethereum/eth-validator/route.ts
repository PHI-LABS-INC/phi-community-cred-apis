import { NextRequest } from "next/server";
import { Address, isAddress } from "viem";
import { createSignature } from "@/app/lib/signature";

interface EtherscanTransaction {
  to: string;
  from: string;
  value: string;
  hash: string;
  blockNumber: string;
}

async function verifyEthValidator(address: Address): Promise<boolean> {
  try {
    // ETH2 deposit contract address
    const ETH2_DEPOSIT_CONTRACT = "0x00000000219ab540356cBB839Cbe05303d7705Fa";
    const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY;

    if (!ETHERSCAN_API_KEY) {
      console.error("Missing Etherscan API key");
      return false;
    }

    // Use Etherscan API to check for transactions to the deposit contract
    const apiUrl = `https://api.etherscan.io/api?module=account&action=txlist&address=${address}&startblock=11052984&endblock=latest&sort=asc&apikey=${ETHERSCAN_API_KEY}`;

    const response = await fetch(apiUrl);
    const data = await response.json();

    if (data.status === "1" && Array.isArray(data.result)) {
      // Calculate total ETH sent to deposit contract
      const totalDeposited = data.result.reduce(
        (total: number, tx: EtherscanTransaction) => {
          if (
            tx.to?.toLowerCase() === ETH2_DEPOSIT_CONTRACT.toLowerCase() &&
            tx.from.toLowerCase() === address.toLowerCase()
          ) {
            return total + parseFloat(tx.value);
          }
          return total;
        },
        0
      );

      // Check if total deposited is at least 32 ETH (in wei)
      return totalDeposited >= 32000000000000000000;
    }

    return false;
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
