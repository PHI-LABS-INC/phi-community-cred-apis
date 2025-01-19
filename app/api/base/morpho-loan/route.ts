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
    const [loan_eligibility, loan_data] = await verifyMorphoLoanBase(
      address as Address
    );

    // Generate cryptographic signature of the verification results
    const signature = await createSignature({
      address: address as Address,
      mint_eligibility: loan_eligibility,
      data: loan_data,
    });

    return new Response(
      JSON.stringify({ loan_eligibility, data: loan_data ? loan_data : 0, signature }),
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
 * Verifies if an address has an active USDC loan on Morpho (Base)
 *
 * @param address - Ethereum address to check
 * @returns Tuple containing [boolean eligibility status, string loan details]
 * @throws Error if verification fails
 */
async function verifyMorphoLoanBase(address: Address): Promise<[boolean, string]> {
  try {
    const MORPHO_CONTRACT = "0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb"; // Replace with actual Base contract address

    const response = await fetch(
      `https://api.basescan.org/api?module=account&action=tokenbalance&contractaddress=${MORPHO_CONTRACT}&address=${address}&apikey=${process.env.BASE_SCAN_API_KEY}`
    );

    const data = await response.json();

    if (
      !data ||
      (data.status === "0" &&
        data.message === "NOTOK" &&
        data.result === "Missing/Invalid API Key")
    ) {
      throw new Error("Missing or invalid API key");
    }

    // Check if loan exists or if balance is greater than 0
    if (!data.result || data.result.loanAmount === "0") {
      return [false, "No active loan"];
    }

    const loanAmount = data.result.loanAmount;

    return [loanAmount > 0, loanAmount];
  } catch (error) {
    console.error("Error verifying Morpho loan:", error);
    throw new Error("Failed to verify Morpho loan status");
  }
}
