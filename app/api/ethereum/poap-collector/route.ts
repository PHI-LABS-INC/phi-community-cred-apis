import { NextRequest, NextResponse } from "next/server";
import { Address, isAddress } from "viem";
import { createSignature } from "@/app/lib/signature";

const POAP_API_ENDPOINT = "https://api.poap.tech/actions/scan";
const POAP_API_KEY = process.env.POAP_API_KEY;

async function fetchWithRetry(
  url: string,
  options?: RequestInit,
  retries = 3
): Promise<unknown> {
  for (let i = 0; i < retries; i++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error: unknown) {
      console.warn(
        `Attempt ${i + 1} failed:`,
        error instanceof Error ? error.message : String(error)
      );

      if (i === retries - 1) {
        throw error;
      }

      // Exponential backoff
      const backoff = Math.min(1000 * Math.pow(2, i), 5000);
      await new Promise((resolve) => setTimeout(resolve, backoff));
    }
  }
}

export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get("address");

  if (!address || !isAddress(address)) {
    return NextResponse.json(
      { error: "Invalid address provided" },
      { status: 400 }
    );
  }

  try {
    const [mint_eligibility, poapCount] = await verifyPOAPCollection(
      address as Address
    );

    const signature = await createSignature({
      address: address as Address,
      mint_eligibility,
      data: poapCount.toString(),
    });

    return NextResponse.json(
      {
        mint_eligibility,
        data: poapCount.toString(),
        signature,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in handler:", error);
    return NextResponse.json(
      { error: "Please try again later" },
      { status: 500 }
    );
  }
}

/**
 * Verifies if an address has collected more than 50 POAPs
 * @param address - Ethereum address to check
 * @returns Tuple containing [boolean eligibility status, number poap count]
 * @throws Error if verification fails
 */
async function verifyPOAPCollection(
  address: Address
): Promise<[boolean, number]> {
  try {
    if (!POAP_API_KEY) {
      throw new Error("POAP_API_KEY environment variable is not set");
    }

    const url = `${POAP_API_ENDPOINT}/${address}`;

    const poaps = await fetchWithRetry(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "x-api-key": POAP_API_KEY,
      },
    });

    // Ensure we got an array
    if (!Array.isArray(poaps)) {
      console.error("Invalid response format, expected array");
      return [false, 0];
    }

    const poapCount = poaps.length;
    const isEligible = poapCount >= 50;

    console.log(
      `Address ${address} has ${poapCount} POAPs, eligible: ${isEligible}`
    );

    return [isEligible, poapCount];
  } catch (error) {
    console.error("Error verifying POAP collection:", error);
    throw error;
  }
}
