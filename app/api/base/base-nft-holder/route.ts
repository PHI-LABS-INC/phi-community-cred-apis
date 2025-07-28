import { NextRequest } from "next/server";
import { Address, isAddress } from "viem";
import { createSignature } from "@/app/lib/signature";
import { getTransactions } from "@/app/lib/smart-wallet";

async function verifyNFTCollection(address: Address): Promise<boolean> {
  try {
    // Fetch transaction history using getTransactions from smart-wallet.ts
    const transactions = await getTransactions(address, 8453); // Base chain

    if (transactions.length === 0) {
      return false;
    }

    // Track unique NFTs received by the address
    const uniqueNFTs = new Set<string>();

    // Common NFT transfer function signatures
    const transferSignatures = [
      "0x23b872dd", // transferFrom(address,address,uint256)
      "0xa9059cbb", // transfer(address,uint256)
      "0x42842e0e", // safeTransferFrom(address,address,uint256)
      "0xb88d4fde", // safeTransferFrom(address,address,uint256,bytes)
    ];

    for (const tx of transactions) {
      const input = tx.input?.toLowerCase() || "";
      const isNFTTransfer = transferSignatures.some((sig) =>
        input.includes(sig)
      );

      if (isNFTTransfer && tx.to) {
        // This is likely an NFT transfer transaction
        const nftId = `${tx.to.toLowerCase()}-${tx.hash}`;

        if (tx.to.toLowerCase() === address.toLowerCase()) {
          // NFT was received by the address
          uniqueNFTs.add(nftId);
        }
      }
    }

    // Check if the address has collected at least 10 unique NFTs
    // Note: This is a simplified approach since we can't get exact NFT balances
    // from transaction history alone. In practice, you might want to use
    // direct contract calls to get current balances.
    return uniqueNFTs.size >= 10;
  } catch (error) {
    console.error("Error verifying NFT collection:", {
      error,
      address,
      timestamp: new Date().toISOString(),
    });
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

    const mint_eligibility = await verifyNFTCollection(address as Address);
    const signature = await createSignature({
      address: address as Address,
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
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        },
      }
    );
  }
}
