#!/usr/bin/env python3
"""
Tor Control Port Bridge - Native Messaging Host

This script allows the browser extension to communicate with Tor control port (9051)
since browser extensions cannot directly open TCP sockets.

Installation:
1. Make executable: chmod +x tor-control-bridge.py
2. Install native messaging manifest (see tor-control-bridge.json)

Protocol:
- Input: JSON from extension via stdin
- Output: JSON response to extension via stdout
"""

import sys
import json
import socket
import struct

def send_message(message):
    """Send a message to the extension"""
    encoded_message = json.dumps(message).encode('utf-8')
    sys.stdout.buffer.write(struct.pack('I', len(encoded_message)))
    sys.stdout.buffer.write(encoded_message)
    sys.stdout.buffer.flush()

def read_message():
    """Read a message from the extension"""
    raw_length = sys.stdin.buffer.read(4)
    if not raw_length:
        return None
    message_length = struct.unpack('I', raw_length)[0]
    message = sys.stdin.buffer.read(message_length).decode('utf-8')
    return json.loads(message)

def send_tor_command(command, host='127.0.0.1', port=9051):
    """Send a command to Tor control port and return response"""
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(5)
        sock.connect((host, port))

        # Authenticate first (required for each new connection)
        if command != 'AUTHENTICATE':
            sock.sendall(b"AUTHENTICATE\r\n")
            auth_response = b''
            while True:
                chunk = sock.recv(1024)
                if not chunk:
                    break
                auth_response += chunk
                if b'250 OK' in auth_response:
                    break

            if b'250 OK' not in auth_response:
                sock.close()
                return {'success': False, 'error': 'Authentication failed'}

        # Send actual command
        sock.sendall(f"{command}\r\n".encode('utf-8'))

        # Read response
        response = b''
        while True:
            chunk = sock.recv(1024)
            if not chunk:
                break
            response += chunk
            # Check if we got a complete response (ends with "250 OK\r\n" or similar)
            if b'\r\n' in response and (b'250 OK' in response or b'250-' in response or b'250+' in response):
                # For multi-line responses, check if we reached the end
                lines = response.decode('utf-8').split('\r\n')
                if any(line.startswith('250 ') and not line.startswith('250-') and not line.startswith('250+') for line in lines):
                    break

        sock.close()
        return {'success': True, 'response': response.decode('utf-8')}

    except Exception as e:
        return {'success': False, 'error': str(e)}

def main():
    """Main loop for native messaging"""
    # Log to stderr (stdout is reserved for messaging)
    sys.stderr.write('[TorControlBridge] Starting...\n')
    sys.stderr.flush()

    while True:
        try:
            message = read_message()
            if message is None:
                break

            sys.stderr.write(f'[TorControlBridge] Received: {message}\n')
            sys.stderr.flush()

            command = message.get('command')
            if not command:
                send_message({'success': False, 'error': 'No command specified'})
                continue

            result = send_tor_command(command)
            send_message(result)

        except Exception as e:
            sys.stderr.write(f'[TorControlBridge] Error: {e}\n')
            sys.stderr.flush()
            send_message({'success': False, 'error': str(e)})

if __name__ == '__main__':
    main()
