import { NextRequest } from "next/server";
import { Address, isAddress, parseEther } from "viem";
import { createSignature } from "@/app/lib/signature";

const BASESCAN_API_KEY = process.env.BASE_SCAN_API_KEY_01;

interface BaseScanTransaction {
  blockHash: string;
  blockNumber: string;
  from: string;
  to: string;
  value: string;
  gasUsed: string;
  gasPrice: string;
  timeStamp: string;
  isError: string;
}

interface BaseScanResponse {
  status: string;
  message: string;
  result: BaseScanTransaction[];
}

async function verifyGasSpent(address: Address): Promise<boolean> {
  try {
    if (!BASESCAN_API_KEY) {
      console.error("Missing required BaseScan API key");
      return false;
    }

    // Fetch transaction history from BaseScan API
    const apiUrl = `https://api.etherscan.io/v2/api?chainid=8453&module=account&action=txlist&address=${address.toLowerCase()}&startblock=0&endblock=latest&sort=asc&apikey=${BASESCAN_API_KEY}`;
    const response = await fetch(apiUrl);
    const data = (await response.json()) as BaseScanResponse;

    if (data.status !== "1" || !Array.isArray(data.result)) {
      console.error("Error fetching transaction data from BaseScan:", data);
      return false;
    }

    const transactions = data.result;
    if (transactions.length === 0) {
      return false;
    }

    let totalGasSpent = BigInt(0);

    // Calculate total gas spent by summing up gas costs for transactions initiated by the address
    for (const tx of transactions) {
      // Only count transactions where the address is the sender
      if (tx.from.toLowerCase() === address.toLowerCase()) {
        const gasUsed = BigInt(tx.gasUsed);
        const gasPrice = BigInt(tx.gasPrice);
        const gasCost = gasUsed * gasPrice;
        totalGasSpent += gasCost;
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
