# CLAUDE.md - Privacy-Preserving RPC Research Project

## Project Context & Timeline

**Start Time:** October 16, 2025, 2:12 AM
**Deadline:** October 17, 2025, 3:30 AM (~25 hours)
**Last Edit to CLAUDE.md:** October 17, 2025, 2:00 AM
**Current Status:** Research phase - understanding architecture

**Schedule:**
Block 1-2 (4:30-7:30 AM):
Kohaku architecture deep dive (Deepwiki MCP + File Read)
Baseline metadata measurement setup
Document what leaks without privacy

5:00-5:30 AM: SUNRISE WALK (non-negotiable reset)

Block 3-4 (7:30-10:30 AM):
Tor integration research + first implementation
Circuit management strategy
Empirical timing tests

10:30-11:00 AM: MEAL + WALK

Block 5-7 (11:00 AM-4:00 PM):
Nym mixnet integration research
Comparative latency benchmarks
Timing correlation tests

4:00-4:30 PM: MEAL

Block 8-10 (4:30-9:30 PM):
Statistical analysis of measurements
Write up findings (comparative doc)
Identify limitations/future work

9:30-10:00 PM: BREAK
Block 11-13 (10:00 PM-3:30 AM):

Demo flow + video recording
Clean documentation
Buffer for technical issues

2:00 AM: CODE FREEZE - documentation only
3:30 AM: SUBMIT
Critical: If behind at 2 PM checkpoint, cut Nym depth. Tor + good measurement > both half-baked.

**Project Type:** This is a **research demonstration**, not a production hack. Focus on rigorous analysis of privacy tradeoffs with empirical data. Programming is craft, not rush-to-finish.

---

## Core Research Question

**How do Tor and Nym mixnets compare for protecting Ethereum RPC metadata, and what are the practical tradeoffs?**

**Sub-questions:**
1. What metadata leaks in standard Ethereum RPC usage?
2. What does Tor protect and what does it NOT protect?
3. What additional protection does Nym provide?
4. What are the latency/usability costs?
5. When should each be used?

---

## Cypherpunk Framework

**From user:** "Privacy is a means to protect, not hide. The means are not justified if the end isn't."

