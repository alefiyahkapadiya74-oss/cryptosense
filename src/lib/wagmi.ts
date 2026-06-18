import { http, createConfig } from "wagmi";
import { mainnet, polygon, arbitrum, optimism, base } from "wagmi/chains";
import { injected, walletConnect, coinbaseWallet, metaMask } from "wagmi/connectors";

// Public WalletConnect project id — using a demo id; users can replace.
const projectId = "3fbb6bba6f1de962d911bb5b5c9dba88";

export const wagmiConfig = createConfig({
  chains: [mainnet, base, arbitrum, optimism, polygon],
  connectors: [
    metaMask(),
    injected({ shimDisconnect: true }),
    walletConnect({
      projectId, showQrModal: true, metadata: {
        name: "CryptoSense",
        description: "AI-Powered Crypto Intelligence",
        url: typeof window !== "undefined" ? window.location.origin : "https://cryptosense.ai",
        icons: [],
      }
    }),
    coinbaseWallet({ appName: "CryptoSense" }),
  ],
  transports: {
    [mainnet.id]: http(),
    [base.id]: http(),
    [arbitrum.id]: http(),
    [optimism.id]: http(),
    [polygon.id]: http(),
  },
  ssr: false,
});

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
