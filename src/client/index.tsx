import "./styles.css";

import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import createGlobe from "cobe";
import usePartySocket from "partysocket/react";
import { motion, AnimatePresence } from "framer-motion";

// The type of messages we'll be receiving from the server
import type { OutgoingMessage } from "../shared";
import type { LegacyRef } from "react";

function App() {
  const canvasRef = useRef<HTMLCanvasElement>();
  const [counter, setCounter] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [recentConnections, setRecentConnections] = useState<string[]>([]);
  
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
        
        // Add to recent connections with timeout
        setRecentConnections(prev => [...prev, message.position.id]);
        setTimeout(() => {
          setRecentConnections(prev => prev.filter(id => id !== message.position.id));
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
      <motion.div 
        className="globe-container"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1 }}
      >
        <motion.h1 
          className="title"
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          transition={{ 
            duration: 2,
            repeat: Infinity,
            repeatType: "reverse"
          }}
        >
          Global Connections
          <motion.span 
            className="pulse-dot"
            animate={{ 
              scale: [1, 1.2, 1],
              opacity: [0.8, 1, 0.8]
            }}
            transition={{ 
              duration: 2,
              repeat: Infinity 
            }}
          />
        </motion.h1>

        <AnimatePresence>
          {counter > 0 && (
            <motion.p 
              className="counter"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              key={counter}
            >
              <span className="highlight">{counter}</span> {counter === 1 ? "person is" : "people are"} connected right now
            </motion.p>
          )}
        </AnimatePresence>

        <motion.div
          onHoverStart={() => setIsHovered(true)}
          onHoverEnd={() => setIsHovered(false)}
          whileHover={{ scale: 1.02 }}
        >
          <canvas
            ref={canvasRef as LegacyRef<HTMLCanvasElement>}
            className="globe-canvas"
          />
        </motion.div>

        <div className="recent-connections">
          <AnimatePresence>
            {recentConnections.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="connection-notice"
              >
                New connection from {recentConnections[0].slice(0, 6)}...
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <motion.div 
          className="footer"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.7 }}
          transition={{ delay: 1 }}
          whileHover={{ opacity: 1 }}
        >
          <p>
            Powered by <a href="https://visitor-globe-worker.jessejesse.workers.dev/" target="_blank" rel="noopener">JesseJesse.Workers.dev</a>
          </p>
          <p className="hint">Hover over the globe to slow rotation</p>
        </motion.div>
      </motion.div>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