**Legitimate Use Cases:**
- Activists in authoritarian regimes using crypto for coordination
- Traders protecting against MEV front-running
- Users preventing commercial tracking/profiling
- Compartmentalizing addresses (Kohaku's "one account per dApp")
- Right to read blockchain without surveillance

**NOT for:**
- Money laundering
- Sanctions evasion
- Criminal operations

**Frame:** Protecting the right to use Ethereum privately, not facilitating crime.

---

## Architecture Overview

### The Three Kohaku Repositories

**Current Finding (Oct 16, 2:12 AM):**

1. **`kohaku-extension`** (Browser Wallet)
   - Fork of Ambire extension
   - NO Kohaku-specific changes yet (main branch)
   - Someone from EF working on privacy pools integration (different branch)
   - This is where RPC requests originate
   - Currently running in Firefox

2. **`kohaku-commons`** (Shared Infrastructure)
   - Fork of ambire-commons
   - Submodule in kohaku-extension
   - Contains: JsonRpcProvider usage, account state management
   - Shared code between wallet and SDK

3. **`kohaku`** (SDK/Primitives)
   - Two packages: `privacypools` and `railgun`
   - Will be integrated into extension later (not done yet)
   - Privacy protocol implementations

**Data Flow:**
```
User Action in Browser
    ↓
kohaku-extension (UI + wallet logic)
    ↓
kohaku-commons (provider layer - JsonRpcProvider)
    ↓
[INTERCEPTION POINT - where we add Tor/Nym]
    ↓
ethers.js network layer
    ↓
HTTP/HTTPS request
    ↓
RPC Provider (currently: ambire proxy, then chain RPCs)
```

### Observed Metadata Leakage (Real Data)

**On extension load, it makes:**

1. **RPC Proxies:**
   ```
   POST https://invictus.ambire.com/<chain>
   Methods: eth_getTransactionCount, eth_getCode, eth_call
   ```

2. **Price/Market Data:**
   ```
   GET https://cena.ambire.com/api/v3/simple/price?ids=<coin>&vs_currencies=usd
   GET https://cena.ambire.com/api/v3/lists/byMarketCap/1
   ```

3. **Multi-Chain Account Data (CRITICAL LEAK):**
   ```
   GET https://relayer.ambire.com/velcro-v3/multi-hints?
       networks=1,10,56,137,5000,8453,42161,43114,534352&
       accounts=0x1778ACFb55f3701530377892aFD9E0c93F48cd19,...
   ```
   
   **Problem:** Account addresses exposed in URL query params across multiple chains!

**Required API Keys (.env):**
- `REACT_APP_PIMLICO_API_KEY` - ERC-4337 bundler
- `REACT_APP_ETHERSPOT_API_KEY` - ERC-4337 bundler
- `LI_FI_API_KEY` - Cross-chain liquidity
- `NFT_CDN_URL` - NFT image resolver

### Account Abstraction Metadata Leakage (NEW CONCERN)

**User asked:** "might these AA ideas also leak metadata too?"

**YES - Additional AA-specific leakage:**

1. **Bundler Services (Pimlico, Etherspot):**
   - See UserOperation before blockchain submission
   - Can link: wallet address, sponsored transactions, timing
   - Centralized service = surveillance point

2. **Paymaster Tracking:**
   - Paymasters see who they're paying gas for
   - Can correlate: "address X always uses paymaster Y"
   - Sponsorship patterns reveal relationships

3. **EntryPoint Contract:**
   - All UserOps visible on-chain
   - Public record of which paymaster sponsored which account
   - Transaction graph analysis

4. **Relayer Services:**
   - The `relayer.ambire.com` endpoint is querying account state across 9 chains
   - Relayer knows: user controls these addresses on all these chains
   - Perfect correlation attack

**Implication:** Even with Tor/Nym for RPC, AA infrastructure creates new metadata leakage vectors.

---

## Metadata Leakage Theory (7-Layer Stack)

### What Leaks Without Privacy:

**Layer 3 (Network):**
- Source IP address → geolocation, ISP
- Destination IP → which RPC provider

**Layer 4 (Transport):**
- TCP timing, packet sizes

**Layer 7 (Application):**
- RPC method calls (eth_getBalance, eth_sendRawTransaction)
- Parameters (addresses queried)
- Query patterns (poll every 10s = wallet fingerprint)
- Session correlation (all queries from same IP)

**Information Theoretic View:**

```
H_total = H_content + H_metadata

Even with perfect encryption (H_content = max):
- If H_metadata is low, communication is linkable
- RPC provider can build complete user behavior graph
```

**Example Attack:**
```
User queries 0xAlice balance at T₀
User sends tx from 0xAlice at T₀+60s
→ RPC provider concludes: IP controls 0xAlice (100% confidence)
```

**Entropy Loss:**
- Before queries: H = log₂(2¹⁶⁰) = 160 bits (uncertainty over all addresses)
- After queries: H = 0 bits (perfect knowledge)
- **Information leaked: 160 bits**

---

## Tor: Architecture & Vulnerabilities

### What Tor Protects:
 IP address hidden from destination (exit node IP seen)
 Destination hidden from ISP (only sees guard node)
 Single-point surveillance
 Censorship resistance

### What Tor Does NOT Protect:
 **Timing attacks** (packet timing preserved)
 **Traffic analysis** (patterns visible)
 **Application metadata** (RPC provider still sees queries)
 **End-to-end correlation** (if adversary controls entry + exit)

### Attack Scenarios:

**1. End-to-End Timing Correlation**
```
Adversary observes:
- Entry: User IP sent packet at T₀
- Exit: RPC query arrived at T₀+237ms (typical latency)
→ Correlation confidence: 90%+
```

**2. Website Fingerprinting**
```
Machine learning on traffic patterns:
- Packet sizes (Tor uses 512-byte cells)
- Timing bursts
- Total bytes
→ Can identify "user visited Uniswap" with 90%+ accuracy
```

**3. Sybil Attack**
```
Attacker runs 10% of Tor network
P(compromised circuit) = 0.01 (1%)
But over 100 circuit rotations: P(compromised at least once) = 95%
```

### Wasabi Wallet's Tor Implementation

**Circuit Modes:**
- `DefaultCircuit`: Reuse for non-sensitive ops
- `SingleCircuitPerLifetime`: New circuit per component
- `NewCircuitPerRequest`: New circuit every request (most private)

**For Ethereum:**
- Balance checks: DefaultCircuit (speed matters)
- Transactions: NewCircuitPerRequest (privacy critical)

**Control Port:**
- Tor control port (9051) allows programmatic circuit management
- Enable in torrc: `ControlPort 9051`
- Browser extension can't access directly → need proxy service

---

## Nym: Mixnet Architecture

### Core Difference from Tor:

**Tor:** Passive routing (timing preserved)
**Nym:** Active mixing (timing destroyed)

### Sphinx Packet Format

**Properties:**
1. **Bitwise unlinkability** - binary pattern changes at each hop
2. **Integrity protection** - detect/drop malformed packets
3. **Forward secrecy** - past packets secure if key compromised

**Structure:**
```rust
struct SphinxPacket {
    header: SphinxHeader {
        alpha: GroupElement,  // Shared secret component
        beta: [u8],           // Routing info (encrypted per hop)
        gamma: [u8; 16],      // MAC for integrity
    },
    payload: [u8; PAYLOAD_SIZE],
}
```

**Key Innovation:** Each hop applies blinding factor
```
α₂ = b · α₁  (different group element)
β₂ = reencrypt(β₁)  (different ciphertext)
γ₂ = HMAC(s, α₂||β₂)  (different MAC)

Result: P₁ and P₂ share NO common bits
```

### Loopix Mixing Strategy

**Poisson Delay Distribution:**
```python
delay = random.expovariate(λ=0.5)  # Mean 2s, high variance
```

**Memoryless Property:**
```
P(T > s+t | T > s) = P(T > t)
```
Knowing how long packet waited reveals NOTHING about when it releases!

**Effect:** Destroys timing correlation that Tor is vulnerable to.

### Cover Traffic

**Continuous dummy packets even when idle:**
```python
cover_traffic_rate = 0.2  # packets/second
# Cost: ~35 GB/day bandwidth
# Benefit: Can't tell user active vs idle
```

### Stratified Topology (3 Layers)

```
Entry Gateway
    ↓
Layer 1: 80 mix nodes (random selection)
    ↓
Layer 2: 80 mix nodes (random selection)
    ↓
Layer 3: 80 mix nodes (random selection)
    ↓
Exit Gateway
```

**Anonymity Set:**
- Possible paths: 80³ = 512,000
- Path entropy: log₂(512,000) ≈ 19 bits
- Plus timing variance: essentially unlinkable

### Single-Use Reply Blocks (SURBs)

**For RPC request/response:**
```
User → [Mixnet] → RPC Provider
     ← [SURB path] ← 

Provider can respond without knowing user's location!
```

---

## Technical Tradeoffs

### Firefox Extension + Tor

**Options:**

1. **Background script → Tor SOCKS proxy (localhost:9050)**
   -  Works with standard Firefox
   -  User must install Tor daemon separately
   -  Setup complexity

2. **Run extension IN Tor Browser**
   -  Best fingerprinting resistance
   -  Tor Browser blocks most extensions
   -  Forces users to switch browsers

3. **Native messaging to Tor daemon**
   -  Better isolation
   -  Even more setup

**Decision for demo:** Assume Tor daemon running, extension uses SOCKS proxy.

### Tor Circuit Granularity

**Option A:** One circuit for all requests
-  Fast
-  Provider correlates all queries

**Option B:** New circuit per address (Wasabi model)
-  Compartmentalization
-  Slower

**Option C:** New circuit per transaction, reuse for reads
-  Balanced
-  More complex

### RPC Endpoint Selection

**Option A:** Public .onion RPCs
-  End-to-end Tor
-  Very few exist

**Option B:** Tor exit → clearnet RPC
-  Works with any RPC
-  Exit node sees destination

### Nym Integration

**Do we need a custom Nym service provider?**

**NO - for demo:**
```bash
# Nym has SOCKS5 mode
nym-socks5-client run
# Now localhost:1080 routes through mixnet

# Extension points at localhost:1080
# Traffic: Extension → Nym mixnet → Exit gateway → Infura
```

**Custom service provider only needed for:**
- .nym addresses
- Running own RPC that ONLY accepts Nym traffic
- Custom protocol modifications

---

## Comparative Analysis Framework

### Latency

| Method | Expected Overhead |
|--------|-------------------|
| Baseline | 0ms (direct) |
| Tor | +200-500ms |
| Nym | +1000-5000ms |

### Anonymity Metrics

**IP Privacy:**
- Baseline:  Leaked
- Tor:  Hidden (exit node IP)
- Nym:  Hidden (exit gateway IP)

**Timing Attack Resistance:**
- Baseline:  Perfect correlation
- Tor: Vulnerable (latency ~constant)
- Nym:  Protected (high variance + mixing)

**Application Metadata:**
- All:  RPC provider sees queries

### Anonymity Set Size

**Tor:**
```
3 hops from ~7000 relays
But: guard nodes stable, exit nodes limited (~1000)
Effective anonymity set: smaller than theoretical
```

**Nym:**
```
3 layers × 80 nodes = 512,000 paths
Plus timing variance: essentially unlinkable
Scales exponentially as network grows
```

### Use Case Mapping

| Scenario | Recommendation |
|----------|---------------|
| Balance checks | Tor (speed matters) |
| High-value tx | Nym (MEV protection) |
| State surveillance | Nym (timing attack resistance) |
| General privacy | Tor (good enough) |

---

## Implementation Notes

### Where to Intercept in Kohaku

**Current architecture uses ethers.js JsonRpcProvider throughout.**

**Interception point:**
```typescript
// kohaku-commons or kohaku-extension
// Wrap JsonRpcProvider to route through privacy layer

class PrivacyProvider extends JsonRpcProvider {
    // Option 1: Tor mode
    // Option 2: Nym mode
    // Option 3: Hybrid (based on request type)
}
```

**Challenge:** Browser extensions can't directly use SOCKS proxy
- Need background script to proxy
- OR: Use WebRequest API to intercept/redirect
- OR: Run local proxy service

### Measurement Methodology

**Baseline Metrics:**
1. Capture all network requests (devtools)
2. Log: timestamp, method, params, response time
3. Identify correlations: which queries reveal address ownership?

**With Tor:**
1. Same metrics through Tor circuit
2. Measure: latency distribution, success rate
3. Test: can timing still correlate entry→exit?

**With Nym:**
1. Same metrics through mixnet
2. Measure: latency distribution (expect high variance)
3. Test: timing correlation impossible?

**Statistical Analysis:**
```python
def timing_correlation(entry_log, exit_log, window_ms):
    # For each entry packet, find matching exit packet
    # Success rate = metric for correlation attack
```

---

## Research Doc Structure

```markdown
# Privacy-Preserving RPC for Ethereum: Tor & Nym Comparative Study

## 1. Motivation & Threat Model
### 1.1 Who Needs This?
### 1.2 What We're Protecting Against
### 1.3 Ethical Framework

## 2. Metadata Leakage Analysis
### 2.1 Baseline (No Privacy)
[Empirical data from Kohaku/Ambire]
### 2.2 Seven-Layer Metadata Stack
### 2.3 Information-Theoretic Analysis
### 2.4 Account Abstraction Leakage
[New: Bundler, paymaster, relayer metadata]

## 3. Tor Integration
### 3.1 Architecture
### 3.2 Implementation Strategy
### 3.3 Circuit Management
### 3.4 Metadata Testing Results
### 3.5 Timing Attack Tests
### 3.6 Limitations

## 4. Nym Integration
### 4.1 Architecture
### 4.2 Sphinx Packet Deep Dive
### 4.3 Implementation Strategy
### 4.4 Metadata Testing Results
### 4.5 Timing Attack Tests
### 4.6 Limitations

## 5. Comparative Analysis
### 5.1 Latency Benchmarks
### 5.2 Anonymity Metrics
### 5.3 Cost-Benefit Analysis
### 5.4 Use Case Mapping

## 6. Future Directions
### 6.1 Incentivized Privacy Infrastructure
### 6.2 Private Information Retrieval

## 7. Conclusions
### 7.1 Recommendations by Threat Model
### 7.2 Open Problems

## References
```

---

## References & Resources

### Provided by User:

**Kohaku:**
- https://notes.ethereum.org/@niard/KohakuRoadmap
- https://github.com/ethereum/kohaku (Deepwiki MCP)
- https://github.com/ethereum/kohaku-extension (Deepwiki MCP)
- https://github.com/ethereum/kohaku-commons

**Tor:**
- https://blog.torproject.org/introducing-proof-of-work-defense-for-onion-services/
- https://gitlab.torproject.org/tpo/core/arti
- https://blog.wasabiwallet.website/explaining-wasabi-wallets-tor-implementation/
- https://www.whonix.org/wiki/Ethereum

**Coinjoin/Privacy:**
- https://petertodd.org/2025/coinjoin-comparison
- https://blog.wasabiwallet.website/future-wasabi-wallet/

**Wallets:**
- https://github.com/brumeproject/wallet
- https://github.com/torwalletxyz/wallet

**Ambire:**
- Extension: https://github.com/AmbireTech/extension
- Commons: https://github.com/AmbireTech/ambire-common

### Additional Context:

**Nym Documentation:**
- Mixnet architecture
- Sphinx packet format
- Traffic flow
- nym-socks5-client usage

**Academic Papers:**
- Loopix: Anonymity system with Poisson mixing
- Sphinx: Compact and provably secure mix format
- Traffic analysis attacks on Tor

---

## Critical Reminders for Implementation

**From User:**

1. **"dont rush into code. remember this is research first."**
   - Understand before implementing
   - Measure before concluding
   - Document everything

2. **"programming is a craft. not something we just finish for the sake of it."**
   - Quality over speed
   - Understand the why, not just the how

3. **"stop trying to just jump into code because we have a deadline."**
   - Deadline is for research demonstration
   - Not for shipping production code

4. **"dont hallucinate. stay grounded in cypherpunk."**
   - No speculation without evidence
   - Reference actual implementations
   - Cite sources

5. **"Privacy is a means to protect, not hide."**
   - Frame ethically
   - Legitimate use cases matter
   - Not facilitating crime

---

## Next Steps for Claude Code

### Immediate Tasks:

1. **Understand Ambire Architecture**
   - How does it handle RPC requests?
   - Where is JsonRpcProvider instantiated?
   - Can we use Tor or Nym without breaking existing functionality?
   - How would we modify to add privacy layer?

2. **Tor Integration Strategy**
   - Research: Firefox extension + SOCKS proxy
   - Test: Can extension communicate with localhost:9050?
   - Implement: Privacy provider wrapper

3. **Metadata Measurement**
   - Baseline: Capture all requests from current Kohaku
   - Document: What metadata is visible at each layer
   - Test: Correlation attacks on timing

4. **Nym Integration Strategy**
   - Research: nym-socks5-client setup
   - Test: Latency characteristics
   - Implement: Same provider wrapper, different backend

5. **Comparative Benchmarks**
   - P50, P95, P99 latencies for each method
   - Success rates
   - Anonymity set calculations

### Tools Available:

- **deepwiki.com MCP:** Access repo structure and documentation
  Available Tools
    The DeepWiki MCP server offers three main tools:

    read_wiki_structure - Get a list of documentation topics for a GitHub repository
    read_wiki_contents - View documentation about a GitHub repository
    ask_question - Ask any question about a GitHub repository and get an AI-powered, context-grounded response

- **Project Knowledge:** Separate MDs with context (Read first. Only first two exist at start. Feel free to edit into the others as you learn to preserve context. Remember to refer back when needed.)
  - **This HACK.md:** Hackathon rules
  - **This IDEAS.md:** Bounty ideas for Logos x Tor Track
  - **This TOR.md:** Tor architecture and attacks
  - **This NYM.md:** Nym mixnet details
  - **This KOH.md:** Kohaku wallet architecture
  - **This AA.md:** Account Abstraction privacy issues
  - **This METADATA.md:** Metadata leakage theory
  - **This MEASURE.md:** Measurement methodologies
- **This CLAUDE.md:** Complete research context
- **File Read:** Read any file
- **File Write:** Write to any file
- **Terminal:** Run shell commands
- **Fetch:** Search the web 
- **GitHub MCP:** Access public GitHub repos
- If you want access to anything else, ask the user. (eg. network logs from extension, specific papers, etc.)



Keep asking the user the time to stay on schedule.

---

## Open Questions to Investigate

1. **Account Abstraction Privacy:**
   - How to hide UserOps from bundlers?
   - Can paymasters preserve privacy?
   - Is AA fundamentally incompatible with metadata privacy?

2. **Hybrid Routing:**
   - Can we route different requests through different networks?
   - How to decide: Tor vs Nym?
   - What about fallback when one fails?

3. **Private RPC Infrastructure:**
   - Incentivized .onion/.nym RPC nodes
   - Decentralized registry
   - Multi-path querying (query 3 RPCs, compare)

4. **Future Primitives:**
   - Private Information Retrieval for balance checks
   - zk-RPC (prove you made query without revealing which)
   - P2P transaction broadcast (bypass RPC entirely)

---

## User Edits & Updates

*(User will edit this section as research progresses)*

**Latest Findings:**

[User adds findings here]

**Architecture Updates:**

[User documents any new discoveries about Kohaku structure]

**Measurement Results:**

[User adds empirical data]

---

**Remember:** This is a research demonstration showing rigorous privacy analysis, not a production implementation. Quality of analysis matters more than quantity of code.