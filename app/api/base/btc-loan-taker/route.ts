import { NextRequest } from "next/server";
import { Address, isAddress } from "viem";
import { createSignature } from "@/app/lib/signature";
import crypto from "crypto";
import axios from "axios";

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

    // Verify BTC loan status
    const [mintEligibility, loanData] = await verifyBTCLoan(address as Address);

    const signature = await createSignature({
      address: address as Address,
      mint_eligibility: mintEligibility,
      data: loanData,
    });

    return new Response(
      JSON.stringify({
        mint_eligibility: mintEligibility,
        data: loanData,
        signature,
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
    console.error("Error in API handler:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: "Failed to verify BTC loan",
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

/**
 * Verifies if an address has an active BTC loan on Coinbase
 * @param address - Ethereum address to check
 * @returns {Promise<[boolean, string]>} - Returns if has loan and loan details
 */
async function verifyBTCLoan(address: Address): Promise<[boolean, string]> {
  try {
    // Validate environment variables
    const apiKey = process.env.COINBASE_API_KEY;
    const apiSecret = process.env.COINBASE_API_KEY_SECRET;
    const apiPassphrase = process.env.COINBASE_API_KEY_SECRET;

    if (!apiKey || !apiSecret || !apiPassphrase) {
      throw new Error("Missing required Coinbase API credentials");
    }

    const timestamp = String(Math.floor(Date.now() / 1000));
    const method = "GET";
    const baseUrl = "https://api.exchange.coinbase.com";
    const requestPath = `/loans?ids=${address}`;
    const url = baseUrl + requestPath;

    // Create signature
    const message = timestamp + method + new URL(url).pathname;
    const hmacKey = Buffer.from(apiSecret, "base64");
    const signature = crypto
      .createHmac("sha256", hmacKey)
      .update(message)
      .digest();
    const signatureB64 = signature.toString("base64");

    // Call Coinbase Exchange API to check loans
    const headers = {
      "CB-ACCESS-TIMESTAMP": timestamp,
      "CB-ACCESS-SIGN": signatureB64,
      "CB-ACCESS-PASSPHRASE": apiPassphrase,
      "CB-ACCESS-KEY": apiKey,
    };

    const response = await axios.get(url, { headers });

    // Ensure response data is an array
    const loans = Array.isArray(response.data) ? response.data : [];

    // Check if there are any active BTC loans
    const activeLoans = loans.filter(
      (loan: {
        status: string;
        currency: string;
        term_end_date: string;
        amount: string;
        interest_rate: string;
      }) =>
        loan.status === "active" &&
        loan.currency === "BTC" &&
        new Date(loan.term_end_date) > new Date()
    );

    const hasActiveLoan = activeLoans.length > 0;
    const loanDetails = hasActiveLoan
      ? `Active BTC loan: ${activeLoans[0].amount} BTC at ${activeLoans[0].interest_rate}% APR`
      : "No active BTC loans";

    return [hasActiveLoan, loanDetails];
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("Error verifying BTC loan:", error.message);
    } else {
      console.error("Error verifying BTC loan:", String(error));
    }
    return [false, "Failed to verify BTC loan"];
  }
}
