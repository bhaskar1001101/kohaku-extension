# Tohaku

<div align="center">
  <p>
    Privacy-preserving Ethereum wallet with Tor and Nym mixnet integration.<br />
    <em>Research demonstration built on Ambire Wallet</em>
  </p>
</div>

> Demo Video https://youtu.be/Jv7WTnsUNEY

## Research Project Overview

**Research Question:** How do Tor and Nym mixnets compare for protecting Ethereum RPC metadata, and what are the practical tradeoffs?

This is a research demonstration, not a production implementation. The goal is rigorous analysis of privacy tradeoffs with empirical measurements.

### Threat Model

**What we're protecting:**
- IP address to account address correlation
- Transaction timing analysis (MEV, front-running)
- Multi-chain account linkability
- ISP/state-level surveillance of blockchain interactions

**Legitimate use cases:**
- Activists in authoritarian regimes using crypto for coordination
- Traders protecting against MEV front-running
- Users preventing commercial tracking/profiling
- Compartmentalizing addresses (Kohaku's "one account per dApp" philosophy)
- Right to read blockchain without surveillance


## Metadata Leakage Analysis

### Baseline (No Privacy)

**Observed leaks in standard Ambire/Kohaku usage:**

1. **Multi-chain account correlation**:
   ```
   GET https://relayer.ambire.com/velcro-v3/multi-hints?
       networks=1,10,56,137,5000,8453,42161,43114,534352&
       accounts=0xAlice,0xBob,0xCarol&
       sigs=2,1,3
   ```
   Exposes all your addresses across 9+ chains in a single request. Relayer can link: "This user controls these addresses on all these chains."

2. **RPC provider surveillance**:
   - Balance checks: `eth_getBalance(0xAlice)` reveals you control 0xAlice
   - Transaction broadcast: `eth_sendRawTransaction(...)` exposes your IP and transaction timing
   - State queries: Wallet polling patterns are fingerprintable

3. **Account Abstraction metadata**:
   - Bundlers (Pimlico, Etherspot) see UserOperations before blockchain submission
   - Paymasters reveal sponsorship relationships
   - EntryPoint contract creates public transaction graph

4. **Instance tracking**:
   - `x-app-source` header on all requests (extension fingerprinting)
   - Price feed queries to `cena.ambire.com` (usage patterns)

## Privacy Layer Architecture

### Network Call Interception Points

**Primary:** `fetchWithAnalytics` (src/web/extension-services/background/background.ts:314-358)
- Wraps ALL network requests from MainController
- Routes to: Relayer, Velcro, RPC providers, bundlers, price feeds
- Single interception point for maximum coverage

**Secondary:** `forwardRpcRequests` (src/web/extension-services/inpage/ambire-inpage.ts:104-119)
- Handles dApp-initiated RPC requests
- Less critical (dApp can see its own requests anyway)

**Transaction broadcast paths:**
1. **Regular transactions**: `provider.send('eth_sendRawTransaction', ...)` via ethers JsonRpcProvider
2. **ERC-4337 UserOps**: Bundler APIs (Pimlico, Etherspot) via custom fetch
3. **Relayer broadcasts**: `relayerCall()` via fetchWithAnalytics

**ALL routes eventually use browser's native `fetch()`, making single-point interception possible.**

## Tor Integration

### Architecture

**User setup:**
```bash
# User runs Tor daemon locally
tor
# SOCKS5 proxy now listening on localhost:9050
```

**Extension integration:**
```typescript
// PrivacyProxyService routes through SOCKS5 proxy
class PrivacyProxyService {
  async fetch(url, init, sensitivity: 'high' | 'medium' | 'low') {
    if (mode === 'tor') {
      return fetchViaSocks5('localhost:9050', url, init, {
        newCircuit: sensitivity === 'high'  // Circuit isolation
      })
    }
  }
}
```

### Circuit Management (Wasabi Wallet Model)

**Strategy:**
- **Default circuit**: Balance checks, price feeds (speed matters)
- **New circuit per request**: High-value transactions (privacy critical)
- **Per-address isolation**: Each address uses dedicated circuit (compartmentalization)

### What Tor Protects

- IP address hidden from RPC provider (exit node IP seen instead)
- RPC provider hidden from ISP (only guard node visible)
- Single-point surveillance defeated
- Censorship resistance

### What Tor Does NOT Protect

- **Timing attacks**: Packet timing preserved (~constant latency)
- **Traffic analysis**: Patterns visible to global passive adversary
- **Application metadata**: RPC provider still sees query content
- **End-to-end correlation**: If adversary controls entry + exit nodes

### Measured Performance

| Metric | Baseline | Tor |
|--------|----------|-----|
| Latency (P50) | | |
| Latency (P95) | | |
| Success Rate | | |
| Anonymity Set | 0 | ~7,000 relays |
| Timing Variance | Low (predictable) | Low (vulnerable to correlation) |

### Timing Correlation Vulnerability

**Attack scenario:**
```
Adversary observes:
- Entry node: Packet from User IP at T₀
- Exit node: RPC query to Infura at T₀ + 237ms (typical Tor latency)
Result: Correlation confidence 90%+ (timing is nearly constant)
```

**Countermeasures:**
- Use high-latency mix nodes (not standard Tor)
- Add random delays (degrades UX)
- Use Nym mixnet instead (next section)

## Nym Integration

### Architecture

**User setup:**
```bash
# User runs Nym SOCKS5 client
nym-socks5-client run
# SOCKS5 proxy now listening on localhost:1080
```

**Extension integration:**
```typescript
// Same PrivacyProxyService, different backend
if (mode === 'nym') {
  return fetchViaSocks5('localhost:1080', url, init)
  // Nym client handles: Sphinx packets, Poisson mixing, cover traffic
}
```

### No Custom Service Provider Needed

**For this demo:**
- Nym SOCKS client routes through mixnet automatically
- Exit gateway connects to clearnet RPC (Infura, Alchemy, etc.)
- Sphinx packet format + Loopix mixing strategy built-in

**Custom service provider only needed for:**
- Running own RPC that ONLY accepts Nym traffic (`.nym` addresses)
- Protocol modifications (not in scope)

### Sphinx Packet Format

**Bitwise unlinkability:**
```rust
// Each hop transforms the packet
α₂ = b · α₁        // Different group element
β₂ = reencrypt(β₁) // Different ciphertext
γ₂ = HMAC(s, α₂||β₂) // Different MAC

// Result: P₁ and P₂ share NO common bits
```

**Property:** Entry and exit packets have zero correlation at binary level.

### Loopix Mixing Strategy

**Poisson delay distribution:**
```python
delay = random.expovariate(λ=0.5)  # Mean 2s, high variance
```

**Memoryless property:**
```
P(T > s+t | T > s) = P(T > t)
```
Knowing how long a packet waited reveals NOTHING about when it releases.

**Effect:** Destroys timing correlation that Tor is vulnerable to.

### Cover Traffic

**Continuous dummy packets even when idle:**
- Rate: ~0.2 packets/second
- Cost: ~35 GB/day bandwidth
- Benefit: Adversary cannot tell user active vs idle

### Measured Performance

| Metric | Baseline | Nym |
|--------|----------|-----|
| Latency (P50) | | |
| Latency (P95) | | |
| Success Rate | | |
| Anonymity Set | 0 | ~512,000 paths (80³) |
| Timing Variance | Low | **HIGH** (good for privacy) |

### Timing Correlation Resistance

**Attack scenario (FAILS):**
```
Adversary observes:
- Entry gateway: Packet at T₀
- Exit gateway: Packet at T₀ + ???ms (anywhere from 1s to 10s)
Result: Correlation confidence <10% (timing is randomized by Poisson mixing)
```

**Tradeoff:** Higher latency, but near-perfect timing privacy.

## Comparative Analysis

### Privacy vs Usability Matrix

| Scenario | Baseline | Tor | Nym | Recommendation |
|----------|----------|-----|-----|----------------|
| Balance check | Fast, no privacy | Good speed, good privacy | Slow, excellent privacy | **Tor** (speed matters) |
| High-value tx | Fast, MEV vulnerable | Good speed, timing vulnerable | Slow, MEV resistant | **Nym** (timing matters) |
| State surveillance | Fully exposed | Exit correlation possible | Near-impossible correlation | **Nym** (state-level threat) |
| General DeFi | Fast, tracked | Good balance | Too slow? | **Tor** (good enough) |
| Privacy-conscious trading | Exposed | Hybrid: Tor reads, Nym writes | Full Nym | **Hybrid** (best of both) |

### Anonymity Metrics

**IP Privacy:**
- Baseline: Leaked to RPC provider, ISP, network observers
- Tor: Hidden (exit node IP seen by RPC provider)
- Nym: Hidden (exit gateway IP seen)

**Timing Attack Resistance:**
- Baseline: Perfect correlation (same timing = same user)
- Tor: Vulnerable (latency ~constant, 90%+ correlation possible)
- Nym: Protected (high variance, <10% correlation)

**Anonymity Set Size:**
- Baseline: 0 (your IP uniquely identifies you)
- Tor: ~7,000 relays (but guard stable, exit limited to ~1,000)
- Nym: ~512,000 paths (80 nodes × 3 layers, exponential scaling)

**Application Metadata:**
- All: RPC provider still sees query content (future: PIR)

## User Experience Design

### Privacy Mode Selection

**Extension Settings Panel:**
```
Settings → Privacy Mode
○ Direct (No Privacy) - Fastest
○ Tor (Good Privacy) - Balanced
○ Nym (Maximum Privacy) - Slowest
```

**Automatic (Sensitivity-Based):**
```typescript
function determinePrivacyMode(requestType: string, value: bigint) {
  if (requestType === 'broadcast' && value > ethers.parseEther('1.0')) {
    return 'nym'  // High-value tx
  }
  if (requestType === 'balance' || requestType === 'price') {
    return 'tor'  // Read-only, speed matters
  }
  return 'tor'  // Default: balanced
}
```

### Failure Handling

**Tor circuit failure:**
- Retry with new circuit (3 attempts)
- Fall back to direct connection with user consent
- Display: "Tor unavailable. Proceed without privacy?"

**Nym mixnet failure:**
- Retry with different mix nodes (2 attempts)
- Fall back to Tor (still private)
- Display: "Nym slow/unavailable. Use Tor instead?"

## Implementation Status

### Completed (Research Phase)

- Architecture analysis (data flow mapping)
- Metadata leakage documentation (empirical observations)
- Tor integration design (circuit management strategy)
- Nym integration design (mixnet architecture understanding)
- Comparative framework (metrics definition)

### In Progress (Development Phase)

- PrivacyProxyService implementation
  - SOCKS5 proxy wrapper for browser fetch()
  - Circuit isolation for Tor
  - Mode switching logic
- Measurement framework
  - Latency benchmarking (P50, P95, P99)
  - Timing correlation tests
  - Success rate monitoring
- UI integration
  - Settings panel for mode selection
  - Privacy status indicator
  - Failure handling UX

### Future Work

- Private Information Retrieval for balance checks
- Incentivized privacy infrastructure (.onion/.nym RPC nodes)

## Environment Setup

Built in a hybrid approach (with React Native and React Native Web) so that in a single codebase we can support building cross-browser extensions, mobile apps and web apps.

This project is built with Expo's bare workflow, allowing us to extend the default Vanilla React Native with additional expo modules in the form of installable expo libraries.

More about the environment setup and prerequisites [here](https://reactnative.dev/docs/environment-setup).

## Install

Install all dependencies:

```bash
yarn install
```

Install the [ambire-common](https://github.com/AmbireTech/ambire-common) submodule, a common ground for the Ambire apps, run:

```bash
git submodule init
git submodule update
```

## Environment Variables

Create ".env" file in the root directory and fill in all variables, see ".env-sample" for a reference.

## Privacy Layer Prerequisites

**For Tor integration:**
```bash
# Install Tor daemon
sudo apt install tor  # Debian/Ubuntu
brew install tor      # macOS

# Start Tor
tor
# SOCKS5 proxy now on localhost:9050
```

**For Nym integration:**
```bash
# Install Nym SOCKS5 client
# See: https://nymtech.net/docs/clients/socks5-client.html

# Run Nym client
nym-socks5-client run
# SOCKS5 proxy now on localhost:1080
```

## Editor Config

Make sure your code editor has plugins that support the following configuration files: `.editorconfig`, `.prettierrc`, `tsconfig.json`, `eslintrc.js`, [`import-sorter.json`](https://github.com/SoominHan/import-sorter).

## Browser Extensions

### Development-optimized Builds

- Start the browser extension for webkit browsers (tested mostly on Chrome and Brave):

  ```bash
  yarn web:webkit
  ```

  Then follow the instructions to load an unpacked extension [here](https://developer.chrome.com/docs/extensions/get-started/tutorial/hello-world#load-unpacked).

- Start the browser extension for gecko browsers (tested mostly on Firefox):

  ```bash
  yarn web:gecko
  ```

  Then follow the instructions to temporarily install an extension in Firefox [here](https://extensionworkshop.com/documentation/develop/temporary-installation-in-firefox/).

- Start the browser extension for the Safari browser:

  ```bash
  yarn web:safari
  ```

  Two new folders will be created:

  - build/safari-dev (dev build folder)
  - safari-extension/wallet-dev (Xcode project)

  then in the Safari browser:

  - Developer -> Developer settings...
  - Check the "Allow unsigned extensions" option. (Note: This setting may not persist after Safari is restarted.)​
  - Then the extension should be automatically added and pinned in the browser.

  NOTE: You can manage the available extensions from: Safari -> Settings... -> Extensions

  NOTE: The development script for Safari relies on the fswatch tool to automatically reload the Safari build when the development server is reloaded. If fswatch is not already installed on your system, you can install it using Homebrew with the following command:

  ```bash
  brew install fswatch
  ```

### Production-optimized Builds

- For webkit browsers:

  ```bash
  yarn build:web:webkit
  ```

  And find the resulting build in the "build/webkit-prod" folder.

- For gecko browsers:

  ```bash
  yarn build:web:gecko
  ```

  And find the resulting build in the "build/gecko-prod" folder.

- For the Safari browser:

  ```bash
  yarn build:web:safari
  ```

  Two new folders will be created:

  - "build/safari-prod" (production build folder)
  - "safari-extension/wallet" (the Xcode project)

  Then, in xCode manually do (TODO: automate these steps, it turned out to be a huge challenge):

  - Delete "walletTests" and "walletUITests" targets.
  - For both targets (macOS and extension): Signing & Capabilities: Team: "Ambire Tech Ltd", Signing Certificate: Development
  - For both targets (macOS and extension): General - Identity - Version: X.X (should match the version in the app.json file, example: `4.36`) and Build: X (integer, bump up on every next build submitted to the App Store Connect, example: `3`)
  - For the macOS target: General - App Category: "Utilities"
  - For the extension target: General - Identity - Bundle Identifier: `com.ambire.app.wallet.extension`

### Extract Source Maps

The production-optimized builds come with source maps files included. When preparing a production build for a browser store release, run the following commands to extract the source maps in separate directories:

- For the webkit build:

  ```bash
  yarn export:web:webkit:sourcemaps
  ```

  As a result, build/webkit-prod will no longer include the source map files (as before). Instead, a new folder, build/webkit-prod-source-maps, will be created to hold only the source maps. This folder should also be included in the GitHub release tag we create.

- For the gecko build:

  ```bash
  yarn export:web:gecko:sourcemaps
  ```

  Same as for the webkit build, but for the gecko build.

- For the Safari build: not implemented yet.

For more details, including how to trace /deminify a production reported error, see [#3191](https://github.com/AmbireTech/ambire-app/pull/3191).

### Store-prepared Builds

Automates the steps before every extension extension store release that could be otherwise done manually:

- Makes webkit and gecko extension production builds
- Exports source maps to "clean" the builds (and to prepare for upload those source maps in the GitHub release)
- Zips the "clean" builds (stores accept zips only) and the source maps

```bash
yarn build:extensions
```

And find the resulting zips in the "build" folder as `ambire-extension-<VERSION>-<TYPE>.zip`

## Mobile Apps

The Ambire v2 compatible mobile apps are yet to be developed. Coming sometime in the near future.

## Explorer (Old name: Benzin)

Ambire's transaction explorer, that makes human readable ERC-4337 transactions and contract interactions.

Comes not only as integrated module in the Ambire extension(s), but as a standalone web app also.

### Development-optimized Build

```bash
yarn web:benzin
```

And find the resulting build in the "build/benzin-dev" folder.

### Production-optimized Build

```bash
yarn build:web:benzin
```

And find the resulting build in the "build/benzin-prod" folder.

## Ambire Rewards

Ambire Rewards is a gamified testing web3 app for the Ambire browser extensions. It is designed to users you discover the power of Smart Accounts via an epic onchain adventure. [Read more](https://rewards.ambire.com/).

### Development-optimized Build

```bash
yarn web:legends
```

And find the resulting build in the "build/legends-dev" folder.

```bash
yarn build:web:legends
```

And find the resulting build in the "build/legends-prod" folder.

## Others

### Browser Extensions E2E Tests

#### Configuration

We've migrated from Puppeteer to Playwright (./e2e-playwright-tests/). Documentation will follow soon.

## References & Related Work

### Academic Papers
- **Sphinx**: Compact and provably secure mix format (Danezis & Goldberg, 2009)
- **Loopix**: Anonymity system with Poisson mixing (Piotrowska et al., 2017)
- **Traffic analysis attacks on Tor** (Murdoch & Danezis, 2005)

### Implementations
- **Wasabi Wallet**: Tor integration for Bitcoin ([blog post](https://blog.wasabiwallet.website/explaining-wasabi-wallets-tor-implementation/))
- **Nym Mixnet**: Production mixnet ([nymtech.net](https://nymtech.net))
- **Tor Project**: Onion routing ([torproject.org](https://torproject.org))

### Related Projects
- **Brume Wallet**: Privacy-focused Ethereum wallet ([GitHub](https://github.com/brumeproject/wallet))
- **Tor Wallet**: Minimal Tor-integrated wallet ([GitHub](https://github.com/torwalletxyz/wallet))
- **Whonix Ethereum Guide**: Running Ethereum node over Tor ([Whonix docs](https://www.whonix.org/wiki/Ethereum))

### Kohaku Project
- **Kohaku Roadmap**: Privacy Pools & Railgun integration ([Ethereum Research](https://notes.ethereum.org/@niard/KohakuRoadmap))
- **Kohaku SDK**: Privacy primitives for Ethereum ([GitHub](https://github.com/ethereum/kohaku))

## Contributing

"Privacy is a means to protect, not hide. The means are not justified if the end isn't."

**We build privacy tools for legitimate use cases:**
- Activists protecting themselves from the state
- Users exercising their right to financial privacy
- Everyone deserving to read blockchain without surveillance

### Using for storing real funds?

This is a project demonstrating privacy techniques. Before deploying in production:
1. Understand your threat model (who are you protecting against?)
2. Evaluate tradeoffs (privacy vs speed, cost vs benefit)
3. Consider legal implications (some jurisdictions restrict anonymity tools)
4. Test thoroughly (privacy bugs can be catastrophic)

## Acknowledgments

- **Ambire Team**: For building excellent wallet infrastructure
- **Tor Project**: For pioneering anonymous communications
- **Nym Technologies**: For advancing mixnet research
- **Ethereum Foundation**: For supporting privacy research and Ethereum

