export const endpoints = [
  {
    method: "GET",
    path: "/api/farcaster/channel-activity",
    id: "verifyfarcasteractivity",
    description:
      "Verifies if an Ethereum address is active on Farcaster by having both followers and following others",
  },
  {
    method: "GET",
    path: "/api/base/gas-saver",
    id: "verifygassaver",
    description:
      "Verifies if an Ethereum address has made any transactions with gas price under 10 gwei on Base and returns the lowest gas price used",
  },
  {
    method: "GET",
    path: "/api/ethereum/eth-maxi",
    id: "verifyethmaxi",
    description:
      "Verifies if an Ethereum address has made 100 or more transactions on Ethereum mainnet and returns the total transaction count",
  },
  {
    method: "GET",
    path: "/api/cyber/cyber-january-ransactor",
    id: "verifytx",
    description:
      "Verifies if an Ethereum address has transactions in January 2025 on cyber mainnet and returns eligibility status",
  },
  {
    method: "GET",
    path: "/api/ethereum/freysa-reflections-holder/",
    id: "verifyfreysanft",
    description:
      "Verifies if an Ethereum address owns an NFT from the Freysa Reflections 2049 collection on base and returns eligibility status",
  },
  {
    method: "GET",
    path: "/api/base/clanker-coin",
    id: "verifyclanker",
    description:
      "Verifies if an Ethereum address has launched or purchased a Clanker coin and returns eligibility status with cryptographic signature",
  },
  {
    method: "GET",
    path: "/api/base/creator-bid-ans",
    id: "verifyans",
    description:
      "Verifies if an Ethereum address owns an ANS (Arweave Name Service) domain from creator.bid and returns eligibility status with cryptographic signature",
  },
  {
    method: "GET",
    path: "/api/base/morpho-loan",
    id: "verifymorpholoan",
    description:
      "Verifies if an Ethereum address has an active USDC loan on Morpho (Base) and returns eligibility status",
  },
  {
    method: "GET",
    path: "/api/base/january-transactor",
    id: "verifybasetx",
    description:
      "Verifies if an Ethereum address has transactions in January 2025 on Base and returns eligibility status with cryptographic signature",
  },
  {
    method: "GET",
    path: "/api/base/cat-town-game",
    id: "verifycat",
    description:
      "Verifies if an Ethereum address holds at least 1000 Kibble tokens and owns at least one Cat Town NFT (Founder Profile Picture Collection) and returns eligibility status with cryptographic signature",
  },
  {
    method: "GET",
    path: "/api/base/rodeo-content-verifier",
    id: "verifyrodeo",
    description:
      "Verifies if an Ethereum address has content in the Rodeo and returns eligibility status",
  },
  {
    method: "GET",
    path: "/api/base/btc-loan-taker",
    id: "verifybtcloan",
    description:
      "Verifies if an Ethereum address has an active BTC loan on Coinbase and returns eligibility status",
  },
  {
    method: "GET",
    path: "/api/base/opensea-nft-holder",
    id: "verifyopensea",
    description:
      "Verifies if an Ethereum address has NFTs on OpenSea and returns eligibility status",
  },
  {
    method: "GET",
    path: "/api/base/blackbird-restaurant",
    id: "verifyblackbird",
    description:
      "Verifies if an Ethereum address has an NFT from the Blackbird Restaurant collection on Base and returns eligibility status",
  },
  {
    method: "GET",
    path: "/api/base/gigabrain-member",
    id: "verifygigabrain",
    description:
      "Verifies if an Ethereum address holds either a GigaBrain Pass NFT or at least 1M GigaBrain tokens and returns eligibility status",
  },
  {
    method: "GET",
    path: "/api/base/ethos-network-user",
    id: "verifyethos",
    description:
      "Verifies if an Ethereum address has an Ethos Network profile and returns eligibility status",
  },
  {
    method: "GET",
    path: "/api/base/super-usdc-holders",
    id: "verifysuperusdc",
    description:
      "Verifies if an Ethereum address holds at least 100,000 USDC on Base and returns eligibility status",
  },
  {
    method: "GET",
    path: "/api/base/timeswap-time-traveller",
    id: "verifytimeswap",
    description:
      "Verifies if an Ethereum address holds any Timeswap Pool Position NFTs and returns eligibility status",
  },
  {
    method: "GET",
    path: "/api/base/bento-holder",
    id: "verifybento",
    description:
      "Verifies if an Ethereum address holds any Bento tokens and returns eligibility status",
  },
  {
    method: "GET",
    path: "/api/base/flaunch",
    id: "verifyflaunch",
    description:
      "Verifies if an Ethereum address has interacted with the Flaunch contract and returns eligibility status",
  },
  {
    method: "GET",
    path: "/api/base/infected-fun",
    id: "verifyinfectedfun",
    description:
      "Verifies if an Ethereum address is registered on Infected.fun and returns eligibility status",
  },
  {
    method: "GET",
    path: "/api/base/spark-fi",
    id: "verifysparkfi",
    description:
      "Verifies if an Ethereum address has borrowed at least $10 worth of USDS on Spark.fi and returns eligibility status",
  },
  {
    method: "GET",
    path: "/api/base/base-transactions-100",
    id: "verifybasetx100",
    description:
      "Verifies if an Ethereum address has at least 100 transactions on Base and returns eligibility status",
  },
  {
    method: "GET",
    path: "/api/ethereum/nounce-dao-voters",
    id: "verifynouncedao",
    description:
      "Verifies if an Ethereum address has voted in the Nounce DAO and returns eligibility status on ethereum mainnet",
  },
  {
    method: "GET",
    path: "/api/ethereum/doodle-holder",
    id: "verifydoodle",
    description:
      "Verifies if an Ethereum address has purchased a Doodle in 2021 and returns eligibility status on ethereum mainnet",
  },
  {
    method: "GET",
    path: "/api/base/b3-staker",
    id: "verifyb3staker",
    description:
      "Verifies if an Ethereum address holds at least 1000 B3 tokens and returns eligibility status on base",
  },
  {
    method: "GET",
    path: "/api/base/basement-player",
    id: "verifybasementplayer",
    description:
      "Verifies if an Ethereum address has played at least one game on Basement.fun and returns eligibility status on base",
  },
  {
    method: "GET",
    path: "/api/base/base-gas-user",
    id: "verifybasegasuser",
    description:
      "Verifies if an Ethereum address has spent at least 0.1 ETH on Base and returns eligibility status",
  },
  {
    method: "GET",
    path: "/api/base/valentine-transact",
    id: "verifyvalentinetransact",
    description:
      "Verifies if an Ethereum address has transacted on Base on Valentine's Day and returns eligibility status",
  },
  {
    method: "GET",
    path: "/api/base/base-gas",
    id: "verifybasegas",
    description:
      "Verifies if an Ethereum address has spent at least 0.1 ETH on Base and returns eligibility status",
  },
  {
    method: "GET",
    path: "/api/base/aavegotchi",
    id: "verifyaavegotchi",
    description:
      "Verifies if an Ethereum address holds GHST tokens and returns eligibility status",
  },
  {
    method: "GET",
    path: "/api/base/kaito-ai",
    id: "verifykaitoai",
    description:
      "Verifies if an Ethereum address holds Kaito tokens and returns eligibility status",
  },
  {
    method: "GET",
    path: "/api/base/base-og",
    id: "verifybaseog",
    description:
      "Verifies if an Ethereum address has made a transaction on Base when it launched and returns eligibility status",
  },
  {
    method: "GET",
    path: "/api/ethereum/first-transaction",
    id: "verifyfirsttransaction",
    description:
      "Verifies the first transaction date of an Ethereum address and returns eligibility status",
  },
  {
    method: "GET",
    path: "/api/base/farcon-2025",
    id: "verifyfarcon2025",
    description:
      "Verifies if an Ethereum address holds a Farcon Summit 2025 NFT ticket and returns eligibility status",
  },
  {
    method: "GET",
    path: "/api/base/kwik-claim",
    id: "verifykwikclaim",
    description:
      "Verifies if an Ethereum address has any airdrop or reward opportunities on KwikClaim and returns eligibility status",
  },
  {
    method: "GET",
    path: "/api/base/farcon-hackathon",
    id: "verifyfarconhackathon",
    description:
      "Verifies if an Ethereum address holds a Farcon Builders NFT and returns eligibility status",
  },
  {
    method: "GET",
    path: "/api/ethereum/ens-holder",
    id: "verifyensholder",
    description:
      "Verifies if an Ethereum address has an ENS name and returns eligibility status",
  },
  {
    method: "GET",
    path: "/api/base/pizza-day",
    id: "verifypizzaday",
    description:
      "Verifies if an Ethereum address has made a transaction on Base on Bitcoin Pizza Day and returns eligibility status",
  },
  {
    method: "GET",
    path: "/api/base/usdc-bountycaster",
    id: "verifyusdc",
    description:
      "Verifies if an Ethereum address has any valid attestations from BountyCaster and returns eligibility status",
  },
  {
    method: "GET",
    path: "/api/base/base-onchain-score",
    id: "verifybaseonchainscore",
    description:
      "Verifies if an Ethereum address has a Base onchain score greater than 50 and returns eligibility status",
  },
  {
    method: "GET",
    path: "/api/ethereum/eth-validator",
    id: "verifyethvalidator",
    description:
      "Verifies if an Ethereum address is a validator and returns eligibility status",
  },
  {
    method: "GET",
    path: "/api/ethereum/gitcoin-contributor",
    id: "verifygitcoincontributor",
    description:
      "Verifies if an Ethereum address has contributed to Gitcoin Grants and returns eligibility status",
  },
  {
    method: "GET",
    path: "/api/ethereum/eth-whale",
    id: "verifyethwhale",
    description:
      "Verifies if an Ethereum address holds at least 10 ETH and returns eligibility status",
  },
  {
    method: "GET",
    path: "/api/ethereum/ethereum-og-2016",
    id: "verifyethereumog2016",
    description:
      "Verifies if an Ethereum address has made a transaction on Ethereum in 2016 and returns eligibility status",
  },
  {
    method: "GET",
    path: "/api/ethereum/ethereum-og-2018",
    id: "verifyethereumog2018",
    description:
      "Verifies if an Ethereum address has made a transaction on Ethereum in 2018 and returns eligibility status",
  },
  {
    method: "GET",
    path: "/api/ethereum/efp-influencer",
    id: "verifyefpinfluencer",
    description:
      "Verifies if an Ethereum address has 100+ followers on EFP (Ethereum Follow Protocol) and returns eligibility status",
  },
  {
    method: "GET",
    path: "/api/ethereum/ethereum-network-guardian",
    id: "verifyethereumnetworkguardian",
    description:
      "Verifies if an Ethereum address has staked any amount of ETH on Lido by checking stETH balance and returns eligibility status",
  },
  {
    method: "GET",
    path: "/api/ethereum/dao-citizen",
    id: "verifydaocitizen",
    description:
      "Verifies if an Ethereum address has voted at least 1 time on Snapshot governance platform and returns eligibility status",
  },
  {
    method: "GET",
    path: "/api/ethereum/onchain-writer",
    id: "verifyonchainwriter",
    description:
      "Verifies if an Ethereum address has published content on Paragraph by checking NFT ownership and contract interactions and returns eligibility status",
  },
  {
    method: "GET",
    path: "/api/ethereum/superchain-voyager",
    id: "verifysuperchainvoyager",
    description:
      "Verifies if an Ethereum address has made transactions on 3 or more Superchain networks (OP Stack chains) and returns eligibility status",
  },
  {
    method: "GET",
    path: "/api/farcaster/influencer",
    id: "verifyfarcasterinfluencer",
    description:
      "Verifies if an Ethereum address has more than 500 followers on Farcaster and returns eligibility status",
  },
  {
    method: "GET",
    path: "/api/ethereum/poap-collector",
    id: "verifypoapcollector",
    description:
      "Verifies if an Ethereum address has collected more than 50 POAPs and returns eligibility status with cryptographic signature",
  },
  {
    method: "GET",
    path: "/api/base/token-approval-revoker",
    id: "verifytokenapprovalrevoker",
    description:
      "Verifies if an Ethereum address has revoked token approvals at least once and returns eligibility status with cryptographic signature",
  },
  {
    method: "GET",
    path: "/api/ethereum/delegate-caller",
    id: "verifydelegatecaller",
    description:
      "Verifies if an Ethereum address has called the delegate method at least once and returns eligibility status with cryptographic signature",
  },
  {
    method: "GET",
    path: "/api/ethereum/zora-content-coin-buyer",
    id: "verifyzoracontentcoinbuyer",
    description:
      "Verifies if an Ethereum address has purchased Content Coins within 30 days after Zora's Content Coin feature launch and returns eligibility status with cryptographic signature",
  },
  {
    method: "GET",
    path: "/api/ethereum/historic-nft-holder",
    id: "verifyhistoricnftholder",
    description:
      "Verifies if an Ethereum address has held any of the following NFTs in the past and returns eligibility status with cryptographic signature",
  },
  {
    method: "GET",
    path: "/api/base/onchain-100x",
    id: "verifyonchain100x",
    description:
      "Verifies if an Ethereum address has made 100+ transactions on Base and returns eligibility status with cryptographic signature",
  },
  {
    method: "GET",
    path: "/api/base/bridged-based",
    id: "verifybridgedbased",
    description:
      "Verifies if an Ethereum address has bridged at least 1 ETH (cumulative) into Base and returns eligibility status with cryptographic signature",
  },
  {
    method: "GET",
    path: "/api/base/base-nft-holder",
    id: "verifybasenftholder",
    description:
      "Verifies if an Ethereum address has collected 10+ NFTs on Base and returns eligibility status with cryptographic signature",
  },
  {
    method: "GET",
    path: "/api/base/gas-burner",
    id: "verifygasburner",
    description:
      "Verifies if an Ethereum address has spent 0.05 ETH+ in gas fees on Base and returns eligibility status with cryptographic signature",
  },
  {
    method: "GET",
    path: "/api/base/base-genesis",
    id: "verifybasegenesis",
    description:
      "Verifies if an Ethereum address minted during the first 30 days of Base Mainnet and returns eligibility status with cryptographic signature",
  },
  {
    method: "GET",
    path: "/api/base/base-defi-trader",
    id: "verifybasedefitrader",
    description:
      "Verifies if an Ethereum address has made at least 30 trades on Base DEXs (Aerodrome, Uniswap, BaseSwap, etc.) and returns eligibility status with cryptographic signature",
  },
  {
    method: "GET",
    path: "/api/ethereum/nouns-governance-participant",
    id: "verifynounsgovernanceparticipant",
    description:
      "Verifies if an Ethereum address has participated in Nouns DAO governance and returns eligibility status with cryptographic signature",
  },
  {
    method: "GET",
    path: "/api/ethereum/nouns-holder",
    id: "verifynounsholder",
    description:
      "Verifies if an Ethereum address has held a Nouns NFT and returns eligibility status with cryptographic signature",
  },
  {
    method: "GET",
    path: "/api/ethereum/nouns-auction-bidder",
    id: "verifynounsauctionbidder",
    description:
      "Verifies if an Ethereum address has placed a bid in a Nouns auction and returns eligibility status with cryptographic signature",
  },
  {
    method: "GET",
    path: "/api/ethereum/nounce-supporter",
    id: "verifynounce",
    description:
      "Verifies if an Ethereum address has held a Support NFT and returns eligibility status with cryptographic signature",
  },
  {
    method: "GET",
    path: "/api/ethereum/artblocks-purchaser",
    id: "verifyartblockspurchaser",
    description:
      "Verifies if an Ethereum address has purchased an ArtBlocks NFT and returns eligibility status with cryptographic signature",
  },
  {
    method: "GET",
    path: "/api/base/casts-100-club",
    id: "verifycastsclub",
    description:
      "Verifies if an Ethereum address has made 100+ casts on Farcaster and returns eligibility status with cryptographic signature",
  },
  {
    method: "GET",
    path: "/api/base/recast-royalty",
    id: "verifyrecastroyalty",
    description:
      "Verifies if an Ethereum address has received 50+ total recasts across all posts on Farcaster and returns eligibility status with cryptographic signature",
  },
  {
    method: "GET",
    path: "/api/base/degen-believer",
    id: "verifydegenbeliever",
    description:
      "Verifies if an Ethereum address has tipped or received 1,000+ $DEGEN tokens on Farcaster and returns eligibility status with cryptographic signature",
  },
  {
    method: "GET",
    path: "/api/base/app-crafter",
    id: "verifyappcrafter",
    description:
      "Verifies if an Ethereum address has published mini apps used by 50+ unique users on Farcaster and returns eligibility status with cryptographic signature",
  },
  {
    method: "GET",
    path: "/api/base/rounds-reward-winner",
    id: "verifyroundsreward",
    description:
      "Verifies if an Ethereum address has won Farcaster Rounds rewards 3+ times and returns eligibility status with cryptographic signature",
  },
  {
    method: "GET",
    path: "/api/ethereum/nouns-supporter",
    id: "verifynounsupporter",
    description:
      "Verifies if an Ethereum address has held a Nouns NFT and returns eligibility status with cryptographic signature",
  },
  {
    method: "GET",
    path: "/api/ethereum/my-first-zora",
    id: "verifymyfirstzora",
    description:
      "Verifies if an Ethereum address has minted art on Zora and returns eligibility status with the first mint data, enabling a generative cred NFT showcasing their first Zora creation",
  },
];

export const parameters = [
  {
    name: "address",
    type: "string",
    required: true,
    description: "Ethereum address to verify",
  },
];
