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

    // Check if the address holds at least 1 NFT from any Nouns derivative projects
    const mint_eligibility = await verifyNounsSupporter(address as Address);

    // Generate cryptographic signature of the verification result
    const signature = await createSignature({
      address: address as Address,
      mint_eligibility,
    });

    return new Response(
      JSON.stringify({
        mint_eligibility,
        signature,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in nouns-supporter verifier:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

/**
 * Verifies if the address holds at least 1 NFT from any Nouns derivative projects
 * Checks: Based Nouns, Gnars, Yellow Collective, LilNouns
 */
async function verifyNounsSupporter(address: Address): Promise<boolean> {
  try {
    const contractAddresses = [
      "0xbf57d0535e10e7033447174404b9bed3d9ef4c88", // Based Nouns (placeholder - need actual address)
      "0x880fb3cf5c6cc2d7dfc13a993e839a9411200c17", // Gnars
      "0x4b10701bfd7bfedc47d50562b76b436fbb5bdb3b", // LilNouns
      "0xcb2aced00157337b25dd2824c3863c2159bdaf1b", // Yellow Collective (placeholder - need actual address)
    ];

    const etherscanApiKey = process.env.ETHERSCAN_API_KEY;
    if (!etherscanApiKey) {
      console.error("ETHERSCAN_API_KEY not found");
      return false;
    }

    // Check each contract for balance
    for (const contractAddress of contractAddresses) {
      try {
        const url = `https://api.etherscan.io/api?module=account&action=tokenbalance&contractaddress=${contractAddress}&address=${address}&tag=latest&apikey=${etherscanApiKey}`;

        const response = await fetch(url);
        if (!response.ok) {
          console.error(
            `Failed to fetch from Etherscan for ${contractAddress}:`,
            response.statusText
          );
          continue;
        }

        const data = await response.json();

        if (data.status === "1" && data.result) {
          const balance = parseInt(data.result, 16);
          if (balance > 0) {
            console.log(
              `Found ${balance} NFTs in contract ${contractAddress} for address ${address}`
            );
            return true;
          }
        }
      } catch (error) {
        console.error(`Error checking contract ${contractAddress}:`, error);
        continue;
      }
    }

    return false;
  } catch (error) {
    console.error("Error verifying Nouns supporter status:", error);
    return false;
  }
}
