import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LandingProps {
  onEnter: () => void;
}

const Landing = ({ onEnter }: LandingProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ 
      canvas: canvasRef.current, 
      alpha: true, 
      antialias: true 
    });
    
    const updateSize = () => {
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
    };
    
    updateSize();

    // Neural Brain structure
    const brainGroup = new THREE.Group();
    scene.add(brainGroup);

    const nodeCount = 140;
    const nodes: THREE.Mesh[] = [];
    const positions: THREE.Vector3[] = [];
    
    const nodeGeometry = new THREE.SphereGeometry(0.04, 8, 8);
    const nodeMaterial = new THREE.MeshBasicMaterial({ color: 0x00f2ff });

    for (let i = 0; i < nodeCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos((Math.random() * 2) - 1);
      let r = 2.5;
      
      const x = r * Math.sin(phi) * Math.cos(theta);
      let y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);
      
      y *= 1.4; // head-like stretch
      const narrowFactor = (y + 3) / 6;
      const finalX = x * (0.6 + 0.4 * narrowFactor);
      const finalZ = z * (0.6 + 0.4 * narrowFactor);

      const pos = new THREE.Vector3(finalX, y, finalZ);
      positions.push(pos);

      const node = new THREE.Mesh(nodeGeometry, nodeMaterial);
      node.position.copy(pos);
      brainGroup.add(node);
      nodes.push(node);
    }

    const lineMaterial = new THREE.LineBasicMaterial({ 
      color: 0x7000ff, 
      transparent: true, 
      opacity: 0.12 
    });

    for (let i = 0; i < nodeCount; i++) {
      let c = 0;
      for (let j = i + 1; j < nodeCount && c < 3; j++) {
        if (positions[i].distanceTo(positions[j]) < 1.6) {
          const geometry = new THREE.BufferGeometry().setFromPoints([positions[i], positions[j]]);
          const line = new THREE.Line(geometry, lineMaterial);
          brainGroup.add(line);
          c++;
        }
      }
    }

    // Particle Background
    const particleCount = 300;
    const particlesGeometry = new THREE.BufferGeometry();
    const particlePosArray = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount * 3; i++) {
      particlePosArray[i] = (Math.random() - 0.5) * 50;
    }

    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(particlePosArray, 3));
    const particlesMaterial = new THREE.PointsMaterial({
      color: 0x00f2ff,
      size: 0.05,
      transparent: true,
      opacity: 0.2
    });

    const particleSystem = new THREE.Points(particlesGeometry, particlesMaterial);
    scene.add(particleSystem);

    camera.position.z = 10;

    let mouseX = 0;
    let mouseY = 0;
    const handleMouseMove = (e: MouseEvent) => {
      mouseX = (e.clientX / window.innerWidth) - 0.5;
      mouseY = (e.clientY / window.innerHeight) - 0.5;
    };
    window.addEventListener('mousemove', handleMouseMove);

    let frame = 0;
    const animate = () => {
      frame = requestAnimationFrame(animate);
      const time = Date.now() * 0.001;

      brainGroup.rotation.y += 0.003;
      brainGroup.rotation.x = Math.sin(time * 0.4) * 0.1;

      scene.rotation.y += (mouseX * 0.15 - scene.rotation.y) * 0.05;
      scene.rotation.x += (mouseY * 0.15 - scene.rotation.x) * 0.05;

      nodes.forEach((node, i) => {
        const s = 1 + Math.sin(time * 2 + i) * 0.3;
        node.scale.set(s, s, s);
      });

      particleSystem.rotation.y += 0.0004;
      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => updateSize();
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      renderer.dispose();
      scene.clear();
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-[#010208] text-white">
      <canvas ref={canvasRef} className="absolute inset-0 z-0 opacity-70" />
      <div className="absolute inset-0 z-[1] bg-gradient-to-b from-transparent to-black/40 pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-4xl animate-in fade-in duration-1000">
        <div className="mb-10 space-y-4">
          <h1 className="text-7xl md:text-9xl font-bold tracking-tighter text-white drop-shadow-[0_0_30px_rgba(0,242,255,0.3)]">
            CryptoSense
          </h1>
          <p className="text-cyan-400 text-sm md:text-base font-medium tracking-[0.4em] uppercase opacity-80">
            AI-Powered Crypto Intelligence
          </p>
        </div>

        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 to-purple-600 rounded-full blur opacity-25 group-hover:opacity-75 transition duration-500" />
          <Button 
            onClick={onEnter}
            size="lg"
            className="relative px-12 py-8 rounded-full bg-black/40 border border-white/10 backdrop-blur-2xl hover:bg-black/60 hover:border-cyan-500/50 transition-all duration-500 group overflow-hidden"
          >
            <div className="flex items-center gap-4">
              <span className="text-xl font-semibold tracking-tight text-white group-hover:text-cyan-100 transition-colors">
                Enter App
              </span>
              <ArrowRight className="w-6 h-6 text-cyan-400 group-hover:translate-x-2 transition-transform duration-500" />
            </div>
          </Button>
        </div>

        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 opacity-20 text-[10px] uppercase tracking-[0.5em] whitespace-nowrap hidden md:block">
          Neural Network Initialized // Crypto Intelligence Active
        </div>
      </div>
    </div>
  );
};

export default Landing;
