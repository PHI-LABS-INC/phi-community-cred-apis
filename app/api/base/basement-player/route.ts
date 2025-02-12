import { Address, isAddress } from "viem";
import { createSignature } from "@/app/lib/signature";
import { NextRequest } from "next/server";

interface Activity {
  user?: {
    address: string;
  };
}

async function verifyGamePlayed(address: Address): Promise<boolean> {
  try {
    const apiUrl = `https://api.basement.fun/activities?pageSize=10&pageNumber=1&walletAddress=${address}&type=off-chain`;
    const response = await fetch(apiUrl);
    const data = await response.json();

    if (!data.success || !data.result || !Array.isArray(data.result.data)) {
      console.error("Error fetching game activities:", {
        data,
        address,
        timestamp: new Date().toISOString(),
      });
      return false;
    }

    // Check if the address has played at least one game
    const hasPlayedGame = data.result.data.some((activity: Activity) => {
      return (
        activity.user &&
        activity.user.address.toLowerCase() === address.toLowerCase()
      );
    });

    return hasPlayedGame;
  } catch (error) {
    console.error("Error verifying game played:", {
      error,
      address,
      timestamp: new Date().toISOString(),
    });
    // Return false if any error occurs during verification
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

    const mint_eligibility = await verifyGamePlayed(address as Address);
    const signature = await createSignature({
      address: address as Address,
      mint_eligibility,
    });

    return new Response(JSON.stringify({ mint_eligibility, signature }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
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
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
