import { NextRequest } from "next/server";
import { Address, isAddress } from "viem";
import { createSignature } from "@/app/lib/signature";
import { verifyMultipleWalletsSimple } from "@/app/lib/multiWalletVerifier";

async function verifyEthereumOG2016(address: Address): Promise<boolean> {
  try {
    console.log("Checking Ethereum OG 2016 status for address:", address);

    const etherscanApiKey = process.env.ETHERSCAN_API_KEY;
    if (!etherscanApiKey) {
      console.error("ETHERSCAN_API_KEY not found");
      return false;
    }

    // Get the earliest transactions to check account creation date
    const url = `https://api.etherscan.io/api?module=account&action=txlist&address=${address}&startblock=0&endblock=3000000&sort=asc&page=1&offset=10&apikey=${etherscanApiKey}`;

    const response = await fetch(url);
    if (!response.ok) {
      console.error("Failed to fetch from Etherscan:", response.statusText);
      return false;
    }

    const data = await response.json();

    if (
      data.status === "1" &&
      Array.isArray(data.result) &&
      data.result.length > 0
    ) {
      // Get the first transaction timestamp
      const firstTransaction = data.result[0];
      const firstTxTimestamp = parseInt(firstTransaction.timeStamp) * 1000;
      const firstTxDate = new Date(firstTxTimestamp);

      // Check if the first transaction was in 2016 or earlier
      const is2016OG = firstTxDate.getFullYear() <= 2016;

      console.log(
        `Address ${address} first transaction: ${firstTxDate.toISOString()}`
      );
      console.log(`Is 2016 OG: ${is2016OG}`);

      return is2016OG;
    }

    // If no transactions found, check if address was created through other means
    // Some addresses might have been created but never used
    console.log(`No transactions found for address ${address} in early blocks`);
    return false;
  } catch (error) {
    console.error("Error verifying Ethereum OG 2016 status:", error);
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

    const { mint_eligibility } = await verifyMultipleWalletsSimple(
      req,
      verifyEthereumOG2016
    );

    const signature = await createSignature({
      address: address as Address, // Always use the primary address for signature
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
