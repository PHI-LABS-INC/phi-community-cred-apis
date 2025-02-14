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

    // Get verification results by checking if the wallet interacted with the specified contract via BaseScan API
    const [mint_eligibility] = await verifyANS(address as Address);

    // Generate cryptographic signature of the verification results
    const signature = await createSignature({
      address: address as Address,
      mint_eligibility: mint_eligibility as boolean,
    });

    return new Response(
      JSON.stringify({
        mint_eligibility: mint_eligibility as boolean,
        signature,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in handler:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

/**
 * Verifies if an address has interacted with the specified contract using the BaseScan API.
 *
 * @param address - Ethereum address to check
 * @returns Tuple containing [boolean eligibility status]
 * @throws Error if verification fails
 */
async function verifyANS(address: Address): Promise<[boolean]> {
  try {
    const CONTRACT_ADDRESS = "0x9e711dD562DD7C84127780949Ac3FD5a83136676";

    const BASESCAN_API_KEY = process.env.BASE_SCAN_API_KEY;
    if (!BASESCAN_API_KEY) {
      throw new Error("Missing BaseScan API key");
    }

    const apiUrl = `https://api.basescan.org/api?module=account&action=txlist&address=${address.toLowerCase()}&startblock=0&endblock=latest&sort=asc&apikey=${BASESCAN_API_KEY}`;

    const response = await fetch(apiUrl);
    const data = await response.json();

    if (!Array.isArray(data.result)) {
      console.error("BaseScan API error: result is not an array", data);
      throw new Error("Failed to fetch transactions from BaseScan");
    }

    if (
      data.status !== "1" &&
      !(data.status === "0" && data.result.length === 0)
    ) {
      console.error("BaseScan API error:", data);
      throw new Error("Failed to fetch transactions from BaseScan");
    }

    // Check if any transaction involved an interaction with the specified contract.
    const hasInteracted = data.result.some(
      (tx: { to?: string }) =>
        tx.to && tx.to.toLowerCase() === CONTRACT_ADDRESS.toLowerCase()
    );

    return [hasInteracted];
  } catch (error) {
    console.error("Error verifying contract interaction via BaseScan:", error);
    throw new Error("Failed to verify contract interaction");
  }
}
