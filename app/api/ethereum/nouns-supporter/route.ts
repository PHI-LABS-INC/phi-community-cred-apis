import { NextRequest } from "next/server";
import { Address, isAddress } from "viem";
import { createSignature } from "@/app/lib/signature";
import { verifyMultipleWalletsSimple } from "@/app/lib/multiWalletVerifier";

// Nouns related contract addresses
const NOUNS_CONTRACT = "0x9C8fF314C9Bc7F6e59A9d9225Fb22946427eDC03"; // Nouns NFT
const NOUNS_AUCTION_HOUSE = "0x830BD73E4184ceF73443C15111a1DF14e495C706"; // Auction House
const NOUNS_DAO_GOVERNOR = "0x6f3E6272A167e8AcCb32072d08E0957F9c79223d"; // DAO Governor

async function verifyNounsSupporter(address: Address): Promise<boolean> {
  try {
    console.log("Checking Nouns ecosystem support for address:", address);

    const etherscanApiKey = process.env.ETHERSCAN_API_KEY;
    if (!etherscanApiKey) {
      console.error("ETHERSCAN_API_KEY not found");
      return false;
    }

    // Check for various forms of Nouns ecosystem support
    let supportScore = 0;

    // 1. Check Nouns NFT ownership
    try {
      const nounsUrl = `https://api.etherscan.io/api?module=account&action=tokennfttx&contractaddress=${NOUNS_CONTRACT}&address=${address}&page=1&offset=10&sort=desc&apikey=${etherscanApiKey}`;
      const nounsResponse = await fetch(nounsUrl);
      if (nounsResponse.ok) {
        const nounsData = await nounsResponse.json();
        if (nounsData.status === "1" && Array.isArray(nounsData.result)) {
          const incomingTransfers = nounsData.result.filter(
            (tx: { to: string; from: string }) =>
              tx.to?.toLowerCase() === address.toLowerCase()
          );
          const outgoingTransfers = nounsData.result.filter(
            (tx: { to: string; from: string }) =>
              tx.from?.toLowerCase() === address.toLowerCase()
          );
          const netBalance =
            incomingTransfers.length - outgoingTransfers.length;
          if (netBalance > 0) {
            supportScore += 50; // High score for NFT ownership
          }
        }
      }
    } catch (error) {
      console.warn("Error checking Nouns NFT ownership:", error);
    }

    // 2. Check auction participation (bidding)
    try {
      const auctionUrl = `https://api.etherscan.io/api?module=account&action=txlist&address=${address}&startblock=0&endblock=latest&sort=desc&apikey=${etherscanApiKey}`;
      const auctionResponse = await fetch(auctionUrl);
      if (auctionResponse.ok) {
        const auctionData = await auctionResponse.json();
        if (auctionData.status === "1" && Array.isArray(auctionData.result)) {
          const auctionTransactions = auctionData.result.filter(
            (tx: { to?: string; value: string; isError: string }) =>
              tx.to?.toLowerCase() === NOUNS_AUCTION_HOUSE.toLowerCase() &&
              parseFloat(tx.value) > 0 &&
              tx.isError === "0"
          );
          if (auctionTransactions.length > 0) {
            supportScore += 30; // Good score for auction participation
          }
        }
      }
    } catch (error) {
      console.warn("Error checking auction participation:", error);
    }

    // 3. Check DAO governance participation
    try {
      const governanceUrl = `https://api.etherscan.io/api?module=account&action=txlist&address=${address}&startblock=0&endblock=latest&sort=desc&apikey=${etherscanApiKey}`;
      const governanceResponse = await fetch(governanceUrl);
      if (governanceResponse.ok) {
        const governanceData = await governanceResponse.json();
        if (
          governanceData.status === "1" &&
          Array.isArray(governanceData.result)
        ) {
          const governanceTransactions = governanceData.result.filter(
            (tx: { to?: string; isError: string; input: string }) =>
              tx.to?.toLowerCase() === NOUNS_DAO_GOVERNOR.toLowerCase() &&
              tx.isError === "0" &&
              tx.input &&
              tx.input.length > 2
          );

          // Check for voting/governance method signatures
          const votingTransactions = governanceTransactions.filter(
            (tx: { input: string }) => {
              const votingMethodIds = [
                "0x56781388", // castVote
                "0x7b3c71d3", // castVoteWithReason
                "0x3bccf4fd", // castVoteBySig
                "0xda95691a", // propose
                "0x5c19a95c", // delegate
              ];
              return votingMethodIds.some((methodId) =>
                tx.input.startsWith(methodId)
              );
            }
          );

          if (votingTransactions.length > 0) {
            supportScore += 20; // Score for governance participation
          }
        }
      }
    } catch (error) {
      console.warn("Error checking governance participation:", error);
    }

    console.log(`Address ${address} Nouns support score: ${supportScore}`);

    // Consider as supporter if score >= 20 (any meaningful engagement)
    const isSupporter = supportScore >= 20;
    return isSupporter;
  } catch (error) {
    console.error("Error verifying Nouns supporter status:", error);
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
      verifyNounsSupporter
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
