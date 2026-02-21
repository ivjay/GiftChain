import { createConfig, http, fallback } from 'wagmi';
import { polygonAmoy } from 'wagmi/chains';
import { injected } from 'wagmi/connectors';

export const config = createConfig({
  chains: [polygonAmoy],
  connectors: [
    injected(),
  ],
  transports: {
    [polygonAmoy.id]: fallback([
      http('https://rpc-amoy.polygon.technology'),
      http('https://polygon-amoy-bor-rpc.publicnode.com'),
      http('https://amoy.drpc.org'),
      http('https://1rpc.io/amoy'),
      http('https://polygon-amoy.blockpi.network/v1/rpc/public'),
    ]),
  },
});
