import { NextRequest } from "next/server";
import { Address, isAddress } from "viem";
import { createSignature } from "@/app/lib/signature";

const BASESCAN_API_KEY = process.env.BASE_SCAN_API_KEY_01;

interface BaseScanResponse {
  status: string;
  message: string;
  result: Array<{
    gasPrice: string;
    from: string;
    timeStamp: string;
  }>;
}

async function verifyLowGasTransaction(
  address: Address
): Promise<[boolean, string]> {
  try {
    if (!BASESCAN_API_KEY) {
      console.error("Missing required BaseScan API key");
      return [false, "0"];
    }

    // Fetch transaction history from BaseScan API
    const apiUrl = `https://api.etherscan.io/v2/api?chainid=8453&module=account&action=txlist&address=${address.toLowerCase()}&startblock=0&endblock=latest&sort=asc&apikey=${BASESCAN_API_KEY}`;
    const response = await fetch(apiUrl);
    const data = (await response.json()) as BaseScanResponse;

    if (data.status !== "1" || !Array.isArray(data.result)) {
      console.error("Error fetching transaction data from BaseScan:", data);
      return [false, "0"];
    }

    const transactions = data.result;
    if (transactions.length === 0) {
      return [false, "0"];
    }

    // Find transactions with gas price under 10 gwei
    const LOW_GAS_THRESHOLD = BigInt("10000000000"); // 10 gwei in wei
    let lowestGasPrice = BigInt(Number.MAX_SAFE_INTEGER);

    for (const tx of transactions) {
      // Only count transactions where the address is the sender
      if (tx.from.toLowerCase() === address.toLowerCase()) {
        const gasPrice = BigInt(tx.gasPrice);
        if (gasPrice < lowestGasPrice) {
          lowestGasPrice = gasPrice;
        }
        // If we find a transaction under 10 gwei, we can return early
        if (gasPrice < LOW_GAS_THRESHOLD) {
          return [true, (Number(gasPrice) / 1e9).toFixed(2)]; // Convert to gwei for display
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
