import { Address, isAddress } from "viem";
import { createSignature } from "@/app/lib/signature";
import { NextRequest } from "next/server";

interface Transaction {
  to: string;
  timeStamp: string;
}

async function verifyDoodlePurchase(address: Address): Promise<boolean> {
  try {
    // Doodles NFT contract address (target for purchase transactions)
    const DOODLES_CONTRACT = "0x8a90cab2b38dba80c64b7734e58ee1db38b8992e";
    const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY;
    if (!ETHERSCAN_API_KEY) {
      throw new Error("Missing Etherscan API key");
    }

    // Fetch transaction history from Etherscan API
    const apiUrl = `https://api.etherscan.io/api?module=account&action=txlist&address=${address.toLowerCase()}&startblock=0&endblock=latest&sort=asc&apikey=${ETHERSCAN_API_KEY}`;
    const response = await fetch(apiUrl);
    const data = await response.json();

    if (!Array.isArray(data.result)) {
      console.error("Etherscan API error: result is not an array", data);
      throw new Error("Failed to fetch transactions from Etherscan");
    }

    // If no transactions are found (Etherscan returns status "0" with an empty result), treat it as a valid case.
    if (
      data.status !== "1" &&
      !(data.status === "0" && data.result.length === 0)
    ) {
      console.error("Etherscan API error:", data);
      throw new Error("Failed to fetch transactions from Etherscan");
    }

    // Check if any transaction was sent to the Doodles contract
    const hasPurchased = data.result.some((tx: Transaction) => {
      // if (!tx.to) return false;
      // // Ensure case insensitive comparison
      // const toAddress = tx.to.toLowerCase();
      // if (toAddress !== DOODLES_CONTRACT.toLowerCase()) return false;

      // // Convert Etherscan's timestamp (in seconds) to a Date object
      // const txTimestamp = parseInt(tx.timeStamp) * 1000;
      // const txDate = new Date(txTimestamp);
      // return txDate.getFullYear() === 2021;
      return tx.to && tx.to.toLowerCase() === DOODLES_CONTRACT.toLowerCase();
    });

    return hasPurchased;
  } catch (error) {
    console.error("Error verifying Doodle purchase via Etherscan:", error);
    throw new Error("Failed to verify Doodle purchase");
  }
}

export async function GET(req: NextRequest) {
  try {
    const address = req.nextUrl.searchParams.get("address");

    if (!address || !isAddress(address)) {
      return new Response(
        JSON.stringify({ error: "Invalid Ethereum address provided" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const mint_eligibility = await verifyDoodlePurchase(address as Address);

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
    console.error("Error in Doodle purchase verification:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
