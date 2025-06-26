import { NextRequest } from "next/server";
import { Address, isAddress } from "viem";
import { createSignature } from "@/app/lib/signature";

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

    // Check if the address has purchased art on ArtBlocks
    const mint_eligibility = await verifyArtBlocksPurchaser(address as Address);

    // Generate cryptographic signature of the verification result
    const signature = await createSignature({
      address: address as Address,
      mint_eligibility,
    });

    return new Response(
      JSON.stringify({
        mint_eligibility,
        signature,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in artblocks-purchaser verifier:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

/**
 * Verifies if the address has purchased art on ArtBlocks
 */
async function verifyArtBlocksPurchaser(address: Address): Promise<boolean> {
  try {
    const etherscanApiKey = process.env.ETHERSCAN_API_KEY;
    if (!etherscanApiKey) {
      console.error("ETHERSCAN_API_KEY not found");
      return false;
    }

    // ArtBlocks main contract address
    const artBlocksContract = "0xa7d8d9ef8D8Ce8992Df33D8b8CF4Aebabd5bD270";

    console.log(`Checking if ${address} has purchased art on ArtBlocks`);

    // Get all transactions from this address
    const url = `https://api.etherscan.io/api?module=account&action=txlist&address=${address}&startblock=0&endblock=latest&sort=desc&apikey=${etherscanApiKey}`;

    const response = await fetch(url);
    if (!response.ok) {
      console.error("Failed to fetch from Etherscan:", response.statusText);
      return false;
    }

    const data = await response.json();

    if (data.status === "1" && Array.isArray(data.result)) {
      // Filter transactions to ArtBlocks contract with value > 0 (purchases)
      const purchaseTransactions = data.result.filter(
        (tx: { to?: string; value: string; isError: string }) =>
          tx.to?.toLowerCase() === artBlocksContract.toLowerCase() &&
          parseInt(tx.value) > 0 && // Transaction has value (payment)
          tx.isError === "0" // Only successful transactions
      );

      if (purchaseTransactions.length > 0) {
        console.log(
          `Found ${purchaseTransactions.length} ArtBlocks purchase transactions for address ${address}`
        );
        return true;
      }
    }

    console.log(`No ArtBlocks purchases found for address ${address}`);
    return false;
  } catch (error) {
    console.error("Error verifying ArtBlocks purchaser status:", error);
    return false;
  }
}
