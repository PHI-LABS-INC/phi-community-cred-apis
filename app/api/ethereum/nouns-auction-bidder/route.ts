import { NextRequest } from "next/server";
import { Address, isAddress } from "viem";
import { createSignature } from "@/app/lib/signature";
import { hasContractInteraction } from "@/app/lib/smart-wallet";

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
    // Nouns Auction House contract address
    const nounsAuctionHouse =
      "0x830BD73E4184ceF73443C15111a1DF14e495C706" as Address;

    // createBid method signature: createBid(uint256 nounId,uint32 clientId)
    const createBidMethodId = "0xabbfb786";

    console.log(
      `Checking if ${address} has called createBid on Nouns auction house`
    );

    // Check if any transaction to the auction house that calls createBid method
    return await hasContractInteraction(
      address,
      nounsAuctionHouse,
      [createBidMethodId], // Specific method ID for creating bids
      1, // At least 1 interaction
      1 // Ethereum mainnet
    );
  } catch (error) {
    console.error("Error verifying Nouns auction bidder status:", error);
    return false;
  }
}
