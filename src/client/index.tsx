import "./styles.css";

import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import createGlobe from "cobe";
import usePartySocket from "partysocket/react";

// The type of messages we'll be receiving from the server
import type { OutgoingMessage } from "../shared";
import type { LegacyRef } from "react";

function App() {
  const canvasRef = useRef<HTMLCanvasElement>();
  const [counter, setCounter] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [recentConnection, setRecentConnection] = useState<string | null>(null);
  
  const positions = useRef<
    Map<
      string,
      {
        location: [number, number];
        size: number;
      }
    >
  >(new Map());

  const socket = usePartySocket({
    room: "default",
    party: "globe",
    onMessage(evt) {
      const message = JSON.parse(evt.data as string) as OutgoingMessage;
      if (message.type === "add-marker") {
        positions.current.set(message.position.id, {
          location: [message.position.lat, message.position.lng],
          size: message.position.id === socket.id ? 0.15 : 0.08,
        });
        setCounter((c) => c + 1);
        
        // Show recent connection notification
        setRecentConnection(message.position.id);
        setTimeout(() => {
          setRecentConnection(null);
        }, 3000);
      } else {
        positions.current.delete(message.id);
        setCounter((c) => c - 1);
      }
    },
  });

  useEffect(() => {
    let phi = 0;
    let rotationSpeed = 0.01;

    const globe = createGlobe(canvasRef.current as HTMLCanvasElement, {
      devicePixelRatio: 2,
      width: 600 * 2,
      height: 600 * 2,
      phi: 0,
      theta: 0.3,
      dark: 1,
      diffuse: 1.2,
      mapSamples: 20000,
      mapBrightness: 8,
      baseColor: [0.2, 0.2, 0.25],
      markerColor: [1, 0.5, 0.3],
      glowColor: [0.8, 0.8, 0.8],
      markers: [],
      opacity: 0.9,
      onRender: (state) => {
        state.markers = [...positions.current.values()];
        
        // Adjust rotation speed based on hover
        rotationSpeed = isHovered ? 0.005 : 0.01;
        phi += rotationSpeed;
        
        // Add slight bobbing effect
        state.theta = 0.3 + Math.sin(phi * 2) * 0.05;
        state.phi = phi;
      },
    });

    return () => globe.destroy();
  }, [isHovered]);

  return (
    <div className="app-container">
      <div className="globe-container">
        <h1 className="title">
          Global Connections
          <span className="pulse-dot" />
        </h1>

        {counter > 0 ? (
          <p className="counter">
            <span className="highlight">{counter}</span> {counter === 1 ? "person is" : "people are"} connected right now
          </p>
        ) : (
          <p className="counter-placeholder">&nbsp;</p>
        )}

        <div
          className={`globe-wrapper ${isHovered ? 'hovered' : ''}`}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <canvas
            ref={canvasRef as LegacyRef<HTMLCanvasElement>}
            className="globe-canvas"
          />
        </div>

        {recentConnection && (
          <div className="connection-notice">
            New connection from {recentConnection.slice(0, 6)}...
          </div>
        )}

        <div className="footer">
          <p>
            Powered by <a href="https://visitor-globe-worker.jessejesse.workers.dev/" target="_blank" rel="noopener">JesseJesse.Workers.dev</a>
          </p>
          <p className="hint">Hover over the globe to slow rotation</p>
        </div>
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
