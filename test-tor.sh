#!/bin/bash

echo "=== Tor Connectivity Test ==="
echo ""

# Test if Tor service is running
echo "1. Checking if Tor service is running..."
if systemctl is-active --quiet tor 2>/dev/null || rc-service tor status 2>/dev/null | grep -q "started"; then
    echo "   ✓ Tor service is running"
else
    echo "   ✗ Tor service is NOT running"
    echo "   Run: sudo rc-service tor start"
    exit 1
fi
echo ""

# Test SOCKS5 port (9050)
echo "2. Testing SOCKS5 proxy (port 9050)..."
if netstat -tln | grep -q "127.0.0.1:9050"; then
    echo "   ✓ Port 9050 is listening"

    # Try to connect through SOCKS proxy
    echo "   Testing connection through Tor..."
    RESULT=$(curl --socks5 127.0.0.1:9050 -s -m 10 https://check.torproject.org/api/ip 2>&1)

    if echo "$RESULT" | grep -q '"IsTor".*true'; then
        echo "   ✓ Successfully connected through Tor!"
        echo "   Response: $RESULT"
    else
        echo "   ✗ Connection failed or not using Tor"
        echo "   Response: $RESULT"
    fi
else
    echo "   ✗ Port 9050 is NOT listening"
    exit 1
fi
echo ""

# Test Control port (9051)
echo "3. Testing Control port (port 9051)..."
if netstat -tln | grep -q "127.0.0.1:9051"; then
    echo "   ✓ Port 9051 is listening"

    # Check authentication requirements
    echo "   Testing control port access..."
    AUTH_RESULT=$(echo -e "AUTHENTICATE \"\"\nQUIT" | nc -w 2 127.0.0.1 9051 2>&1)

    if echo "$AUTH_RESULT" | grep -q "250 OK"; then
        echo "   ✓ Control port accessible (no auth required)"
    elif echo "$AUTH_RESULT" | grep -q "515"; then
        echo "   ⚠ Control port accessible but authentication failed"
        echo "   This is normal - authentication needs to be configured"
    elif echo "$AUTH_RESULT" | grep -q "514"; then
        echo "   ⚠ Control port requires authentication"
        echo "   Check /etc/tor/torrc for authentication settings"
    else
        echo "   ? Unknown response: $AUTH_RESULT"
    fi

    # Show torrc control port settings
    echo ""
    echo "   Control port settings in /etc/tor/torrc:"
    if [ -f /etc/tor/torrc ]; then
        grep -E "^(ControlPort|CookieAuthentication|HashedControlPassword)" /etc/tor/torrc 2>/dev/null || echo "   No control port settings found"
    else
        echo "   /etc/tor/torrc not found"
    fi
else
    echo "   ✗ Port 9051 is NOT listening"
    echo "   Control port is not enabled in /etc/tor/torrc"
    echo ""
    echo "   To enable control port, add to /etc/tor/torrc:"
    echo "   ControlPort 9051"
    echo "   CookieAuthentication 0"
    echo ""
    echo "   Then restart: sudo rc-service tor restart"
fi
echo ""

# Test extension connectivity
echo "4. Testing what the extension will see..."
echo "   The extension uses fetch() through SOCKS proxy via browser.proxy.onRequest"
echo "   Port 9050: $(netstat -tln | grep -q "127.0.0.1:9050" && echo "✓ Ready" || echo "✗ Not available")"
echo ""

echo "=== Summary ==="
if netstat -tln | grep -q "127.0.0.1:9050" && curl --socks5 127.0.0.1:9050 -s -m 10 https://check.torproject.org/api/ip 2>&1 | grep -q '"IsTor".*true'; then
    echo "✓ Tor SOCKS5 proxy is working correctly"
    echo "✓ The extension should be able to route requests through Tor"
else
    echo "✗ Tor SOCKS5 proxy is NOT working correctly"
    echo "✗ The extension will not be able to use Tor"
fi
