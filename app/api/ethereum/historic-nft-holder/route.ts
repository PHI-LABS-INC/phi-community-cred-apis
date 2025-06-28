import { NextRequest } from "next/server";
import { Address, isAddress } from "viem";
import { createSignature } from "@/app/lib/signature";
import { verifyMultipleWalletsSimple } from "@/app/lib/multiWalletVerifier";

async function verifyHistoricNFTHolder(address: Address): Promise<boolean> {
  try {
    console.log("Checking historic NFT ownership for address:", address);

    const etherscanApiKey = process.env.ETHERSCAN_API_KEY;
    if (!etherscanApiKey) {
      console.error("ETHERSCAN_API_KEY not found");
      return false;
    }

    // Historic/Blue-chip NFT contracts to check
    const historicNFTContracts = [
      "0xb47e3cd837ddf8e4c57f05d70ab865de6e193bbb", // CryptoPunks
      "0x06012c8cf97bead5deae237070f9587f8e7a266d", // CryptoKitties
      "0x60e4d786628fea6478f785a6d7e704777c86a7c6", // Mutant Ape Yacht Club
      "0xbc4ca0eda7647a8ab7c2061c2e118a18a936f13d", // Bored Ape Yacht Club
      "0x8a90cab2b38dba80c64b7734e58ee1db38b8992e", // Doodles
      "0x23581767a106ae21c074b2276d25e5c3e136a68b", // Moonbirds
      "0x49cf6f5d44e70224e2e23fdcdd2c053f30ada28b", // CloneX
      "0x7bd29408f11d2bfc23c34f18275bbf23bb716bc7", // Meebits
      "0x79fcdef22feed20eddacbb2587640e45491b757f", // Otherdeeds for Otherland
      "0x5af0d9827e0c53e4799bb226655a1de152a425a5", // Milady Maker
      "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270", // Art Blocks Curated
      "0x059edd72cd353df5106d2b9cc5ab83a52287ac3a", // Art Blocks Factory
      "0xa7206d878c5c3871826dfdb42191c49b1d11f466", // Art Blocks Explorations
    ];

    // Check NFT transactions for historic contracts
    let hasHistoricNFT = false;

    for (const contractAddress of historicNFTContracts) {
      try {
        const url = `https://api.etherscan.io/api?module=account&action=tokennfttx&contractaddress=${contractAddress}&address=${address}&page=1&offset=10&sort=desc&apikey=${etherscanApiKey}`;

        const response = await fetch(url);
        if (!response.ok) {
          console.warn(
            `Failed to fetch NFT data for contract ${contractAddress}`
          );
          continue;
        }

        const data = await response.json();

        if (
          data.status === "1" &&
          Array.isArray(data.result) &&
          data.result.length > 0
        ) {
          // Look for incoming transfers (indicating ownership)
          const incomingTransfers = data.result.filter(
            (tx: { to: string; from: string }) =>
              tx.to?.toLowerCase() === address.toLowerCase()
          );

          const outgoingTransfers = data.result.filter(
            (tx: { to: string; from: string }) =>
              tx.from?.toLowerCase() === address.toLowerCase()
          );

          // Calculate net balance for this contract
          const netBalance =
            incomingTransfers.length - outgoingTransfers.length;

          if (netBalance > 0) {
            console.log(
              `Address ${address} holds ${netBalance} NFT(s) from historic contract ${contractAddress}`
            );
            hasHistoricNFT = true;
            break; // Found at least one historic NFT, no need to check others
          }
        }

        // Small delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error) {
        console.warn(`Error checking contract ${contractAddress}:`, error);
        // Continue checking other contracts
      }
    }

    return hasHistoricNFT;
  } catch (error) {
    console.error("Error verifying historic NFT holder status:", error);
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
      verifyHistoricNFTHolder
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
