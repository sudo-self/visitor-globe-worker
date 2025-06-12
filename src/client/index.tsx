import "./styles.css";
import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import createGlobe from "cobe";
import usePartySocket from "partysocket/react";

interface Position {
  location: [number, number];
  size: number;
}

interface OutgoingMessage {
  type: string;
  id?: string;
  position?: {
    id: string;
    lat: number;
    lng: number;
  };
}

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [counter, setCounter] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [recentConnection, setRecentConnection] = useState<string | null>(null);
  
  const positions = useRef<Map<string, Position>>(new Map());

  const socket = usePartySocket({
    room: "default",
    host: "https://visitor-globe-worker.jessejesse.workers.dev",
    onMessage(evt) {
      try {
        const message = JSON.parse(evt.data) as OutgoingMessage;
        if (message.type === "add-marker" && message.position) {
          positions.current.set(message.position.id, {
            location: [message.position.lat, message.position.lng],
            size: message.position.id === socket.id ? 0.15 : 0.08,
          });
          setCounter((c) => c + 1);
          setRecentConnection(message.position.id);
          setTimeout(() => setRecentConnection(null), 3000);
        } else if (message.id) {
          positions.current.delete(message.id);
          setCounter((c) => c - 1);
        }
      } catch (error) {
        console.error("Error parsing message:", error);
      }
    },
  });

  useEffect(() => {
    if (!canvasRef.current) return;

    let phi = 0;
    let rotationSpeed = 0.01;
    let globe: ReturnType<typeof createGlobe>;

    const initGlobe = () => {
      globe = createGlobe(canvasRef.current!, {
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
          state.markers = Array.from(positions.current.values());
          rotationSpeed = isHovered ? 0.005 : 0.01;
          phi += rotationSpeed;
          state.theta = 0.3 + Math.sin(phi * 2) * 0.05;
          state.phi = phi;
        },
      });
    };

    initGlobe();

    return () => {
      if (globe) globe.destroy();
    };
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
          className={`canvas-wrapper ${isHovered ? "hovered" : ""}`}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <canvas
            ref={canvasRef}
            className="globe-canvas"
            width={1200}
            height={1200}
          />
        </div>

        {recentConnection && (
          <div className="connection-notice">
            New connection from {recentConnection.slice(0, 6)}...
          </div>
        )}

        <div className="footer">
          <p>
            Powered by <a href="https://visitor-globe-worker.jessejesse.workers.dev/" target="_blank" rel="noopener noreferrer">JesseJesse.Workers.dev</a>
          </p>
          <p className="hint">Hover over the globe to slow rotation</p>
        </div>
      </div>
    </div>
  );
}

// Render the app
const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}






