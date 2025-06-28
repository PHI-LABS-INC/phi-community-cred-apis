import { NextRequest } from "next/server";
import { Address, isAddress } from "viem";
import { createSignature } from "@/app/lib/signature";
import { verifyMultipleWalletsSimple } from "@/app/lib/multiWalletVerifier";

async function verifyFreysaReflectionsHolder(
  address: Address
): Promise<boolean> {
  try {
    console.log(
      "Checking Freysa Reflections NFT ownership for address:",
      address
    );

    // Freysa Reflections contract address on Ethereum
    const FREYSA_REFLECTIONS_CONTRACT =
      "0x1538c5ddbb73b4f9c41b0ea94c9e99825b18be89";

    const etherscanApiKey = process.env.ETHERSCAN_API_KEY;
    if (!etherscanApiKey) {
      console.error("ETHERSCAN_API_KEY not found");
      return false;
    }

    // Check ERC-721 token transactions for this contract
    const url = `https://api.etherscan.io/api?module=account&action=tokennfttx&contractaddress=${FREYSA_REFLECTIONS_CONTRACT}&address=${address}&page=1&offset=100&sort=desc&apikey=${etherscanApiKey}`;

    const response = await fetch(url);
    if (!response.ok) {
      console.error("Failed to fetch from Etherscan:", response.statusText);
      return false;
    }

    const data = await response.json();

    if (data.status === "1" && Array.isArray(data.result)) {
      // Look for incoming transfers (where the address is the 'to')
      // or check current ownership by looking at the most recent transfers
      const incomingTransfers = data.result.filter(
        (tx: { to: string; from: string }) =>
          tx.to?.toLowerCase() === address.toLowerCase()
      );

      const outgoingTransfers = data.result.filter(
        (tx: { to: string; from: string }) =>
          tx.from?.toLowerCase() === address.toLowerCase()
      );

      // Calculate net balance (incoming - outgoing)
      const netBalance = incomingTransfers.length - outgoingTransfers.length;

      if (netBalance > 0) {
        console.log(
          `Address ${address} holds ${netBalance} Freysa Reflections NFT(s)`
        );
        return true;
      }
    }

    console.log(`No Freysa Reflections NFTs found for address ${address}`);
    return false;
  } catch (error) {
    console.error("Error verifying Freysa Reflections holder status:", error);
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
      verifyFreysaReflectionsHolder
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
