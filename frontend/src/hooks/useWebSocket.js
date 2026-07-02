// frontend/src/hooks/useWebSocket.js

import { useEffect, useRef } from "react";

const WS_BASE = import.meta.env.VITE_WS_URL || "ws://localhost:8000";

// How long to wait before trying to reconnect after a dropped connection.
// For example if the user's wifi cuts out briefly, we don't want to just
// give up — we wait 3 seconds then try again automatically.
const RECONNECT_DELAY_MS = 3000;

/**
 * A simple reusable hook that:
 * 1. Opens a WebSocket connection to the given URL
 * 2. Calls onMessage(data) every time the server pushes something
 * 3. Automatically reconnects if the connection drops
 * 4. Closes cleanly when the component unmounts
 *
 * url      - the WebSocket URL to connect to (null = don't connect yet)
 * onMessage - function to call with parsed JSON data when a message arrives
 */
export function useWebSocket(url, onMessage) {
    // useRef stores the WebSocket instance without causing re-renders
    // when it changes — perfect for this since we don't want the whole
    // component to re-render just because we reconnected.
    const socketRef = useRef(null);
    const reconnectTimer = useRef(null);

    // We store onMessage in a ref too, so that if the parent component
    // passes a new function reference on every render (which React
    // components often do), we always call the latest version without
    // needing to restart the WebSocket connection.
    const onMessageRef = useRef(onMessage);
    useEffect(() => {
        onMessageRef.current = onMessage;
    }, [onMessage]);

    useEffect(() => {
        // If no URL is provided yet (e.g. waiting for a token to load),
        // don't try to connect — just do nothing.
        if (!url) return;

        function connect() {
            // Close any existing connection before opening a new one
            if (socketRef.current) {
                socketRef.current.close();
            }

            const socket = new WebSocket(url);
            socketRef.current = socket;

            socket.onopen = () => {
                // Connection successfully opened — clear any pending
                // reconnect timer since we're connected now.
                if (reconnectTimer.current) {
                    clearTimeout(reconnectTimer.current);
                    reconnectTimer.current = null;
                }
            };

            socket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    onMessageRef.current(data);
                } catch {
                    // If the server sends something that isn't valid JSON,
                    // just ignore it — don't crash the whole UI.
                }
            };

            socket.onclose = () => {
                // Connection dropped — schedule a reconnect attempt.
                // This handles things like server restarts or brief
                // network interruptions automatically.
                reconnectTimer.current = setTimeout(connect, RECONNECT_DELAY_MS);
            };

            socket.onerror = () => {
                // On error, close the socket — this triggers onclose
                // above, which then schedules the reconnect.
                socket.close();
            };
        }

        connect();

        // Cleanup function — runs when the component unmounts or when
        // the URL changes. Closes the socket cleanly and cancels any
        // pending reconnect timer so we don't leak connections.
        return () => {
            if (reconnectTimer.current) {
                clearTimeout(reconnectTimer.current);
            }
            if (socketRef.current) {
                socketRef.current.close();
                socketRef.current = null;
            }
        };
    }, [url]);
}