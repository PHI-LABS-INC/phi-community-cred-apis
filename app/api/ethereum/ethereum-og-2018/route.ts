import { NextRequest } from "next/server";
import { Address, isAddress } from "viem";
import { createSignature } from "@/app/lib/signature";

interface EtherscanTransaction {
  blockNumber: string;
  timeStamp: string;
  hash: string;
  from: string;
  to: string;
  value: string;
  gas: string;
  gasPrice: string;
  gasUsed: string;
  isError: string;
}

async function verifyEthereumOG(address: Address): Promise<boolean> {
  try {
    const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY;

    if (!ETHERSCAN_API_KEY) {
      console.error("Missing Etherscan API key");
      return false;
    }

    // Use Etherscan API to get the transaction history
    // We'll get transactions in ascending order to find the earliest one
    const apiUrl = `https://api.etherscan.io/api?module=account&action=txlist&address=${address}&startblock=0&endblock=6985879&page=1&offset=1&sort=asc&apikey=${ETHERSCAN_API_KEY}`;

    const response = await fetch(apiUrl);
    const data = await response.json();

    if (
      data.status === "1" &&
      Array.isArray(data.result) &&
      data.result.length > 0
    ) {
      // Get the first (earliest) transaction
      const firstTransaction: EtherscanTransaction = data.result[0];

      // Check if the transaction block number is before or equal to block 6985879 (Dec 31, 2018)
      const isOG = parseInt(firstTransaction.blockNumber) <= 6985879;

      console.log(
        `Address ${address} first transaction block: ${firstTransaction.blockNumber}, 2018 status: ${isOG}`
      );

      return isOG;
    }

    // If no transactions found, not eligible
    console.log(`Address ${address} has no transactions before block 6985879`);
    return false;
  } catch (error) {
    console.error("Error verifying Ethereum 2018 status:", {
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
