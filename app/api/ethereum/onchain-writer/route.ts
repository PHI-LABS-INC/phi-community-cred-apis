import { NextRequest } from "next/server";
import { Address, isAddress } from "viem";
import { createSignature } from "@/app/lib/signature";
import { verifyMultipleWalletsSimple } from "@/app/lib/multiWalletVerifier";

async function verifyOnchainWriter(address: Address): Promise<boolean> {
  try {
    console.log("Checking onchain writing activity for address:", address);

    const etherscanApiKey = process.env.ETHERSCAN_API_KEY;
    if (!etherscanApiKey) {
      console.error("ETHERSCAN_API_KEY not found");
      return false;
    }

    // Get all transactions from this address
    const url = `https://api.etherscan.io/api?module=account&action=txlist&address=${address}&startblock=0&endblock=latest&sort=desc&apikey=${etherscanApiKey}`;

    const response = await fetch(url);
    if (!response.ok) {
      console.error("Failed to fetch from Etherscan:", response.statusText);
      return false;
    }

    const data = await response.json();

    if (data.status === "1" && Array.isArray(data.result)) {
      const transactions = data.result;

      // Look for transactions that likely contain written content
      const writingTransactions = transactions.filter(
        (tx: { input: string; isError: string; gasUsed: string }) => {
          if (tx.isError !== "0" || !tx.input || tx.input.length <= 10) {
            return false;
          }

          // Check for significant input data that might contain text/content
          // Typical onchain writing will have substantial input data
          const inputLength = tx.input.length;
          const gasUsed = parseInt(tx.gasUsed);

          // Look for transactions with:
          // 1. Substantial input data (potential text content)
          // 2. High gas usage (indicating complex operations like storing data)
          const hasSubstantialInput = inputLength > 200; // More than 100 bytes of data
          const hasHighGasUsage = gasUsed > 100000; // High gas suggests data storage

          return hasSubstantialInput || hasHighGasUsage;
        }
      );

      // Check for common writing/publishing method signatures
      const publishingTransactions = transactions.filter(
        (tx: { input: string; isError: string }) => {
          if (tx.isError !== "0" || !tx.input || tx.input.length < 10) {
            return false;
          }

          // Common method signatures for onchain writing/publishing
          const writingMethodIds = [
            "0xa9059cbb", // transfer (often used to send data)
            "0x23b872dd", // transferFrom
            "0x095ea7b3", // approve
            "0x40c10f19", // mint (often used for publishing content as NFTs)
            "0xa0712d68", // mint
            "0xd85d3d27", // mintTo
            "0x60806040", // Contract creation (publishing contracts)
            // Add more specific writing/publishing signatures as needed
          ];

          // Also check for ENS text record updates (common for onchain writers)
          const ensTextMethods = [
            "0x10f13a8c", // setText
            "0x623195b0", // setContenthash
          ];

          const allMethods = [...writingMethodIds, ...ensTextMethods];

          return allMethods.some((methodId) => tx.input.startsWith(methodId));
        }
      );

      // Calculate writing score
      let writingScore = 0;

      // Score for transactions with substantial input data
      writingScore += writingTransactions.length * 2;

      // Score for specific publishing transactions
      writingScore += publishingTransactions.length * 3;

      // Look for regular pattern of writing (consistent activity over time)
      if (writingTransactions.length >= 5) {
        writingScore += 10; // Bonus for regular writing activity
      }

      console.log(`Address ${address} writing score: ${writingScore}`);
      console.log(`- Writing transactions: ${writingTransactions.length}`);
      console.log(
        `- Publishing transactions: ${publishingTransactions.length}`
      );

      // Consider as onchain writer if score >= 10
      const isWriter = writingScore >= 10;
      return isWriter;
    }

    console.log(`No onchain writing activity found for address ${address}`);
    return false;
  } catch (error) {
    console.error("Error verifying onchain writer status:", error);
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
      verifyOnchainWriter
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
