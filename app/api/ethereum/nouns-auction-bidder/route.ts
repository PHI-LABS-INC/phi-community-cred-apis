import { NextRequest } from "next/server";
import { Address, isAddress } from "viem";
import { createSignature } from "@/app/lib/signature";
import { verifyMultipleWalletsSimple } from "@/app/lib/multiWalletVerifier";

// Nouns Auction House contract address
const NOUNS_AUCTION_HOUSE = "0x830BD73E4184ceF73443C15111a1DF14e495C706";

async function verifyNounsAuctionBidder(address: Address): Promise<boolean> {
  try {
    console.log(
      "Checking Nouns auction bidding activity for address:",
      address
    );

    const etherscanApiKey = process.env.ETHERSCAN_API_KEY;
    if (!etherscanApiKey) {
      console.error("ETHERSCAN_API_KEY not found");
      return false;
    }

    // Check transactions to Nouns Auction House contract
    const url = `https://api.etherscan.io/api?module=account&action=txlist&address=${address}&startblock=0&endblock=latest&sort=desc&apikey=${etherscanApiKey}`;

    const response = await fetch(url);
    if (!response.ok) {
      console.error("Failed to fetch from Etherscan:", response.statusText);
      return false;
    }

    const data = await response.json();

    if (data.status === "1" && Array.isArray(data.result)) {
      // Look for transactions to the Nouns Auction House contract
      const auctionTransactions = data.result.filter(
        (tx: { to?: string; isError: string; input: string; value: string }) =>
          tx.to?.toLowerCase() === NOUNS_AUCTION_HOUSE.toLowerCase() &&
          tx.isError === "0" && // Only successful transactions
          tx.input &&
          tx.input.length > 2 && // Has input data
          parseFloat(tx.value) > 0 // Has ETH value (bid amount)
      );

      if (auctionTransactions.length > 0) {
        // Further filter for bidding-related transactions
        const biddingTransactions = auctionTransactions.filter(
          (tx: { input: string }) => {
            // Common bidding method signatures:
            // createBid(uint256) - 0x91b6b87c
            // createBid(uint256,address) - (different signature)
            const biddingMethodIds = [
              "0x91b6b87c", // createBid
            ];

            return biddingMethodIds.some((methodId) =>
              tx.input.startsWith(methodId)
            );
          }
        );

        if (biddingTransactions.length > 0) {
          console.log(
            `Address ${address} has ${biddingTransactions.length} bidding transaction(s) in Nouns auctions`
          );
          return true;
        }

        // Even if method signature doesn't match exactly, if there are ETH transactions
        // to the auction house, it's likely bidding activity
        if (auctionTransactions.length > 0) {
          console.log(
            `Address ${address} has ${auctionTransactions.length} transaction(s) to Nouns Auction House with ETH value`
          );
          return true;
        }
      }
    }

    console.log(
      `No Nouns auction bidding activity found for address ${address}`
    );
    return false;
  } catch (error) {
    console.error("Error verifying Nouns auction bidder status:", error);
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
      verifyNounsAuctionBidder
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
