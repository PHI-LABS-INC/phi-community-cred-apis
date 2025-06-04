import { NextRequest } from "next/server";
import { Address, isAddress } from "viem";
import { createSignature } from "@/app/lib/signature";

// Gitcoin contract addresses across different networks
const GITCOIN_CONTRACTS = {
  ethereum: {
    gtcToken: "0xde30da39c46104798bb5aa3fe8b9e0e1f348163f",
    grantsRegistry: "0xdf869fad6db91f437b59f1edefab319493d4c4ce",
  },
  optimism: {
    gtcToken: "0x1eba7a6a72c894026cd654ac5cdcf83a46445b08",
    grantsRegistry: "0x4AAcca72145e1dF2aeC137E1f3C5E3D75DB8b5f3",
  },
  arbitrum: {
    gtcToken: "0x7f9a7db853ca816b9a138aee3380ef34c437dee0",
    grantsRegistry: "0x4AAcca72145e1dF2aeC137E1f3C5E3D75DB8b5f3",
  },
  polygon: {
    gtcToken: "0x1bcbb5c0160a49d8daddf832f245596b10b029e9",
    bulkCheckout: "0xb99080b9407436eBb2b8Fe56D45fFA47E9bb8877",
  },
  gnosis: {
    kdoToken: "0x74e596525c63393f42c76987b6a66f4e52733efa",
  },
};

// Type for Etherscan transaction response
interface EtherscanTransaction {
  to?: string;
  from?: string;
  hash: string;
  value: string;
  blockNumber: string;
}

// Type for network-specific API response
interface NetworkResponse {
  network: string;
  transactions: EtherscanTransaction[];
  error?: string;
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

    // Get verification results across all networks
    const [mint_eligibility, data] = await verifyGitcoinContributor(
      address as Address
    );

    // Generate cryptographic signature of the verification results
    const signature = await createSignature({
      address: address as Address,
      mint_eligibility,
      data: JSON.stringify(data),
    });

    return new Response(
      JSON.stringify({
        mint_eligibility,
        data,
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
    console.error("Error in handler:", error);
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

/**
 * Verifies if an address has contributed to Gitcoin Grants across multiple networks
 * Checks transaction history with Gitcoin contracts using network-specific APIs
 *
 * @param address - Ethereum address to check
 * @returns Tuple containing [boolean eligibility status, object with network-specific data]
 * @throws Error if verification fails
 */
async function verifyGitcoinContributor(
  address: Address
): Promise<[boolean, { [key: string]: { count: number; network: string } }]> {
  try {
    const networkResponses: NetworkResponse[] = await Promise.all([
      // Ethereum Mainnet
      fetchNetworkTransactions(
        address,
        "ethereum",
        `https://api.etherscan.io/api?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&page=1&offset=10000&sort=asc&apikey=${process.env.ETHERSCAN_API_KEY}`
      ),
      // Optimism
      fetchNetworkTransactions(
        address,
        "optimism",
        `https://api-optimistic.etherscan.io/api?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&page=1&offset=10000&sort=asc&apikey=${process.env.OPTIMISM_API_KEY}`
      ),
      // Arbitrum
      fetchNetworkTransactions(
        address,
        "arbitrum",
        `https://api.arbiscan.io/api?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&page=1&offset=10000&sort=asc&apikey=${process.env.ARBITRUM_API_KEY}`
      ),
      // Polygon
      fetchNetworkTransactions(
        address,
        "polygon",
        `https://api.polygonscan.com/api?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&page=1&offset=10000&sort=asc&apikey=${process.env.POLYGON_API_KEY}`
      ),
      // Gnosis Chain
      fetchNetworkTransactions(
        address,
        "gnosis",
        `https://api.gnosisscan.io/api?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&page=1&offset=10000&sort=asc&apikey=${process.env.GNOSIS_API_KEY}`
      ),
    ]);

    const networkResults: {
      [key: string]: { count: number; network: string };
    } = {};
    let totalContributions = 0;

    for (const response of networkResponses) {
      if (response.error) {
        console.error(
          `Error fetching ${response.network} transactions:`,
          response.error
        );
        continue;
      }

      const contracts =
        GITCOIN_CONTRACTS[response.network as keyof typeof GITCOIN_CONTRACTS];
      const contractAddresses = Object.values(contracts).map((addr) =>
        addr.toLowerCase()
      );

      const gitcoinTransactions = response.transactions.filter(
        (tx: EtherscanTransaction) =>
          contractAddresses.some(
            (contractAddr) =>
              tx.to?.toLowerCase() === contractAddr ||
              (tx.from?.toLowerCase() === address.toLowerCase() &&
                tx.to?.toLowerCase() === contractAddr)
          )
      );

      const contributionCount = gitcoinTransactions.length;
      totalContributions += contributionCount;

      console.log(
        `Network: ${response.network} - Found ${contributionCount} Gitcoin contributions`
      );
      if (contributionCount > 0) {
        console.log(
          `${response.network} transactions:`,
          gitcoinTransactions.map((tx) => tx.hash)
        );
      }

      networkResults[response.network] = {
        count: contributionCount,
        network: response.network,
      };
    }

    const isEligible = totalContributions > 0;
    return [isEligible, networkResults];
  } catch (error) {
    console.error("Error verifying Gitcoin contributions:", error);
    throw new Error(
      `Failed to verify Gitcoin contributions: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * Fetches transactions for a specific network
 * @param address - Address to check
 * @param network - Network name
 * @param apiUrl - Network-specific API URL
 * @returns NetworkResponse object
 */
async function fetchNetworkTransactions(
  address: Address,
  network: string,
  apiUrl: string
): Promise<NetworkResponse> {
  try {
    const response = await fetch(apiUrl);
    const data = await response.json();

    if (!response.ok || data.status !== "1") {
      return {
        network,
        transactions: [],
        error: `API error: ${data.message || "Unknown error"}`,
      };
    }

    return {
      network,
      transactions: data.result || [],
    };
  } catch (error) {
    return {
      network,
      transactions: [],
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
