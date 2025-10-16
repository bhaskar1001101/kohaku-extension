# Private Paymaster Transactions with Onion Routing

### 🗒️ **Challenge Overview**

Design a system where **account abstraction paymasters** are combined with **Tor onion routing** to enable gasless or sponsored transactions that cannot be linked to a user’s identity or metadata (IP, device, etc.).

---

### 💡 **Example Project Ideas**

- **Tor-Powered Paymaster** – A proof-of-concept paymaster that only interacts with users through a Tor hidden service.
- **Rotating Paymaster Pool** – A mechanism that rotates through multiple paymasters to prevent correlation of user activity.
- **Privacy Dashboard** – A UI for users to toggle private transaction modes and view anonymity guarantees.


# **Private RPC Node Network**

### 🗒️ **Challenge Overview**

Build a **distributed network of private Ethereum RPC nodes** accessible via onion services, where wallets (e.g. MetaMask) can simply swap the RPC endpoint to gain privacy.

---

### 💡 **Example Project Ideas**

- **One-Click Private RPC** – Replace your RPC in MetaMask with a `.onion` endpoint that automatically routes traffic through Tor.
- **Node Registry & Load Balancer** – A decentralized registry of RPC relayers with automatic distribution to prevent overload.
- **Privacy Metrics** – Dashboard that shows how anonymous your RPC traffic is (IP unlinkability, MEV protection, etc.).




# Private RPCs for Account Abstraction

### 🗒️ **Challenge Overview**

Account abstraction (AA) enables transactions from fresh, empty accounts via sponsored transactions. But it also introduces **privacy risks**: IP leakage, metadata correlation, and exposure of paymaster relationships.

This challenge asks hackers to combine **AA with private RPC routing (e.g., Tor)** to protect users from linking their real-world identity with their on-chain activity.

---

### 💡 **Example Project Ideas**

- **Tor-Enhanced Paymaster** – Integrate onion-routed private RPC calls into an AA paymaster flow.
- **Rotating Paymaster Registry** – System where users cycle through different paymasters for stronger unlinkability.
- **Privacy-Preserving Sponsorship dApp** – Show how a user with zero ETH can safely execute a transaction via private RPC + paymaster without metadata leakage.

---

### 📋 **Submission Essentials**

- **Demo or Prototype** combining AA + private RPC routing.
- **Documentation** explaining privacy model, paymaster setup, and unlinkability.
- **Short Demo Video** (≤5 minutes) walking through a private AA transaction.
- *(Optional)* Metrics comparing privacy guarantees vs standard AA flow.

**Judging Metrics**:

- **Privacy strength** – Does it mitigate IP + metadata leaks?
- **Correctness** – Transactions execute properly under AA.
- **Usability** – Can non-experts use it with minimal setup?

---

### 🛠 **Required Technologies**

- Ethereum account abstraction (ERC-4337)
- Paymaster smart contracts
- Private RPC routing (Tor, SOCKS5, or similar)

# Resilient Privacy Wallet

### 🗒️ **Challenge Overview**

Prototype a **privacy-first Ethereum wallet** that minimizes metadata leakage, integrates with private RPCs, and optionally supports stealth addresses or mixers for incoming/outgoing funds.

---

### 💡 **Example Project Ideas**

- **Onion-Routed Wallet** – Wallet with default `.onion` RPC settings baked in.
- **Stealth Transactions Add-On** – Automatically route all transactions through stealth/mixing before sending.
- **Usability Study** – Build flows that make privacy features “invisible” to non-technical users.

# Sustainable Privacy Infrastructure

### 🗒️ **Challenge Overview**

Explore **funding models for privacy-preserving infrastructure** such as private RPC relays, node operators, and paymasters. How do we ensure these services remain available as **public goods**?

---

### 💡 **Example Project Ideas**

- **Opt-in Micro-Donations** – Prototype an L2/L3 mechanism where wallet users can optionally tip RPC providers.
- **Tokenized Incentives** – Reward node operators running `.onion` RPC relays.
- **Commons Funding Mechanism** – Adapt quadratic funding or other collective funding mechanisms to support privacy infra.

# Beyond Tor: Mixnets for Ethereum Privacy

## 🔷 **Beyond Tor: Mixnets for Ethereum Privacy**

### 🗒️ **Challenge Overview**

Investigate **mixnets (like Nym)** as alternatives or complements to Tor for Ethereum privacy, reducing metadata leakage in wallet-to-RPC communication.

---

### 💡 **Example Project Ideas**

- **Tor vs Nym Benchmark** – Compare performance, latency, and anonymity guarantees.
- **Hybrid RPC Relayer** – A relayer that can switch between Tor and Mixnet routing.
-

# Scaling Tor with Community Bandwidth & Token Incentives

### 🗒️ **Challenge Overview**

The Tor network is a cornerstone of online privacy, but scaling it remains a challenge. This bounty invites hackers to explore how a **secondary layer of services** could expand Tor’s capacity — where everyday users (via browsers or Brume clients) contribute spare bandwidth in exchange for token incentives.

Rather than reinventing Tor as a new mixnet, this experiment builds on its **proven, stable infrastructure**, while adding an incentive layer that encourages broader participation and supports additional privacy-preserving services.

The vision is to create a **service ecosystem** around Tor — not only for WebTor, but for tools like indexers, faucets, proxies, and beyond.

---

