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

    // Get verification results
    const [mint_eligibility, data] = await verifyFreysaNFT(address as Address);

    // Generate cryptographic signature of the verification results
    const signature = await createSignature({
      address: address as Address,
      mint_eligibility,
      data,
    });

    return new Response(JSON.stringify({ mint_eligibility, data, signature }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in handler:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

/**
 * Verifies if an address owns an NFT from the Freysa Reflections 2049 collection on Ethereum
 *
 * @param address - Ethereum address to check
 * @returns Tuple containing [boolean eligibility status, string NFT count]
 * @throws Error if verification fails
 */
async function verifyFreysaNFT(address: Address): Promise<[boolean, string]> {
  try {
    // Query Ethereum blockchain API for Freysa NFT ownership
    const FREYSA_CONTRACT = "0x3BFb2F2B61Be8f2f147F5F53a906aF00C263D9b3";

    const response = await fetch(
      `https://api.etherscan.io/api?module=account&action=tokenbalance&contractaddress=${FREYSA_CONTRACT}&address=${address}&apikey=${process.env.ETHERSCAN_API_KEY}`
    );

    const data = await response.json();

    if (!data || !data.result) {
      return [false, "0"];
    }

    const nftCount = parseInt(data.result);
    const isEligible = nftCount > 0;

    return [isEligible, nftCount.toString()];
  } catch (error) {
    console.error("Error verifying Freysa NFT:", error);
    throw new Error("Failed to verify Freysa NFT ownership");
  }
}
