import { NextRequest } from "next/server";
import { Address, Hex, isAddress } from "viem";
import { createSignature } from "@/app/lib/signature";
import { verifyMultipleWalletsSimple } from "@/app/lib/multiWalletVerifier";

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
    const result = await verifyMultipleWalletsSimple(req, verifyRodeoContent);

    // Generate cryptographic signature of the verification results
    const signature = await createSignature({
      address: address as Address,
      mint_eligibility: result.mint_eligibility,
    });

    return new Response(
      JSON.stringify({
        mint_eligibility: result.mint_eligibility,
        signature: signature as Hex,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error("Error in handler:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

/**
 * Verifies if an address has a profile on Rodeo.club
 * @param address - Ethereum address to check
 * @returns Tuple containing [boolean eligibility status]
 * @throws Error if verification fails
 */
async function verifyRodeoContent(address: Address): Promise<boolean> {
  try {
    const response = await fetch(`https://rodeo.club/${address}`);
    return response.status !== 404;
  } catch (error) {
    console.error("Error verifying Rodeo profile:", error);
    throw new Error(
      `Failed to verify Rodeo profile: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}
