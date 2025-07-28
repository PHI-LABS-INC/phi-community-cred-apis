import { NextRequest } from "next/server";
import { Address, isAddress } from "viem";
import { createSignature } from "@/app/lib/signature";
import { getTransactions } from "@/app/lib/smart-wallet";

async function verifyNFTHoldings(address: Address): Promise<boolean> {
  try {
    // Fetch transaction history using getTransactions from smart-wallet.ts
    const transactions = await getTransactions(address, 8453); // Base chain

    if (transactions.length === 0) {
      return false;
    }

    // Track current NFT holdings by contract and token ID
    const currentHoldings = new Map<string, boolean>();

    for (const tx of transactions) {
      // Look for NFT transfer events in transaction input data
      // Common NFT transfer function signatures
      const transferSignatures = [
        "0x23b872dd", // transferFrom(address,address,uint256)
        "0xa9059cbb", // transfer(address,uint256)
        "0x42842e0e", // safeTransferFrom(address,address,uint256)
        "0xb88d4fde", // safeTransferFrom(address,address,uint256,bytes)
      ];

      const input = tx.input?.toLowerCase() || "";
      const isNFTTransfer = transferSignatures.some((sig) =>
        input.includes(sig)
      );

      if (isNFTTransfer && tx.to) {
        // This is likely an NFT transfer transaction
        // We'll count it as an NFT interaction
        const nftId = `${tx.to.toLowerCase()}-${tx.hash}`;

        if (tx.from.toLowerCase() === address.toLowerCase()) {
          // NFT was sent from the address
          currentHoldings.delete(nftId);
        } else if (tx.to.toLowerCase() === address.toLowerCase()) {
          // NFT was received by the address
          currentHoldings.set(nftId, true);
        }
      }
    }

    // Check if the address currently holds more than 10 NFTs
    // Note: This is a simplified approach since we can't get exact NFT balances
    // from transaction history alone. In practice, you might want to use
    // direct contract calls to get current balances.
    return currentHoldings.size > 10;
  } catch (error) {
    console.error("Error verifying NFT holdings:", {
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

    const mint_eligibility = await verifyNFTHoldings(address as Address);
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