### 💡 **Example Project Ideas**

- **Bandwidth-for-Tokens Module** – A prototype where users can contribute bandwidth through a browser or Brume client and receive token rewards.
- **Privacy Services Marketplace** – A registry of services (e.g., indexers, proxies, faucets) that run on top of the Tor incentive layer.
- **Micropayment Extension** – Refine last year’s proof-of-work–based payment protocol into a broader, token-enabled rewards system.

---

### 📋 **Submission Essentials**

- **Demo or Prototype** showing how users can contribute bandwidth and earn tokens.
- **Documentation** explaining:
    - How Tor remains the secure backbone while new services are layered on top.
    - Incentive design (payment flow, token logic, bandwidth measurement).
    - Example services beyond WebTor (e.g., proxy, indexer, faucet).
- **Short Demo Video** (≤5 minutes) demonstrating contribution and reward flow.
- *(Optional)* Mockups of a service marketplace or Brume integration.

**Judging Metrics**:

- **Scalability** – Does the approach realistically expand Tor capacity?
- **Security** – How well does it preserve Tor’s guarantees without weakening the core?
- **Usability** – Can non-technical users participate easily (via browser/Brume)?
- **Service potential** – Range of additional applications enabled by the model.

---

### 🛠 **Required Technologies**

- **Tor network integration** (SOCKS5, onion services, Brume client support)
- **Token or reward mechanisms** (ERC-20, payment channels, or extensions of the PoW-based protocol)
- *(Optional)* Service layer components (indexers, faucets, proxies)
- *(Optional)* Frontend integrations for browsers or lightweight clients

# Incentivized Private RPC Nodes

### 🗒️ **Challenge Overview**

For Tor-based RPCs to scale, more independent nodes are needed. This bounty invites hackers to design **incentives for running private RPC nodes** while keeping the system decentralized and privacy-preserving.

---

### 💡 **Example Project Ideas**

- **Private RPC Node Dashboard** – Simple node runner UI to visualize usage and set query limits.
- **Load Balancer / Relay Registry** – A decentralized registry that auto-distributes traffic across nodes.
- **Reputation Layer** – Proof-of-uptime or credibility scores for node operators.

---

### 📋 **Submission Essentials**

- **Demo or Prototype** incentivized node-running flow.
- **Documentation** explaining incentive model and threat mitigations.
- **Short Demo Video** (≤5 minutes) showing how node operators onboard and earn rewards.

**Judging Metrics**:

- **Scalability** – More nodes, less centralization.
- **Resilience** – Protection against spam/DoS.
- **Clarity** – Incentive model understandable to new operators.

---

### 🛠 **Required Technologies**

- Tor/onion service RPC nodes
- Node registry or smart contract for incentives
- *(Optional)* Token or reputation mechanisms

# Privacy-Focused Wallet Prototype

### 🗒️ **Challenge Overview**

Most mainstream wallets (e.g., MetaMask) leak metadata through RPC calls and background HTTP requests. This bounty invites hackers to design a **wallet prototype where privacy is the default**. See [Blume wallet for inspiration](https://github.com/brumeproject/wallet)

---

### 💡 **Example Project Ideas**

- **Stealth RPC Wallet** – Minimal wallet that routes all requests through onion-routed RPCs.
- **Integrated Mixer Layer** – Prototype automatic coin-join or mixer routing on all incoming/outgoing funds.
- **Leakage Analysis Tool** – Detect and visualize metadata leaks from common wallets to highlight improvements.

---

### 📋 **Submission Essentials**

- **Demo or Prototype** of a privacy-first wallet.
- **Documentation** explaining how leaks are prevented/reduced.
- **Short Demo Video** (≤5 minutes) walking through privacy features.

**Judging Metrics**:

- **Privacy guarantees** – Metadata leaks reduced or eliminated.
- **Usability** – Intuitive UX with minimal friction.
- **Extensibility** – Potential to integrate into existing wallet ecosystems.

---

### 🛠 **Required Technologies**

- Ethereum wallet SDKs
- Tor/private RPC integration
- *(Optional)* Mixer or stealth address protocols

# **Next-Gen Privacy Networks**

### 🗒️ **Challenge Overview**

Tor is a strong foundation, but what happens if we go further — using **mixnets like Nym** or even **private information retrieval (PIR)** for RPC queries? This bounty challenges hackers to design and benchmark **next-gen privacy networks for Ethereum RPC traffic**.

---

### 💡 **Example Project Ideas**

- **RPC over Nym Mixnet** – Replace Tor with a Nym relay and compare latency/anonymity.
- **Hybrid Privacy Router** – A system that switches between Tor, Nym, or standard RPC depending on latency.
- **PIR Proof-of-Concept** – Explore whether PIR can make specific RPC queries unlinkable.

---

### 📋 **Submission Essentials**

- **Demo or Prototype** showing an alternative privacy network in action.
- **Documentation** covering privacy model, tradeoffs, and performance benchmarks.
- **Short Demo Video** (≤5 minutes) with a live RPC request routed through the network.

**Judging Metrics**:

- **Innovation** – Novelty of network design.
- **Performance** – Practicality vs Tor (latency, throughput).
- **Anonymity strength** – Degree of metadata protection.

---

### 🛠 **Required Technologies**

- Tor / Nym mixnet integrations
- RPC relayer services
- *(Optional)* Private information retrieval (PIR) libraries