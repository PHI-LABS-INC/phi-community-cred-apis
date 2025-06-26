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

    // Check if the address has placed at least 1 bid in a Nouns auction
    const mint_eligibility = await verifyNounsAuctionBidder(address as Address);

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
    console.error("Error in nouns-auction-bidder verifier:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

/**
 * Verifies if the address has placed at least 1 bid in a Nouns auction
 */
async function verifyNounsAuctionBidder(address: Address): Promise<boolean> {
  try {
    const etherscanApiKey = process.env.ETHERSCAN_API_KEY;
    if (!etherscanApiKey) {
      console.error("ETHERSCAN_API_KEY not found");
      return false;
    }

    // Nouns Auction House contract address
    const nounsAuctionHouse = "0x830BD73E4184ceF73443C15111a1DF14e495C706";

    // createBid method signature: createBid(uint256 nounId,uint32 clientId)
    const createBidMethodId = "0xabbfb786";

    // Get all transactions from this address to the auction house
    const url = `https://api.etherscan.io/api?module=account&action=txlist&address=${address}&startblock=12985438&endblock=latest&sort=desc&apikey=${etherscanApiKey}`;

    console.log(
      `Checking if ${address} has called createBid on Nouns auction house`
    );

    const response = await fetch(url);
    if (!response.ok) {
      console.error("Failed to fetch from Etherscan:", response.statusText);
      return false;
    }

    const data = await response.json();

    if (data.status === "1" && Array.isArray(data.result)) {
      // Filter transactions to the auction house that call createBid method
      const bidTransactions = data.result.filter(
        (tx: { to?: string; input?: string; isError: string }) =>
          tx.to?.toLowerCase() === nounsAuctionHouse.toLowerCase() &&
          tx.input?.startsWith(createBidMethodId) &&
          tx.isError === "0" // Only successful transactions
      );

      const bidCount = bidTransactions.length;
      console.log(
        `Found ${bidCount} createBid transactions for address ${address}`
      );
      return bidCount > 0;
    } else {
      console.log(`No createBid transactions found for address ${address}`);
      return false;
    }
  } catch (error) {
    console.error("Error verifying Nouns auction bidder status:", error);
    return false;
  }
}
