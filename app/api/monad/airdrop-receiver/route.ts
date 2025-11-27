import { NextRequest } from "next/server";
import { Address, formatEther, getAddress, isAddress } from "viem";
import { createSignature } from "@/app/lib/signature";

const ETHERSCAN_ENDPOINT = "https://api.etherscan.io/v2/api";
const MONAD_CHAIN_ID = "143"; // Monad mainnet
const DEFAULT_OFFSET = "50";
const MONAD_AIRDROP_DISTRIBUTOR = "0x68b665f94c8832430d524309c4d274acc1045186";

type EtherscanV2Response =
  | {
      status: string;
      message: string;
      result: {
        records?: EtherscanTransaction[];
        [key: string]: unknown;
      };
    }
  | {
      status: string;
      message: string;
      result: EtherscanTransaction[];
    };

type EtherscanTransaction = {
  hash: string;
  from?: string;
  to?: string;
  value: string;
  [key: string]: unknown;
};

/**
 * Fetches the most recent transaction amount (in MON) for a given address
 * using Etherscan's Monad transaction endpoint.
 *
 * @param address - Target address to inspect
 * @returns Formatted amount string (converted from wei) or null if unavailable
 */
async function fetchTokenAmount(address: Address): Promise<string | null> {
  const checksumAddress = getAddress(address);
  const lowerCaseAddress = checksumAddress.toLowerCase();
  const apiKey = process.env.ETHERSCAN_API_KEY;

  if (!apiKey) {
    console.warn("Missing ETHERSCAN_API_KEY");
    return null;
  }

  const url = new URL(ETHERSCAN_ENDPOINT);
  url.searchParams.set("module", "account");
  url.searchParams.set("action", "txlistinternal");
  url.searchParams.set("address", lowerCaseAddress);
  url.searchParams.set("page", "1");
  url.searchParams.set("offset", DEFAULT_OFFSET);
  url.searchParams.set("sort", "desc");
  url.searchParams.set("chainid", MONAD_CHAIN_ID);
  url.searchParams.set("apikey", apiKey);

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(
        `Etherscan API responded with ${response.status}: ${response.statusText}`
      );
    }

    const payload = (await response.json()) as EtherscanV2Response;

    if (payload.status !== "1") {
      throw new Error(`Etherscan API error: ${payload.message}`);
    }

    const records = Array.isArray(payload.result)
      ? payload.result
      : payload.result?.records ?? [];

    const distributorTx = records.find(
      (tx) =>
        tx.from?.toLowerCase() === MONAD_AIRDROP_DISTRIBUTOR &&
        tx.to?.toLowerCase() === lowerCaseAddress
    );

    const inboundTx =
      distributorTx ||
      records.find(
        (tx) =>
          tx.to?.toLowerCase() === lowerCaseAddress && tx.value !== undefined
      ) ||
      records[0];

    if (!inboundTx?.value) {
      return null;
    }

    console.log(
      `Fetched transaction amount from Etherscan (hash: ${inboundTx.hash}): ${inboundTx.value}`
    );

    try {
      return formatEther(BigInt(inboundTx.value));
    } catch (formatError) {
      console.warn(
        "Failed to format transaction value, returning raw string",
        formatError
      );
      return inboundTx.value;
    }
  } catch (error) {
    console.error("Failed to fetch transaction amount:", error);
    return null;
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

    // Fetch last inbound amount; consider eligible if value > 0
    const formattedAmount = await fetchTokenAmount(address as Address);
    const mint_eligibility =
      formattedAmount !== null && formattedAmount !== "0";

    // Generate cryptographic signature of the verification results
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
    console.error("Error in Monad airdrop receiver handler:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: errorMessage,
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
