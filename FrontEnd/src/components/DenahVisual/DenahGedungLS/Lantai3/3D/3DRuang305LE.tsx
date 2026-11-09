'use client';

import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, MeshReflectorMaterial } from "@react-three/drei";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

/* ============================================================================
   RUANG 805 SFD  —  rekonstruksi 3D dari foto (orang & barang bergerak dihapus)

   Hasil analisis foto:
   - Meja komputer HITAM (wenge, kaki bulat abu-abu, 1 meja = 1 PC GEAR + monitor
     GEAR, PC tower di kolong kanan, laci keyboard) berderet 3 sisi:
       dinding kiri 7 meja | dinding jendela 5 meja | dinding kanan 7 meja
     kursi Chiko merah (rangka chrome). Kursi paling depan di dinding kiri = hijau muda.
   - Meja KAYU (beech) membentuk huruf U di tengah: 2 meja di sisi jendela (penutup U),
     kolom kiri 4 meja, kolom kanan 4 meja. Meja proyektor BenQ berdiri terpisah dekat meja dosen.
     Kursi plastik putih-hijau (kaki sled chrome) di SISI LUAR U.
   - Meja dosen hitam (monitor + speaker + UPS) nempel di ujung kolom kanan,
     kursi jaring hitam. Sisi kiri depan kosong = jalan masuk dari pintu.
   - Dinding depan: pintu ganda kayu (daun kecil tertutup + daun besar kebuka),
     jendela kaca kecil (clerestory) ke koridor, layar proyektor tripod putih,
     panel saklar, stiker dilarang makan minum.
   - Dinding belakang: jendela kaca penuh dengan blind putih motif diamond.
   - Rak jaringan terbuka (open rack) di pojok belakang-kanan.
   - Plafon: panel LED panjang + 2 AC cassette (ada tag merah) + speaker plafon + CCTV dome.
   - Lantai: keramik besar putih krem glossy.
   Semua ukuran bisa diubah di konstanta di bawah.
   Install: npm i three @react-three/fiber @react-three/drei  (+ @types/three)
   ============================================================================ */

type V3 = [number, number, number];

// ===== ukuran ruangan (meter) =====
const W = 8.0; // lebar (x)
const D = 9.6; // panjang (z). jendela di z = -D/2, layar + pintu di z = +D/2
const H = 2.8; // tinggi plafon
const HX = W / 2;
const HZ = D / 2;
const WIN_Y0 = 0.7; // bawah jendela (sesuai foto)
const WIN_Y1 = 2.55; // atas jendela
const DOOR_X0 = -3.5; // pintu di dinding depan, sisi kiri (x negatif)
const DOOR_X1 = -1.6;
const DOOR_H = 2.1;
const SCREEN_X = 0.6; // posisi layar proyektor
const DESK_W = 1.0; // lebar meja hitam
const WOOD_W = 1.05; // lebar meja kayu

// ===== posisi (x, z) sesuai foto asli =====
const TEACHER_DESK: [number, number] = [0.975, 1.95]; // meja dosen hitam, MEPET ujung kolom meja kayu (kursi hijau), menghadap kelas
const TEACHER_CHAIR: [number, number] = [0.95, 2.55]; // kursi dosen di sisi dinding, menghadap ke kelas
const PROJ_DESK: [number, number] = [-0.275, 1.95]; // meja kayu proyektor, mepet di sisi KANAN meja dosen (dilihat dari belakang ruangan)
const LIGHT = 0.7; // pengali kecerahan ruangan (naikkan kalau mau lebih terang)

// ===== opsi =====
const SHOW_STORAGE = true; // kardus ASUS & bin plastik di pojok depan (ada di foto)
const GLOSSY_FLOOR = true; // pantulan di lantai (agak berat; set false kalau lag)

/* ----------------------------------------------------------------------------
   helper umum
---------------------------------------------------------------------------- */
function rng(seed: number) {
  let s = seed;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

function mkCanvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return { c, g: c.getContext("2d")! };
}

function toTex(c: HTMLCanvasElement, repeat?: [number, number]) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if (repeat) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeat[0], repeat[1]);
  }
  return t;
}

function grainTex(base: string, streak: string, seed: number, w = 1024, h = 256) {
  const { c, g } = mkCanvas(w, h);
  g.fillStyle = base;
  g.fillRect(0, 0, w, h);
  const r = rng(seed);
  for (let i = 0; i < 240; i++) {
    const y = r() * h;
    g.strokeStyle = streak;
    g.globalAlpha = 0.05 + r() * 0.2;
    g.lineWidth = 0.6 + r() * 2.4;
    g.beginPath();
    g.moveTo(0, y);
    g.bezierCurveTo(w * 0.3, y + (r() - 0.5) * 8, w * 0.65, y + (r() - 0.5) * 8, w, y + (r() - 0.5) * 5);
    g.stroke();
  }
  g.globalAlpha = 1;
  return toTex(c);
}

function floorCanvas() {
  // keramik motif marmer: dasar krem, awan lembut, urat coklat/abu tebal + urat emas
  const S = 2048, N = 2, T = S / N;
  const { c, g } = mkCanvas(S, S);
  const r = rng(11);
  const base: [string, string][] = [
    ["#e9dec9", "#d9cbb1"],
    ["#e6dac4", "#d4c5a9"],
    ["#ebe1ce", "#dccfb7"],
  ];
  const COL = { brown: "118,92,66", grey: "104,108,116", gold: "200,158,64" };
  for (let i = 0; i < N; i++)
    for (let j = 0; j < N; j++) {
      const x = i * T, y = j * T;
      g.save();
      g.beginPath();
      g.rect(x, y, T, T);
      g.clip();
      const pal = base[Math.floor(r() * base.length)];
      const grd = g.createLinearGradient(x, y, x + T, y + T);
      grd.addColorStop(0, pal[0]);
      grd.addColorStop(1, pal[1]);
      g.fillStyle = grd;
      g.fillRect(x, y, T, T);
      // awan lembut (gelap & terang)
      for (let k = 0; k < 22; k++) {
        const bx = x + r() * T, by = y + r() * T, br = T * (0.12 + r() * 0.3);
        const rg = g.createRadialGradient(bx, by, 0, bx, by, br);
        const dark = r() > 0.4;
        rg.addColorStop(0, dark ? `rgba(150,122,90,${0.12 + r() * 0.12})` : `rgba(255,252,244,${0.3 + r() * 0.25})`);
        rg.addColorStop(1, "rgba(255,255,255,0)");
        g.fillStyle = rg;
        g.fillRect(bx - br, by - br, br * 2, br * 2);
      }
      // urat marmer: random walk, digambar 2 lapis (halo lebar lembut + inti tajam)
      const vein = (sx: number, sy: number, ang: number, steps: number, w: number, a: number, col: string, depth: number) => {
        g.lineCap = "round";
        g.lineJoin = "round";
        g.beginPath();
        let px = sx, py = sy, an = ang;
        g.moveTo(px, py);
        const branches: [number, number, number][] = [];
        for (let s = 0; s < steps; s++) {
          an += (r() - 0.5) * 0.75;
          px += Math.cos(an) * (T / 30);
          py += Math.sin(an) * (T / 30);
          g.lineTo(px, py);
          if (depth < 2 && r() < 0.07) branches.push([px, py, an]);
        }
        g.strokeStyle = `rgba(${col},${a * 0.16})`;
        g.lineWidth = w * 3;
        g.stroke();
        g.strokeStyle = `rgba(${col},${a})`;
        g.lineWidth = w;
        g.stroke();
        for (const [bx, by, ba] of branches)
          vein(bx, by, ba + (r() > 0.5 ? 1 : -1) * (0.5 + r() * 0.6), Math.floor(steps * 0.45), w * 0.6, a * 0.85, col, depth + 1);
      };
      const edgeStart = () => {
        const sx = x + r() * T;
        const top = r() > 0.5;
        const sy = top ? y - 10 : y + T + 10;
        const ang = (top ? Math.PI / 2 : -Math.PI / 2) + (r() - 0.5) * 1.2;
        return [sx, sy, ang] as const;
      };
      for (let v = 0; v < 2; v++) {
        const [sx, sy, ang] = edgeStart();
        vein(sx, sy, ang, 34, 2 + r() * 2, 0.2 + r() * 0.1, r() > 0.6 ? COL.grey : COL.brown, 0);
      }
      for (let v = 0; v < 1 + Math.floor(r() * 2); v++) {
        const [sx, sy, ang] = edgeStart();
        vein(sx, sy, ang, 34, 2 + r() * 1.5, 0.4, COL.gold, 0);
      }
      for (let v = 0; v < 3; v++) vein(x + r() * T, y + r() * T, r() * Math.PI * 2, 14, 1.5, 0.14, r() > 0.5 ? COL.grey : COL.brown, 2);
      g.restore();
      g.strokeStyle = "rgba(176,164,144,0.95)";
      g.lineWidth = 5;
      g.strokeRect(x, y, T, T);
    }
  return c;
}

// panel lattice jendela: motif diamond putih
function latticeTex(repX: number, repY: number) {
  const S = 256;
  const { c, g } = mkCanvas(S, S);
  g.fillStyle = "#f7f8f7";
  g.fillRect(0, 0, S, S);
  const diamond = (inset: number) => {
    g.beginPath();
    g.moveTo(S / 2, inset);
    g.lineTo(S - inset, S / 2);
    g.lineTo(S / 2, S - inset);
    g.lineTo(inset, S / 2);
    g.closePath();
  };
  diamond(14);
  g.fillStyle = "#d5dce2";
  g.fill();
  diamond(34);
  g.fillStyle = "#e9eef2";
  g.fill();
  diamond(8);
  g.strokeStyle = "rgba(150,158,166,0.9)";
  g.lineWidth = 3;
  g.stroke();
  return toTex(c, [repX, repY]);
}

function screenTex() {
  const { c, g } = mkCanvas(256, 144);
  const gr = g.createLinearGradient(0, 0, 256, 144);
  gr.addColorStop(0, "#1b1e23");
  gr.addColorStop(0.45, "#0b0c0f");
  gr.addColorStop(1, "#15171b");
  g.fillStyle = gr;
  g.fillRect(0, 0, 256, 144);
  return toTex(c);
}

function textTex(text: string, color: string, w = 256, h = 64, font = "bold 40px Arial") {
  const { c, g } = mkCanvas(w, h);
  g.clearRect(0, 0, w, h);
  g.fillStyle = color;
  g.font = font;
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(text, w / 2, h / 2 + 2);
  return toTex(c);
}

function pcFrontTex() {
  const { c, g } = mkCanvas(256, 540);
  g.fillStyle = "#18191c";
  g.fillRect(0, 0, 256, 540);
  g.fillStyle = "#222428";
  g.fillRect(20, 28, 216, 40);
  g.fillRect(20, 78, 216, 40);
  g.fillStyle = "#0d0e10";
  g.fillRect(30, 38, 196, 20);
  g.fillRect(30, 88, 196, 20);
  g.fillStyle = "#2e6fd6";
  g.fillRect(30, 150, 22, 12);
  g.fillRect(58, 150, 22, 12);
  g.fillStyle = "#6cc36c";
  g.beginPath();
  g.arc(100, 156, 6, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = "#e68fb0";
  g.beginPath();
  g.arc(122, 156, 6, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = "#8a8d92";
  g.beginPath();
  g.arc(206, 156, 13, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = "#18191c";
  g.beginPath();
  g.arc(206, 156, 9, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = "#222428";
  g.lineWidth = 2;
  for (let y = 200; y < 430; y += 8) {
    g.beginPath();
    g.moveTo(24, y);
    g.lineTo(232, y);
    g.stroke();
  }
  g.strokeStyle = "#d9dbde";
  g.lineWidth = 5;
  g.beginPath();
  g.arc(70, 490, 18, 0.3, Math.PI * 2 - 0.4);
  g.stroke();
  g.fillStyle = "#d9dbde";
  g.font = "bold 40px Arial";
  g.textAlign = "left";
  g.textBaseline = "middle";
  g.fillText("GEAR", 98, 492);
  return toTex(c);
}

function labelTex(n: number) {
  const { c, g } = mkCanvas(128, 64);
  g.fillStyle = "#f4f4f2";
  g.fillRect(0, 0, 128, 64);
  g.strokeStyle = "#999";
  g.lineWidth = 3;
  g.strokeRect(1, 1, 126, 62);
  g.fillStyle = "#111";
  g.font = "bold 44px Georgia, serif";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(String(n), 64, 34);
  return toTex(c);
}

function posterTex(kind: "form" | "info") {
  const { c, g } = mkCanvas(256, 360);
  g.fillStyle = "#fbfaf4";
  g.fillRect(0, 0, 256, 360);
  g.fillStyle = kind === "form" ? "#2f8a4a" : "#e9cf55";
  g.fillRect(0, 0, 256, 58);
  g.fillStyle = kind === "form" ? "#ffffff" : "#2b2b2b";
  g.font = "bold 22px Arial";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(kind === "form" ? "FORM PEMINJAMAN" : "TATA TERTIB", 128, 30);
  g.fillStyle = "#b8bbb5";
  for (let y = 78; y < 330; y += 14) g.fillRect(20, y, 216 - ((y / 14) % 3) * 34, 5);
  if (kind === "form") {
    g.fillStyle = "#222";
    const r = rng(3);
    for (let i = 0; i < 6; i++) for (let j = 0; j < 6; j++) if (r() > 0.45) g.fillRect(150 + i * 12, 250 + j * 12, 10, 10);
  }
  return toTex(c);
}

function noFoodTex() {
  const { c, g } = mkCanvas(128, 180);
  g.fillStyle = "#ffffff";
  g.fillRect(0, 0, 128, 180);
  g.strokeStyle = "#d02a2a";
  g.lineWidth = 12;
  g.beginPath();
  g.arc(64, 62, 46, 0, Math.PI * 2);
  g.stroke();
  g.fillStyle = "#222";
  g.fillRect(46, 40, 26, 34);
  g.fillRect(76, 30, 6, 40);
  g.strokeStyle = "#d02a2a";
  g.beginPath();
  g.moveTo(30, 94);
  g.lineTo(98, 30);
  g.stroke();
  g.fillStyle = "#222";
  g.font = "bold 13px Arial";
  g.textAlign = "center";
  g.fillText("DILARANG", 64, 138);
  g.fillText("MAKAN MINUM", 64, 156);
  return toTex(c);
}

function stickerTex() {
  const { c, g } = mkCanvas(128, 96);
  g.fillStyle = "#7dbb2e";
  g.fillRect(0, 0, 128, 96);
  g.fillStyle = "#fff";
  g.fillRect(6, 6, 116, 84);
  g.fillStyle = "#2c7a2c";
  g.fillRect(6, 6, 116, 26);
  g.fillStyle = "#fff";
  g.font = "bold 18px Arial";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText("PERHATIAN", 64, 20);
  g.fillStyle = "#999";
  for (let y = 44; y < 84; y += 10) g.fillRect(14, y, 100, 4);
  return toTex(c);
}

function boxTex() {
  const { c, g } = mkCanvas(256, 200);
  g.fillStyle = "#cfa97c";
  g.fillRect(0, 0, 256, 200);
  g.fillStyle = "#16181b";
  g.fillRect(0, 130, 256, 70);
  g.fillStyle = "#f2f2f2";
  g.font = "bold 40px Arial";
  g.textAlign = "left";
  g.textBaseline = "middle";
  g.fillText("ASUS", 16, 165);
  g.font = "bold 22px Arial";
  g.fillText("| BUSINESS", 120, 168);
  return toTex(c);
}

/* ----------------------------------------------------------------------------
   Builder: susun banyak bagian kecil lalu di-merge per material (draw call sedikit)
---------------------------------------------------------------------------- */
class Builder {
  parts: { g: THREE.BufferGeometry; m: THREE.Material }[] = [];
  private tmp = new THREE.Object3D();

  put(geo: THREE.BufferGeometry, m: THREE.Material, p: V3 = [0, 0, 0], r: V3 = [0, 0, 0], s: V3 = [1, 1, 1]) {
    this.tmp.position.set(p[0], p[1], p[2]);
    this.tmp.rotation.set(r[0], r[1], r[2]);
    this.tmp.scale.set(s[0], s[1], s[2]);
    this.tmp.updateMatrix();
    geo.applyMatrix4(this.tmp.matrix);
    this.parts.push({ g: geo, m });
    return this;
  }
  box(w: number, h: number, d: number, m: THREE.Material, p: V3, r: V3 = [0, 0, 0]) {
    return this.put(new THREE.BoxGeometry(w, h, d), m, p, r);
  }
  cyl(rad: number, h: number, m: THREE.Material, p: V3, r: V3 = [0, 0, 0], seg = 12) {
    return this.put(new THREE.CylinderGeometry(rad, rad, h, seg), m, p, r);
  }
  plane(w: number, h: number, m: THREE.Material, p: V3, r: V3 = [0, 0, 0]) {
    return this.put(new THREE.PlaneGeometry(w, h), m, p, r);
  }
  sphere(rad: number, m: THREE.Material, p: V3, s: V3 = [1, 1, 1], seg = 12) {
    return this.put(new THREE.SphereGeometry(rad, seg, Math.max(6, seg - 4)), m, p, [0, 0, 0], s);
  }
  seg(a: V3, b: V3, rad: number, m: THREE.Material, n = 8) {
    const va = new THREE.Vector3(...a);
    const vb = new THREE.Vector3(...b);
    const dir = vb.clone().sub(va);
    const len = dir.length();
    const mid = va.clone().add(vb).multiplyScalar(0.5);
    const g = new THREE.CylinderGeometry(rad, rad, len, n);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    g.applyMatrix4(new THREE.Matrix4().compose(mid, q, new THREE.Vector3(1, 1, 1)));
    this.parts.push({ g, m });
    return this;
  }
  tube(pts: V3[], rad: number, m: THREE.Material, n = 32) {
    const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)));
    this.parts.push({ g: new THREE.TubeGeometry(curve, n, rad, 6, false), m });
    return this;
  }
  build(shadow = true) {
    const byMat = new Map<THREE.Material, THREE.BufferGeometry[]>();
    for (const { g, m } of this.parts) {
      const ng = g.index ? g.toNonIndexed() : g;
      const pos = ng.getAttribute("position");
      const out = new THREE.BufferGeometry();
      out.setAttribute("position", pos);
      out.setAttribute("normal", ng.getAttribute("normal"));
      out.setAttribute("uv", ng.getAttribute("uv") ?? new THREE.Float32BufferAttribute(new Float32Array(pos.count * 2), 2));
      if (!byMat.has(m)) byMat.set(m, []);
      byMat.get(m)!.push(out);
    }
    const group = new THREE.Group();
    byMat.forEach((list, m) => {
      const merged = mergeGeometries(list, false);
      if (!merged) return;
      const mesh = new THREE.Mesh(merged, m);
      mesh.castShadow = shadow;
      mesh.receiveShadow = true;
      group.add(mesh);
    });
    return group;
  }
}

function rrPath<T extends THREE.Path>(p: T, w: number, h: number, r: number): T {
  const x = -w / 2, y = -h / 2;
  p.moveTo(x + r, y);
  p.lineTo(x + w - r, y);
  p.quadraticCurveTo(x + w, y, x + w, y + r);
  p.lineTo(x + w, y + h - r);
  p.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  p.lineTo(x + r, y + h);
  p.quadraticCurveTo(x, y + h, x, y + h - r);
  p.lineTo(x, y + r);
  p.quadraticCurveTo(x, y, x + r, y);
  return p;
}

/* ----------------------------------------------------------------------------
   material
---------------------------------------------------------------------------- */
function makeMats() {
  const std = (color: string, o: THREE.MeshStandardMaterialParameters = {}) =>
    new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0, ...o });
  const fc = floorCanvas();
  const blindMap = latticeTex(2, 2.5);
  return {
    // meja hitam + PC
    deskTop: std("#ffffff", { map: grainTex("#3b322d", "#1d1613", 5), roughness: 0.5 }),
    deskPanel: std("#2e2622", { roughness: 0.7 }),
    leg: std("#a6a9ad", { metalness: 0.7, roughness: 0.35 }),
    black: std("#17181a", { roughness: 0.5 }),
    pcBody: std("#17181b", { roughness: 0.45, metalness: 0.2 }),
    pcFront: std("#ffffff", { map: pcFrontTex(), roughness: 0.5 }),
    bezel: std("#0e0f11", { roughness: 0.4 }),
    screen: std("#ffffff", { map: screenTex(), roughness: 0.1, metalness: 0.15 }),
    logo: new THREE.MeshBasicMaterial({ map: textTex("GEAR", "#c9ccd0", 256, 64, "bold 44px Arial"), transparent: true, depthWrite: false }),
    cable: std("#111111", { roughness: 0.6 }),
    cableW: std("#e8e8e8", { roughness: 0.6 }),
    cableNet: std("#9db6d6", { roughness: 0.6 }),
    key: std("#202225"),
    keyTop: std("#2d3035"),
    tray: std("#222426"),
    railW: std("#dcdddf", { roughness: 0.4 }),
    // meja kayu
    beechTop: std("#ffffff", { map: grainTex("#dcb581", "#c79a5f", 9), roughness: 0.55 }),
    beechBody: std("#cf9f64", { roughness: 0.6 }),
    beechEdge: std("#b98650", { roughness: 0.6 }),
    cream: std("#eadfc8", { roughness: 0.6 }),
    knob: std("#222222"),
    // kursi
    chrome: std("#e6e8ea", { metalness: 1, roughness: 0.22 }),
    red: std("#8d1d32", { roughness: 0.85 }),
    green: std("#17967a", { roughness: 0.8 }),
    white: std("#f3f3f1", { roughness: 0.5 }),
    lime: std("#79c52a", { roughness: 0.5 }),
    dark: std("#1b1d20", { roughness: 0.6 }),
    meshFrame: std("#1b1c1f", { roughness: 0.5 }),
    meshFab: std("#2b2d31", { roughness: 0.9, side: THREE.DoubleSide }),
    seatFab: std("#202225", { roughness: 0.9 }),
    // proyektor, rack, AC
    projW: std("#efefed", { roughness: 0.45 }),
    projRing: std("#b9bcc0", { roughness: 0.4, metalness: 0.4 }),
    lens: std("#101215", { roughness: 0.15, metalness: 0.3 }),
    benq: new THREE.MeshBasicMaterial({ map: textTex("BenQ", "#555a60", 256, 64, "bold 48px Arial"), transparent: true, depthWrite: false }),
    strip: std("#e9eaec", { roughness: 0.5 }),
    stripGrey: std("#7b7e82", { roughness: 0.5 }),
    rack: std("#d6d7da", { roughness: 0.4, metalness: 0.5 }),
    patch: std("#101112", { roughness: 0.5 }),
    acBody: std("#f2f3f4", { roughness: 0.5 }),
    acSlot: std("#2b2e33", { roughness: 0.6 }),
    acGrille: std("#c9cbce", { roughness: 0.5 }),
    redTag: std("#c4202a", { roughness: 0.7 }),
    // ruangan
    wall: new THREE.MeshBasicMaterial({ color: "#eee3cc" }),
    ceil: std("#f8f8f6", { roughness: 0.95 }),
    skirt: std("#d8cfbd", { roughness: 0.8 }),
    frameAl: std("#ebecee", { roughness: 0.4, metalness: 0.3 }),
    glass: new THREE.MeshPhysicalMaterial({ color: "#cfe6f5", transparent: true, opacity: 0.12, roughness: 0.05, depthWrite: false }),
    slit: new THREE.MeshPhysicalMaterial({ color: "#7e96a8", transparent: true, opacity: 0.45, roughness: 0.05, depthWrite: false }),
    blind: std("#ffffff", { map: blindMap, emissive: new THREE.Color("#ffffff"), emissiveMap: blindMap, emissiveIntensity: 0.55, roughness: 0.9, side: THREE.DoubleSide }),
    blindRail: std("#e8e8e6", { roughness: 0.6 }),
    doorWood: std("#c9a57d", { roughness: 0.55 }),
    doorFrame: std("#b88f64", { roughness: 0.55 }),
    led: new THREE.MeshStandardMaterial({ color: "#ffffff", emissive: new THREE.Color("#eef2f6"), emissiveIntensity: 0.9 }),
    ledFrame: std("#c9ccd0", { roughness: 0.5, metalness: 0.2 }),
    frameDark: std("#6f757b", { roughness: 0.45, metalness: 0.4 }),
    screenFabric: new THREE.MeshStandardMaterial({ color: "#ffffff", emissive: new THREE.Color("#e8eefc"), emissiveIntensity: 0.25, roughness: 0.9 }),
    kraft: std("#cfa97c", { roughness: 0.9 }),
    kraftPrint: std("#ffffff", { map: boxTex(), roughness: 0.9 }),
    blackCarton: std("#1d1f22", { roughness: 0.8 }),
    bin: new THREE.MeshStandardMaterial({ color: "#e8efe9", transparent: true, opacity: 0.55, roughness: 0.3 }),
    binLatch: std("#3aa84a", { roughness: 0.5 }),
    // texture lain
    floorMap: toTex(fc, [W / 1.6, D / 1.6]),
    corrFloorMap: toTex(fc, [W / 1.6, 2.4 / 1.6]),
    posterForm: toTex(posterTex("form").image as HTMLCanvasElement),
    posterInfo: toTex(posterTex("info").image as HTMLCanvasElement),
    noFood: toTex(noFoodTex().image as HTMLCanvasElement),
    sticker: toTex(stickerTex().image as HTMLCanvasElement),
  };
}
type Mats = ReturnType<typeof makeMats>;

/* ----------------------------------------------------------------------------
   prototipe objek (dibangun sekali, di-clone ke banyak tempat)
---------------------------------------------------------------------------- */
function addMonitor(b: Builder, M: Mats, x: number, z: number, y0: number) {
  // dudukan bentuk "Y" datar
  const legs: [number, number][] = [[-0.19, 0.12], [0.19, 0.12], [0, -0.07]];
  legs.forEach(([dx, dz]) => {
    const len = Math.hypot(dx, dz);
    b.box(0.032, 0.012, len, M.bezel, [x + dx / 2, y0 + 0.006, z + dz / 2], [0, Math.atan2(dx, dz), 0]);
  });
  b.box(0.05, 0.14, 0.03, M.bezel, [x, y0 + 0.08, z - 0.01]); // leher
  b.box(0.5, 0.3, 0.022, M.bezel, [x, y0 + 0.28, z]); // bezel
  b.box(0.34, 0.17, 0.035, M.bezel, [x, y0 + 0.28, z - 0.028]); // punggung
  b.plane(0.478, 0.268, M.screen, [x, y0 + 0.28, z + 0.0115]); // layar mati
  b.plane(0.05, 0.0125, M.logo, [x, y0 + 0.28 - 0.138, z + 0.012]); // logo GEAR
}

function buildMonitor(M: Mats) {
  const b = new Builder();
  addMonitor(b, M, 0, 0, 0);
  return b.build();
}

function buildKeyboardSet(M: Mats) {
  const b = new Builder();
  b.box(0.38, 0.014, 0.13, M.key, [0, 0.007, 0]);
  b.box(0.36, 0.004, 0.11, M.keyTop, [0, 0.016, 0]);
  b.sphere(0.03, M.black, [0.3, 0.014, 0], [1, 0.5, 1.7]);
  return b.build();
}

function buildBlackDesk(M: Mats, w: number, withMonitor = true) {
  const b = new Builder();
  const hw = w / 2;
  b.box(w, 0.03, 0.6, M.deskTop, [0, 0.735, 0]);
  // kaki bulat abu-abu
  const lx = hw - 0.07, lz = 0.24;
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) {
      b.cyl(0.026, 0.72, M.leg, [sx * lx, 0.36, sz * lz]);
      b.cyl(0.03, 0.012, M.black, [sx * lx, 0.006, sz * lz]);
    }
  for (const sx of [-1, 1]) b.cyl(0.011, 2 * lz, M.leg, [sx * lx, 0.3, 0], [Math.PI / 2, 0, 0]);
  // panel kayu gelap
  b.box(0.02, 0.62, 0.5, M.deskPanel, [-hw + 0.12, 0.4, 0]);
  b.box(0.02, 0.62, 0.5, M.deskPanel, [hw - 0.035, 0.4, 0]);
  b.box(w - 0.16, 0.5, 0.014, M.deskPanel, [0, 0.45, -0.27]);
  // PC GEAR di kolong kanan
  b.box(0.42, 0.016, 0.48, M.deskPanel, [hw - 0.28, 0.09, 0]);
  const px = hw - 0.27;
  b.box(0.2, 0.43, 0.42, M.pcBody, [px, 0.31, 0]);
  b.plane(0.2, 0.43, M.pcFront, [px, 0.31, 0.2105]);
  // laci keyboard
  const cx = -hw + 0.385;
  b.box(0.46, 0.01, 0.3, M.tray, [cx, 0.675, 0.16]);
  b.box(0.012, 0.012, 0.32, M.railW, [cx - 0.235, 0.668, 0.15]);
  b.box(0.012, 0.012, 0.32, M.railW, [cx + 0.235, 0.668, 0.15]);
  b.box(0.38, 0.014, 0.13, M.key, [cx, 0.69, 0.18]);
  b.box(0.36, 0.004, 0.11, M.keyTop, [cx, 0.699, 0.18]);
  // lubang kabel
  b.cyl(0.03, 0.004, M.black, [-hw + 0.17, 0.752, -0.2], [0, 0, 0], 20);
  if (withMonitor) {
    addMonitor(b, M, -0.03, -0.17, 0.75);
    b.box(0.1, 0.02, 0.05, M.black, [-0.2, 0.76, -0.26]); // adaptor
    b.sphere(0.03, M.black, [hw - 0.2, 0.764, -0.03], [1, 0.5, 1.7]); // mouse
    b.tube(
      [[hw - 0.2, 0.757, -0.06], [hw - 0.2, 0.753, -0.18], [hw - 0.25, 0.753, -0.25], [0, 0.753, -0.255], [-0.2, 0.753, -0.24], [-hw + 0.17, 0.753, -0.2]],
      0.003, M.cable, 40
    );
    b.tube([[-0.03, 0.76, -0.19], [-0.1, 0.753, -0.24], [-hw + 0.17, 0.753, -0.22]], 0.004, M.cable, 20);
  }
  return b.build();
}

function buildWoodDesk(M: Mats, w: number) {
  const b = new Builder();
  b.box(w, 0.03, 0.6, M.beechTop, [0, 0.735, 0]);
  b.box(w + 0.004, 0.03, 0.014, M.beechEdge, [0, 0.735, 0.293]);
  b.box(0.014, 0.03, 0.6, M.beechEdge, [-w / 2 - 0.001, 0.735, 0]);
  b.box(0.014, 0.03, 0.6, M.beechEdge, [w / 2 + 0.001, 0.735, 0]);
  for (const s of [-1, 1]) b.box(0.02, 0.7, 0.58, M.beechBody, [s * (w / 2 - 0.014), 0.37, 0]);
  const partX = w / 2 - 0.46;
  b.box(0.018, 0.66, 0.5, M.beechBody, [partX, 0.39, -0.02]);
  // ruang CPU (kosong) di kanan
  const bayX = w / 2 - 0.237;
  b.box(0.44, 0.018, 0.5, M.beechBody, [bayX, 0.12, -0.02]);
  b.box(0.44, 0.1, 0.012, M.beechBody, [bayX, 0.17, 0.24]);
  // laci keyboard + laci kecil di kiri
  const lx = (-w / 2 + 0.024 + partX - 0.009) / 2;
  b.box(0.5, 0.015, 0.3, M.beechTop, [lx, 0.655, 0.12]);
  b.box(0.52, 0.045, 0.012, M.cream, [lx, 0.655, 0.275]);
  b.box(0.5, 0.15, 0.016, M.beechBody, [lx, 0.52, 0.28]);
  b.box(0.46, 0.13, 0.45, M.beechBody, [lx, 0.52, 0.04]);
  b.cyl(0.014, 0.02, M.knob, [lx, 0.52, 0.298], [Math.PI / 2, 0, 0]);
  b.box(0.5, 0.016, 0.5, M.beechBody, [lx, 0.06, -0.02]);
  b.box(w - 0.06, 0.42, 0.012, M.beechBody, [0, 0.5, -0.285]);
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) b.cyl(0.02, 0.03, M.black, [sx * (w / 2 - 0.035), 0.015, sz * 0.25]);
  return b.build();
}

function buildRedChair(M: Mats) {
  const b = new Builder();
  b.box(0.43, 0.07, 0.42, M.red, [0, 0.44, 0]); // dudukan
  const r = 0.011;
  for (const sx of [-1, 1]) {
    const x = sx * 0.2;
    b.seg([x, 0, -0.19], [x, 0.4, -0.19], r, M.chrome);
    b.seg([x, 0, 0.2], [x, 0.4, 0.2], r, M.chrome);
    b.seg([x, 0.4, -0.19], [x, 0.4, 0.2], r, M.chrome);
    b.seg([x, 0.14, -0.19], [x, 0.14, 0.2], r, M.chrome);
    b.seg([x, 0.4, 0.2], [x, 0.68, 0.22], r, M.chrome); // tiang sandaran
  }
  b.seg([-0.2, 0.4, -0.19], [0.2, 0.4, -0.19], r, M.chrome);
  b.seg([-0.2, 0.4, 0.2], [0.2, 0.4, 0.2], r, M.chrome);
  b.seg([-0.2, 0.14, -0.19], [0.2, 0.14, -0.19], r, M.chrome);
  b.seg([-0.2, 0.14, 0.2], [0.2, 0.14, 0.2], r, M.chrome);
  b.seg([-0.2, 0.5, 0.22], [0.2, 0.5, 0.22], r, M.chrome);
  b.put(new THREE.TorusGeometry(0.2, r, 8, 24, Math.PI), M.chrome, [0, 0.68, 0.22]); // lengkung atas
  const s = new THREE.Shape();
  s.moveTo(-0.185, 0);
  s.lineTo(0.185, 0);
  s.lineTo(0.185, 0.18);
  s.absarc(0, 0.18, 0.185, 0, Math.PI, false);
  s.lineTo(-0.185, 0);
  b.put(new THREE.ExtrudeGeometry(s, { depth: 0.04, bevelEnabled: false }), M.red, [0, 0.5, 0.2]);
  return b.build();
}

function buildPlasticChair(M: Mats, pad: THREE.Material, shell: THREE.Material) {
  const b = new Builder();
  b.box(0.44, 0.022, 0.43, shell, [0, 0.43, 0]);
  b.box(0.43, 0.04, 0.41, pad, [0, 0.461, -0.005]);
  const tilt: V3 = [0.14, 0, 0];
  b.box(0.42, 0.34, 0.025, shell, [0, 0.7, 0.225], tilt);
  b.box(0.39, 0.26, 0.02, pad, [0, 0.69, 0.208], tilt);
  b.box(0.12, 0.035, 0.03, M.dark, [0, 0.855, 0.23], tilt); // lubang pegangan
  const r = 0.008;
  for (const sx of [-1, 1]) {
    const x = sx * 0.2;
    b.seg([x, 0.012, -0.25], [x, 0.012, 0.22], r, M.chrome);
    b.seg([x, 0.012, -0.25], [x, 0.42, -0.2], r, M.chrome);
    b.seg([x, 0.012, 0.22], [x, 0.42, 0.21], r, M.chrome);
    b.seg([x * 0.95, 0.42, 0.21], [x * 0.95, 0.56, 0.22], r, M.chrome);
  }
  b.seg([-0.2, 0.012, -0.25], [0.2, 0.012, -0.25], r, M.chrome);
  b.seg([-0.2, 0.012, 0.22], [0.2, 0.012, 0.22], r, M.chrome);
  return b.build();
}

function buildMeshChair(M: Mats) {
  const b = new Builder();
  for (let k = 0; k < 5; k++) {
    const a = (k * Math.PI * 2) / 5;
    const dx = Math.sin(a), dz = Math.cos(a);
    b.box(0.04, 0.03, 0.3, M.meshFrame, [dx * 0.15, 0.075, dz * 0.15], [0, a, 0]);
    b.sphere(0.03, M.black, [dx * 0.29, 0.03, dz * 0.29]);
  }
  b.cyl(0.03, 0.36, M.meshFrame, [0, 0.26, 0]);
  b.box(0.4, 0.04, 0.35, M.meshFrame, [0, 0.42, 0]);
  b.box(0.5, 0.07, 0.48, M.seatFab, [0, 0.47, 0]);
  const ring = rrPath(new THREE.Shape(), 0.5, 0.56, 0.07);
  ring.holes.push(rrPath(new THREE.Path(), 0.44, 0.5, 0.05));
  b.put(new THREE.ExtrudeGeometry(ring, { depth: 0.04, bevelEnabled: false }), M.meshFrame, [0, 0.83, 0.225], [0.12, 0, 0]);
  b.plane(0.45, 0.51, M.meshFab, [0, 0.83, 0.235], [0.12, Math.PI, 0]);
  b.box(0.06, 0.4, 0.03, M.meshFrame, [0, 0.62, 0.235], [0.12, 0, 0]);
  for (const sx of [-1, 1]) {
    b.box(0.03, 0.2, 0.04, M.meshFrame, [sx * 0.28, 0.57, 0.0]);
    b.box(0.06, 0.025, 0.3, M.meshFrame, [sx * 0.28, 0.68, -0.02]);
  }
  return b.build();
}

function buildProjector(M: Mats) {
  const b = new Builder();
  b.box(0.33, 0.115, 0.25, M.projW, [0, 0.0575, 0]);
  b.box(0.3, 0.012, 0.22, M.projW, [0, 0.121, 0]);
  b.cyl(0.05, 0.03, M.projRing, [0.07, 0.06, 0.135], [Math.PI / 2, 0, 0], 24);
  b.cyl(0.036, 0.034, M.lens, [0.07, 0.06, 0.143], [Math.PI / 2, 0, 0], 24);
  b.cyl(0.028, 0.02, M.projRing, [0.1, 0.13, 0.05]);
  for (let i = 0; i < 6; i++) b.box(0.004, 0.07, 0.012, M.dark, [-0.167, 0.06, -0.08 + i * 0.03]);
  b.plane(0.08, 0.02, M.benq, [-0.09, 0.04, 0.1255]);
  for (const sx of [-1, 1]) b.cyl(0.015, 0.012, M.dark, [sx * 0.13, 0.006, 0.08]);
  return b.build();
}

function buildRack(M: Mats) {
  const b = new Builder();
  const h = 2.1;
  for (const sx of [-1, 1]) {
    b.box(0.04, h, 0.04, M.rack, [sx * 0.24, h / 2, 0.1]);
    b.box(0.04, h, 0.04, M.rack, [sx * 0.24, h / 2, -0.1]);
  }
  b.box(0.56, 0.02, 0.3, M.rack, [0, 0.01, 0]);
  b.box(0.56, 0.02, 0.3, M.rack, [0, h - 0.01, 0]);
  [1.5, 1.6, 1.7, 1.8].forEach((y) => {
    b.box(0.46, 0.04, 0.03, M.patch, [0, y, 0.13]);
    b.box(0.44, 0.012, 0.04, M.rack, [0, y + 0.03, 0.13]);
  });
  b.box(0.46, 0.2, 0.2, M.patch, [0, 1.1, 0]);
  return b.build();
}

function buildAC(M: Mats) {
  const b = new Builder();
  b.box(0.95, 0.05, 0.95, M.acBody, [0, 0, 0]);
  const y = -0.0255;
  [[0, 0.36, 0.8, 0.06], [0, -0.36, 0.8, 0.06], [0.36, 0, 0.06, 0.8], [-0.36, 0, 0.06, 0.8]].forEach(([x, z, a, c]) =>
    b.box(a, 0.004, c, M.acSlot, [x, y, z])
  );
  b.box(0.5, 0.004, 0.5, M.acGrille, [0, y, 0]);
  b.box(0.3, 0.005, 0.3, M.acBody, [0, y - 0.001, 0]);
  b.box(0.03, 0.12, 0.004, M.redTag, [0.05, -0.085, 0.2]);
  return b.build(false);
}

function makeAssets() {
  const M = makeMats();
  const P = {
    blackDesk: buildBlackDesk(M, DESK_W, true),
    teacherDesk: buildBlackDesk(M, 1.45, true),
    woodDesk: buildWoodDesk(M, WOOD_W),
    redChair: buildRedChair(M),
    greenChair: buildPlasticChair(M, M.green, M.white),
    limeChair: buildPlasticChair(M, M.lime, M.lime),
    meshChair: buildMeshChair(M),
    monitor: buildMonitor(M),
    keyboard: buildKeyboardSet(M),
    projector: buildProjector(M),
    rack: buildRack(M),
    ac: buildAC(M),
  };
  const labels: THREE.Texture[] = [];
  for (let i = 0; i <= 21; i++) labels.push(labelTex(i));
  return { M, P, labels };
}
type Assets = ReturnType<typeof makeAssets>;
let CACHE: Assets | null = null;
function getAssets(): Assets {
  if (!CACHE) CACHE = makeAssets();
  return CACHE;
}

/* ----------------------------------------------------------------------------
   komponen kecil
---------------------------------------------------------------------------- */
function Proto({ obj, position, rotation = [0, 0, 0] }: { obj: THREE.Object3D; position: V3; rotation?: V3 }) {
  const o = useMemo(() => obj.clone(), [obj]);
  return <primitive object={o} position={position} rotation={rotation} dispose={null} />;
}

function Cable({ pts, r = 0.006, mat }: { pts: V3[]; r?: number; mat: THREE.Material }) {
  const geo = useMemo(
    () => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p))), 64, r, 6, false),
    [pts, r]
  );
  return <mesh geometry={geo} material={mat} />;
}

function Slab({ pos, size, mat }: { pos: V3; size: V3; mat: THREE.Material }) {
  return (
    <mesh position={pos} material={mat} receiveShadow>
      <boxGeometry args={size} />
    </mesh>
  );
}

function BlackDeskI({ A, proto, pos, rot, n }: { A: Assets; proto: THREE.Object3D; pos: V3; rot: number; n?: number }) {
  return (
    <group position={pos} rotation={[0, rot, 0]}>
      <Proto obj={proto} position={[0, 0, 0]} />
      {n !== undefined && (
        <mesh position={[-0.38, 0.7512, 0.265]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.07, 0.035]} />
          <meshBasicMaterial map={A.labels[n]} />
        </mesh>
      )}
    </group>
  );
}

/* ----------------------------------------------------------------------------
   bagian ruangan
---------------------------------------------------------------------------- */
function BackWindow({ A }: { A: Assets }) {
  const M = A.M;
  const z = -HZ;
  const hh = WIN_Y1 - WIN_Y0;
  const ym = (WIN_Y0 + WIN_Y1) / 2;
  const n = 7;
  const pw = W / n;
  return (
    <group>
      {/* dinding bawah & atas jendela */}
      <Slab pos={[0, WIN_Y0 / 2, z - 0.1]} size={[W + 0.4, WIN_Y0, 0.2]} mat={M.wall} />
      <Slab pos={[0, (WIN_Y1 + H) / 2, z - 0.1]} size={[W + 0.4, H - WIN_Y1, 0.2]} mat={M.wall} />
      {/* langit terang di luar */}
      <mesh position={[0, 1.6, z - 3]}>
        <planeGeometry args={[30, 10]} />
        <meshBasicMaterial color="#f3f7fa" />
      </mesh>
      {/* kaca */}
      <mesh material={M.glass} position={[0, ym, z - 0.02]}>
        <planeGeometry args={[W, hh]} />
      </mesh>
      {/* panel lattice putih motif diamond, 7 panel */}
      {Array.from({ length: n }).map((_, i) => (
        <mesh key={i} material={M.blind} position={[-HX + pw * (i + 0.5), ym, z + 0.03]}>
          <planeGeometry args={[pw - 0.02, hh - 0.05]} />
        </mesh>
      ))}
      {/* kusen vertikal aluminium */}
      {Array.from({ length: n + 1 }).map((_, i) => (
        <mesh key={i} material={M.frameDark} position={[-HX + pw * i, ym, z + 0.045]}>
          <boxGeometry args={[0.05, hh, 0.07]} />
        </mesh>
      ))}
      {/* kusen atas & bawah */}
      <mesh material={M.frameDark} position={[0, WIN_Y1 - 0.015, z + 0.045]}>
        <boxGeometry args={[W, 0.05, 0.07]} />
      </mesh>
      <mesh material={M.frameDark} position={[0, WIN_Y0 + 0.015, z + 0.045]}>
        <boxGeometry args={[W, 0.05, 0.07]} />
      </mesh>
      {/* ambang jendela */}
      <mesh material={M.strip} position={[0, WIN_Y0 - 0.02, z + 0.07]}>
        <boxGeometry args={[W, 0.04, 0.14]} />
      </mesh>
    </group>
  );
}

function FrontWall({ A }: { A: Assets }) {
  const M = A.M;
  const zc = HZ + 0.1;
  const gx0 = DOOR_X1;
  const gx1 = HX;
  const gcx = (gx0 + gx1 + 0.2) / 2; // dinding kanan pintu sampai ujung (tanpa celah)
  const gw = gx1 + 0.2 - gx0;
  const bounds = [-1.6, -0.75, 0.25, 1.25, 2.3, 3.2, 4.0];
  return (
    <group>
      <Slab pos={[(-HX + DOOR_X0) / 2 - 0.1, H / 2, zc]} size={[DOOR_X0 + HX + 0.2, H, 0.2]} mat={M.wall} />
      <Slab pos={[(DOOR_X0 + DOOR_X1) / 2, (DOOR_H + H) / 2, zc]} size={[DOOR_X1 - DOOR_X0, H - DOOR_H, 0.2]} mat={M.wall} />
      <Slab pos={[gcx, 0.79, zc]} size={[gw, 1.58, 0.2]} mat={M.wall} />
      <Slab pos={[gcx, (2.0 + H) / 2, zc]} size={[gw, H - 2.0, 0.2]} mat={M.wall} />
      {/* jendela kecil ke koridor */}
      <mesh material={M.glass} position={[(gx0 + gx1) / 2, 1.79, HZ + 0.05]}>
        <planeGeometry args={[gx1 - gx0, 0.42]} />
      </mesh>
      {bounds.map((x) => (
        <mesh key={x} material={M.frameAl} position={[x, 1.79, HZ + 0.05]}>
          <boxGeometry args={[0.04, 0.46, 0.08]} />
        </mesh>
      ))}
      {[1.58, 2.0].map((y) => (
        <mesh key={y} material={M.frameAl} position={[(gx0 + gx1) / 2, y, HZ + 0.05]}>
          <boxGeometry args={[gx1 - gx0, 0.04, 0.08]} />
        </mesh>
      ))}
      {/* palang tengah (transom) di 2 jendela dekat pojok, seperti di foto */}
      <mesh material={M.frameAl} position={[3.15, 1.9, HZ + 0.05]}>
        <boxGeometry args={[1.7, 0.03, 0.08]} />
      </mesh>
      <mesh position={[2.6, 1.68, HZ - 0.003]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[0.2, 0.15]} />
        <meshBasicMaterial map={M.sticker} />
      </mesh>
      {/* panel saklar + stiker dilarang makan minum + stop kontak */}
      {[-1.45, -1.32, -1.19].map((x, i) => (
        <mesh key={x} position={[x, 1.29, HZ - 0.004]} rotation={[0, Math.PI, 0]}>
          <planeGeometry args={[0.085, 0.085]} />
          <meshBasicMaterial color={i === 0 ? "#b9d2ea" : "#e8ecef"} />
        </mesh>
      ))}
      <mesh position={[-1.05, 1.29, HZ - 0.004]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[0.085, 0.085]} />
        <meshBasicMaterial color="#2aa05a" />
      </mesh>
      <mesh position={[-1.35, 1.1, HZ - 0.004]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[0.13, 0.185]} />
        <meshBasicMaterial map={M.noFood} />
      </mesh>
      <mesh position={[-1.0, 0.3, HZ - 0.004]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[0.08, 0.08]} />
        <meshBasicMaterial color="#f1f1ef" />
      </mesh>
    </group>
  );
}

function Door({ A }: { A: Assets }) {
  const M = A.M;
  const zc = HZ + 0.05;
  const cx = (DOOR_X0 + DOOR_X1) / 2;
  // kusen dibuat sedikit lebih tebal dari dinding (0.2) dan tidak berbagi bidang dengan
  // dinding -> tidak ada z-fighting (penyebab pintu kelap-kelip)
  const fd = 0.206;
  return (
    <group>
      <mesh material={M.doorFrame} position={[cx, DOOR_H - 0.02, HZ + 0.1]}>
        <boxGeometry args={[DOOR_X1 - DOOR_X0, 0.08, fd]} />
      </mesh>
      <mesh material={M.doorFrame} position={[DOOR_X0 + 0.025, (DOOR_H - 0.04) / 2, HZ + 0.1]}>
        <boxGeometry args={[0.05, DOOR_H - 0.04, fd]} />
      </mesh>
      <mesh material={M.doorFrame} position={[DOOR_X1 - 0.025, (DOOR_H - 0.04) / 2, HZ + 0.1]}>
        <boxGeometry args={[0.05, DOOR_H - 0.04, fd]} />
      </mesh>
      {/* daun kecil (tertutup) */}
      <mesh material={M.doorWood} position={[-1.97, 1.03, zc]} castShadow>
        <boxGeometry args={[0.64, 2.06, 0.045]} />
      </mesh>
      <mesh material={M.slit} position={[-1.97, 1.2, zc - 0.0255]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[0.15, 1.55]} />
      </mesh>
      <mesh material={M.stripGrey} position={[-1.9, 2.07, zc - 0.04]}>
        <boxGeometry args={[0.3, 0.04, 0.05]} />
      </mesh>
      {/* daun besar (terbuka ke dalam) */}
      <group position={[DOOR_X0 + 0.02, 0, zc]} rotation={[0, 1.13, 0]}>
        <mesh material={M.doorWood} position={[0.57, 1.03, 0]} castShadow>
          <boxGeometry args={[1.13, 2.06, 0.045]} />
        </mesh>
        <mesh material={M.slit} position={[0.57, 1.2, -0.0255]} rotation={[0, Math.PI, 0]}>
          <planeGeometry args={[0.3, 1.6]} />
        </mesh>
        <mesh material={M.slit} position={[0.57, 1.2, 0.0255]}>
          <planeGeometry args={[0.3, 1.6]} />
        </mesh>
        <mesh material={M.chrome} position={[1.02, 1.0, -0.045]}>
          <boxGeometry args={[0.03, 0.14, 0.04]} />
        </mesh>
        <mesh material={M.chrome} position={[1.02, 1.0, 0.045]}>
          <boxGeometry args={[0.03, 0.14, 0.04]} />
        </mesh>
      </group>
    </group>
  );
}

function Corridor({ A }: { A: Assets }) {
  // mulai tepat di dinding depan (HZ) supaya tidak ada celah/lubang di bawah pintu
  const z0 = HZ, len = 2.6;
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, z0 + len / 2]}>
        <planeGeometry args={[W + 0.4, len]} />
        <meshBasicMaterial map={A.M.corrFloorMap} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, H, z0 + len / 2]}>
        <planeGeometry args={[W + 0.4, len]} />
        <meshBasicMaterial color="#f1efe9" />
      </mesh>
      <mesh position={[0, H / 2, z0 + len]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[W + 0.4, H]} />
        <meshBasicMaterial color="#d9bfae" />
      </mesh>
      <mesh position={[-HX - 0.2, H / 2, z0 + len / 2]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[len, H]} />
        <meshBasicMaterial color="#e6dccb" />
      </mesh>
      <mesh position={[HX + 0.2, H / 2, z0 + len / 2]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[len, H]} />
        <meshBasicMaterial color="#e6dccb" />
      </mesh>
    </group>
  );
}

function ProjectorScreen({ A }: { A: Assets }) {
  const M = A.M;
  const z = HZ - 0.45;
  const y0 = 0.7, sh = 1.8, sw = 1.8;
  return (
    <group position={[SCREEN_X, 0, z]}>
      <mesh material={M.screenFabric} position={[0, y0 + sh / 2, 0]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[sw, sh]} />
      </mesh>
      <mesh material={M.black} position={[0, y0 + sh - 0.06, 0.004]}>
        <boxGeometry args={[sw, 0.12, 0.004]} />
      </mesh>
      <mesh material={M.black} position={[0, y0 + sh + 0.03, 0.02]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.04, 0.04, sw + 0.1, 16]} />
      </mesh>
      <mesh material={M.black} position={[0, y0 - 0.01, 0.002]}>
        <boxGeometry args={[sw, 0.03, 0.01]} />
      </mesh>
      <mesh material={M.black} position={[0, y0 / 2 + 0.2, 0.04]}>
        <cylinderGeometry args={[0.015, 0.015, y0 - 0.4, 8]} />
      </mesh>
      <mesh material={M.black} position={[0, 0.5, 0.04]}>
        <sphereGeometry args={[0.04, 10, 8]} />
      </mesh>
      {([[-0.38, -0.28], [0.38, -0.28], [0, 0.38]] as [number, number][]).map(([dx, dz], i) => {
        const a = new THREE.Vector3(0, 0.5, 0.04);
        const b = new THREE.Vector3(dx, 0.01, 0.04 + dz);
        const dir = b.clone().sub(a);
        const mid = a.clone().add(b).multiplyScalar(0.5);
        const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
        return (
          <mesh key={i} material={M.black} position={mid.toArray() as V3} quaternion={q}>
            <cylinderGeometry args={[0.014, 0.014, dir.length(), 8]} />
          </mesh>
        );
      })}
    </group>
  );
}

function Storage({ A }: { A: Assets }) {
  const M = A.M;
  const cartons: { p: V3; s: V3; pr?: boolean }[] = [
    { p: [3.65, 0.275, 3.5], s: [0.62, 0.55, 0.55], pr: true },
    { p: [3.65, 0.275, 4.15], s: [0.62, 0.55, 0.62], pr: true },
    { p: [3.65, 0.8, 3.82], s: [0.62, 0.5, 0.6], pr: true },
  ];
  return (
    <group>
      {cartons.map((c, i) => (
        <group key={i} position={c.p}>
          <mesh material={M.kraft} castShadow receiveShadow>
            <boxGeometry args={c.s} />
          </mesh>
          <mesh position={[-c.s[0] / 2 - 0.002, -c.s[1] / 2 + 0.17, 0]} rotation={[0, -Math.PI / 2, 0]}>
            <planeGeometry args={[c.s[2] * 0.95, 0.3]} />
            <meshStandardMaterial map={M.kraftPrint.map} roughness={0.9} />
          </mesh>
        </group>
      ))}
      {/* bin plastik + kardus hitam di pojok depan kiri */}
      {[0.18, 0.54].map((y, i) => (
        <group key={i} position={[-3.7, y, 3.6]}>
          <mesh material={M.bin}>
            <boxGeometry args={[0.5, 0.34, 0.4]} />
          </mesh>
          <mesh material={M.binLatch} position={[0.255, 0.1, 0]}>
            <boxGeometry args={[0.012, 0.06, 0.12]} />
          </mesh>
        </group>
      ))}
      {[0.9, 1.24].map((y, i) => (
        <mesh key={y} material={M.blackCarton} position={[-3.7, y, 3.6]} castShadow>
          <boxGeometry args={[0.48, 0.32, 0.36]} />
        </mesh>
      ))}
      <mesh material={M.kraft} position={[-3.7, 0.18, 4.2]} castShadow>
        <boxGeometry args={[0.5, 0.36, 0.45]} />
      </mesh>
      <mesh material={M.blackCarton} position={[-3.7, 0.5, 4.2]} castShadow>
        <boxGeometry args={[0.4, 0.28, 0.3]} />
      </mesh>
    </group>
  );
}

// kabel (titik tetap supaya geometri tidak dibuat ulang), relatif terhadap meja proyektor
const PX = PROJ_DESK[0];
const PZ = PROJ_DESK[1];
const CABLE_WHITE: V3[] = [
  [PX + 0.38, 0.77, PZ], [PX + 0.42, 0.6, PZ - 0.2], [PX + 0.5, 0.2, PZ - 0.45], [PX + 0.55, 0.012, PZ - 0.8],
  [PX + 0.6, 0.012, PZ - 1.6], [PX + 0.5, 0.012, PZ - 2.2], [PX + 0.7, 0.012, PZ - 2.6],
];
const CABLE_BLACK: V3[] = [
  [PX - 0.25, 0.8, PZ - 0.06], [PX - 0.3, 0.78, PZ - 0.2], [PX - 0.3, 0.78, PZ - 0.31],
  [PX - 0.3, 0.5, PZ - 0.33], [PX - 0.35, 0.012, PZ - 0.5], [PX - 0.2, 0.012, PZ - 0.9],
];
const CABLE_RACK_A: V3[] = [
  [3.45, 0.02, -4.3], [3.2, 0.012, -3.9], [2.6, 0.012, -3.6], [2.0, 0.012, -3.3],
];
const CABLE_RACK_B: V3[] = [
  [3.55, 0.02, -4.3], [3.3, 0.012, -4.0], [2.9, 0.012, -3.5], [2.4, 0.012, -3.1],
];

function Room() {
  const A = getAssets();
  const { M, P } = A;
  let n = 0;
  const next = () => ++n;

  const ledPos = useMemo(() => {
    const acs: [number, number][] = [[1.5, 1.3], [-0.4, -3.0]];
    const out: V3[] = [];
    [-2.6, 0, 2.6].forEach((x) =>
      [-3.6, -1.8, 0, 1.8, 3.6].forEach((z) => {
        if (acs.some(([ax, az]) => Math.abs(ax - x) < 1.1 && Math.abs(az - z) < 0.9)) return;
        out.push([x, H - 0.012, z]);
      })
    );
    return out;
  }, []);

  const backX = [0, 1, 2, 3, 4].map((i) => -2.9 + i);
  const leftZ = Array.from({ length: 7 }, (_, i) => -4.3 + i);
  const rightZ = Array.from({ length: 7 }, (_, i) => -3.7 + i);
  const leftArmZ = Array.from({ length: 4 }, (_, i) => -2.025 + i * 1.05);
  const rightArmZ = Array.from({ length: 4 }, (_, i) => -2.025 + i * 1.05);
  const half = Math.PI / 2;

  return (
    <>
      {/* lantai keramik */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[W, D]} />
        {GLOSSY_FLOOR ? (
          <MeshReflectorMaterial
            map={M.floorMap}
            color="#ffffff"
            roughness={0.5}
            metalness={0}
            blur={[200, 60]}
            resolution={512}
            mixBlur={1}
            mixStrength={0.2}
            mixContrast={1}
            mirror={0}
          />
        ) : (
          <meshStandardMaterial map={M.floorMap} roughness={0.25} metalness={0.05} />
        )}
      </mesh>

      {/* plafon + panel LED + AC + speaker + CCTV */}
      <mesh position={[0, H, 0]} rotation={[Math.PI / 2, 0, 0]} material={M.ceil}>
        <planeGeometry args={[W, D]} />
      </mesh>
      {ledPos.map((p, i) => (
        <group key={i} position={p}>
          <mesh material={M.ledFrame} position={[0, 0.006, 0]}>
            <boxGeometry args={[1.26, 0.024, 0.36]} />
          </mesh>
          <mesh material={M.led} position={[0, -0.0075, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <planeGeometry args={[1.2, 0.3]} />
          </mesh>
        </group>
      ))}
      <Proto obj={P.ac} position={[1.5, H - 0.025, 1.3]} />
      <Proto obj={P.ac} position={[-0.4, H - 0.025, -3.0]} />
      {([[-1.3, -1.0], [1.2, 3.2], [-2.2, 1.0]] as [number, number][]).map(([x, z], i) => (
        <mesh key={i} position={[x, H - 0.01, z]} material={M.frameAl}>
          <cylinderGeometry args={[0.08, 0.08, 0.02, 20]} />
        </mesh>
      ))}
      <group position={[HX - 0.12, H - 0.2, HZ - 0.3]}>
        <mesh material={M.frameAl}>
          <cylinderGeometry args={[0.05, 0.05, 0.03, 16]} />
        </mesh>
        <mesh material={M.projW} position={[0, -0.03, 0]} rotation={[Math.PI, 0, 0]}>
          <sphereGeometry args={[0.07, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        </mesh>
      </group>

      {/* dinding */}
      <BackWindow A={A} />
      <FrontWall A={A} />
      <Slab pos={[-HX - 0.1, H / 2, 0]} size={[0.2, H, D + 0.4]} mat={M.wall} />
      <Slab pos={[HX + 0.1, H / 2, 0]} size={[0.2, H, D + 0.4]} mat={M.wall} />
      {/* list bawah tipis */}
      {([
        [-HX + 0.006, 0, 0.012, D, M.skirt],
        [HX - 0.006, 0, 0.012, D, M.skirt],
        [0, -HZ + 0.006, W, 0.012, M.skirt],
        [(-HX + DOOR_X0) / 2, HZ - 0.006, DOOR_X0 + HX, 0.012, M.skirt],
        [(DOOR_X1 + HX) / 2, HZ - 0.006, HX - DOOR_X1, 0.012, M.skirt],
      ] as [number, number, number, number, THREE.Material][]).map(([x, z, w, d, m], i) => (
        <mesh key={i} material={m} position={[x, 0.03, z]}>
          <boxGeometry args={[w, 0.06, d]} />
        </mesh>
      ))}
      {/* poster */}
      <mesh position={[HX - 0.004, 1.55, 3.3]} rotation={[0, -half, 0]}>
        <planeGeometry args={[0.42, 0.58]} />
        <meshBasicMaterial map={M.posterForm} />
      </mesh>
      <mesh position={[-HX + 0.004, 1.6, 2.5]} rotation={[0, half, 0]}>
        <planeGeometry args={[0.7, 1.0]} />
        <meshBasicMaterial map={M.posterInfo} />
      </mesh>

      <Door A={A} />
      <Corridor A={A} />
      <ProjectorScreen A={A} />

      {/* ===== meja komputer hitam: dinding kiri (7) ===== */}
      {leftZ.map((z, i) => (
        <React.Fragment key={`L${i}`}>
          <BlackDeskI A={A} proto={P.blackDesk} pos={[-3.7, 0, z]} rot={half} n={next()} />
          <Proto obj={i === 6 ? P.limeChair : P.redChair} position={[-3.22, 0, z]} rotation={[0, half, 0]} />
        </React.Fragment>
      ))}
      {/* dinding jendela (5) */}
      {backX.map((x, i) => (
        <React.Fragment key={`B${i}`}>
          <BlackDeskI A={A} proto={P.blackDesk} pos={[x, 0, -4.5]} rot={0} n={next()} />
          <Proto obj={P.redChair} position={[x, 0, -4.02]} rotation={[0, 0, 0]} />
        </React.Fragment>
      ))}
      {/* dinding kanan (7), kursi hanya di 4 meja pertama (sesuai foto) */}
      {rightZ.map((z, i) => (
        <React.Fragment key={`R${i}`}>
          <BlackDeskI A={A} proto={P.blackDesk} pos={[3.7, 0, z]} rot={-half} n={next()} />
          {i < 4 && <Proto obj={P.redChair} position={[3.22, 0, z]} rotation={[0, -half, 0]} />}
        </React.Fragment>
      ))}

      {/* ===== meja kayu bentuk U ===== */}
      {/* penutup U di sisi jendela (2 meja) */}
      {[-0.525, 0.525].map((x) => (
        <React.Fragment key={`C${x}`}>
          <Proto obj={P.woodDesk} position={[x, 0, -2.25]} rotation={[0, Math.PI, 0]} />
          <Proto obj={P.greenChair} position={[x, 0, -2.73]} rotation={[0, Math.PI, 0]} />
        </React.Fragment>
      ))}
      {/* kolom kiri (4 meja, kursi di luar / sisi kiri) */}
      {leftArmZ.map((z, i) => (
        <React.Fragment key={`LA${i}`}>
          <Proto obj={P.woodDesk} position={[-1.35, 0, z]} rotation={[0, -half, 0]} />
          {[-0.26, 0.26].map((dz) => (
            <Proto key={dz} obj={P.greenChair} position={[-1.83, 0, z + dz]} rotation={[0, -half, 0]} />
          ))}
        </React.Fragment>
      ))}
      {/* monitor + keyboard di meja kiri paling belakang */}
      <group position={[-1.35, 0, leftArmZ[0]]} rotation={[0, -half, 0]}>
        <Proto obj={P.monitor} position={[0, 0.75, -0.17]} />
        <Proto obj={P.keyboard} position={[0, 0.75, 0.1]} />
      </group>
      {/* kolom kanan (5 meja, meja ke-5 = meja proyektor) */}
      {rightArmZ.map((z, i) => (
        <React.Fragment key={`RA${i}`}>
          <Proto obj={P.woodDesk} position={[1.35, 0, z]} rotation={[0, half, 0]} />
          {i < 4 &&
            [-0.26, 0.26].map((dz) => (
              <Proto key={dz} obj={P.greenChair} position={[1.83, 0, z + dz]} rotation={[0, half, 0]} />
            ))}
        </React.Fragment>
      ))}

      {/* ===== meja proyektor (meja kayu terpisah, menghadap belakang ruangan) ===== */}
      <Proto obj={P.woodDesk} position={[PROJ_DESK[0], 0, PROJ_DESK[1]]} rotation={[0, Math.PI, 0]} />
      <Proto obj={P.projector} position={[PROJ_DESK[0] - 0.15, 0.75, PROJ_DESK[1]]} rotation={[0, Math.atan2(SCREEN_X - (PROJ_DESK[0] - 0.15), HZ - 0.45 - PROJ_DESK[1]), 0]} />
      {/* stop kontak di meja + stop kontak di lantai */}
      <mesh material={M.strip} position={[PROJ_DESK[0] + 0.38, 0.77, PROJ_DESK[1]]} rotation={[0, half, 0]} castShadow>
        <boxGeometry args={[0.3, 0.035, 0.06]} />
      </mesh>
      <mesh material={M.stripGrey} position={[PROJ_DESK[0] + 0.38, 0.791, PROJ_DESK[1]]} rotation={[0, half, 0]}>
        <boxGeometry args={[0.2, 0.004, 0.03]} />
      </mesh>
      <mesh material={M.strip} position={[PROJ_DESK[0] + 0.7, 0.02, PROJ_DESK[1] - 2.65]} rotation={[0, 0.4, 0]}>
        <boxGeometry args={[0.3, 0.035, 0.06]} />
      </mesh>
      <Cable pts={CABLE_WHITE} r={0.005} mat={M.cableW} />
      <Cable pts={CABLE_BLACK} r={0.004} mat={M.cable} />

      {/* ===== meja dosen hitam (terpisah, sejajar dinding depan, layar menghadap kelas) ===== */}
      <BlackDeskI A={A} proto={P.teacherDesk} pos={[TEACHER_DESK[0], 0, TEACHER_DESK[1]]} rot={0} />
      <Proto obj={P.meshChair} position={[TEACHER_CHAIR[0], 0, TEACHER_CHAIR[1]]} rotation={[0, 0, 0]} />
      <group position={[TEACHER_DESK[0], 0.75, TEACHER_DESK[1]]}>
        {/* UPS */}
        <mesh material={M.black} position={[0.55, 0.14, -0.1]} castShadow>
          <boxGeometry args={[0.2, 0.28, 0.38]} />
        </mesh>
        {/* subwoofer + 2 speaker kecil */}
        <mesh material={M.deskPanel} position={[-0.45, 0.13, -0.15]} castShadow>
          <boxGeometry args={[0.2, 0.26, 0.22]} />
        </mesh>
        <mesh material={M.frameAl} position={[-0.45, 0.14, -0.037]}>
          <cylinderGeometry args={[0.06, 0.06, 0.004, 24]} />
        </mesh>
        <mesh material={M.black} position={[-0.3, 0.075, -0.05]} castShadow>
          <boxGeometry args={[0.1, 0.15, 0.1]} />
        </mesh>
        <mesh material={M.black} position={[-0.55, 0.075, 0.1]} castShadow>
          <boxGeometry args={[0.1, 0.15, 0.1]} />
        </mesh>
        <Proto obj={P.keyboard} position={[0.1, 0, 0.18]} />
        <mesh material={M.black} position={[0.6, 0.002, 0.22]} rotation={[0, 0.1, 0]}>
          <boxGeometry args={[0.28, 0.004, 0.2]} />
        </mesh>
      </group>

      {/* ===== rack jaringan (pojok belakang kanan) ===== */}
      <Proto obj={P.rack} position={[3.55, 0, -4.5]} />
      <Cable pts={CABLE_RACK_A} r={0.01} mat={M.cableNet} />
      <Cable pts={CABLE_RACK_B} r={0.008} mat={M.cable} />

      {SHOW_STORAGE && <Storage A={A} />}
    </>
  );
}

/* ----------------------------------------------------------------------------
   lingkungan (reflek chrome & lantai) — offline, tanpa download HDRI
---------------------------------------------------------------------------- */
function Env() {
  const { gl, scene } = useThree();
  useEffect(() => {
    let env: THREE.Texture | null = null;
    const pmrem = new THREE.PMREMGenerator(gl);
    try {
      env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
      scene.environment = env;
      (scene as unknown as { environmentIntensity: number }).environmentIntensity = 0.6 * LIGHT;
    } catch (e) {
      // kalau versi three tidak cocok, scene tetap jalan tanpa env
    }
    return () => {
      scene.environment = null;
      env?.dispose();
      pmrem.dispose();
    };
  }, [gl, scene]);
  return null;
}

/* ----------------------------------------------------------------------------
   MODE JALAN-JALAN (perbesar 1 layar + joystick)
---------------------------------------------------------------------------- */
const EYE = 1.6; // tinggi mata (m)
const BODY_R = 0.25; // radius badan untuk tabrakan
const WALK_SPEED = 1.7; // m/detik
const RUN_SPEED = 3.0; // m/detik (tahan Shift)
const START: [number, number] = [-2.5, 3.9]; // dekat pintu, menghadap ke dalam kelas

// kotak penghalang [minX, maxX, minZ, maxZ] — perkiraan dari posisi meja di Room()
const OBSTACLES: [number, number, number, number][] = [
  [-4.1, -3.0, -4.9, 2.9], // meja hitam dinding kiri + kursi
  [3.0, 4.1, -4.9, 2.9], // meja hitam dinding kanan + kursi
  [-3.45, 1.65, -4.95, -3.85], // meja hitam dinding jendela
  [-1.1, 1.1, -2.9, -1.95], // penutup U (sisi jendela)
  [-2.1, -1.1, -2.55, 1.65], // kolom kiri meja kayu + kursi
  [1.1, 2.1, -2.55, 1.65], // kolom kanan meja kayu + kursi
  [-0.85, 1.8, 1.6, 2.35], // meja proyektor + meja dosen
  [3.2, 4.0, -4.9, -4.1], // rak jaringan
];

function isBlocked(x: number, z: number) {
  if (Math.abs(x) > HX - 0.3 || Math.abs(z) > HZ - 0.3) return true;
  for (const [x0, x1, z0, z1] of OBSTACLES) {
    if (x > x0 - BODY_R && x < x1 + BODY_R && z > z0 - BODY_R && z < z1 + BODY_R) return true;
  }
  return false;
}

type WalkInput = {
  mx: number; // joystick kanan(+)/kiri(-)
  my: number; // joystick maju(+)/mundur(-)
  lookDX: number;
  lookDY: number;
  keys: Set<string>;
};

function Walker({ input }: { input: React.MutableRefObject<WalkInput> }) {
  const { camera } = useThree();
  const st = useRef({ x: START[0], z: START[1], yaw: 0, pitch: 0, vx: 0, vz: 0 });

  useEffect(() => {
    camera.rotation.order = "YXZ";
    return () => {
      // balik ke posisi awal untuk OrbitControls
      camera.rotation.order = "XYZ";
      camera.position.set(0, 1.7, 1.2);
      camera.rotation.set(0, 0, 0);
    };
  }, [camera]);

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05); // cegah loncat saat lag
    const s = st.current;
    const inp = input.current;
    const k = inp.keys;

    // --- arah pandang (drag / panah) ---
    const turnKey = (k.has("arrowleft") ? 1 : 0) - (k.has("arrowright") ? 1 : 0);
    const pitchKey = (k.has("arrowup") ? 1 : 0) - (k.has("arrowdown") ? 1 : 0);
    s.yaw += -inp.lookDX * 0.0055 + turnKey * 1.9 * dt;
    s.pitch += -inp.lookDY * 0.0055 + pitchKey * 1.2 * dt;
    s.pitch = Math.max(-1.2, Math.min(1.2, s.pitch));
    inp.lookDX = 0;
    inp.lookDY = 0;

    // --- arah jalan ---
    let f = inp.my + (k.has("w") ? 1 : 0) - (k.has("s") ? 1 : 0);
    let r = inp.mx + (k.has("d") ? 1 : 0) - (k.has("a") ? 1 : 0);
    const len = Math.hypot(f, r);
    if (len > 1) {
      f /= len;
      r /= len;
    }
    const speed = k.has("shift") ? RUN_SPEED : WALK_SPEED;
    const sin = Math.sin(s.yaw), cos = Math.cos(s.yaw);
    const tx = (-sin * f + cos * r) * speed;
    const tz = (-cos * f - sin * r) * speed;

    // percepatan halus (smooth start/stop)
    const a = 1 - Math.exp(-9 * dt);
    s.vx += (tx - s.vx) * a;
    s.vz += (tz - s.vz) * a;

    // tabrakan: sumbu X dan Z dipisah supaya bisa "menyusur" dinding/meja
    const nx = s.x + s.vx * dt;
    if (!isBlocked(nx, s.z)) s.x = nx;
    else s.vx = 0;
    const nz = s.z + s.vz * dt;
    if (!isBlocked(s.x, nz)) s.z = nz;
    else s.vz = 0;

    camera.position.set(s.x, EYE, s.z);
    camera.rotation.set(s.pitch, s.yaw, 0);
  });

  return null;
}

function Joystick({ onChange }: { onChange: (x: number, y: number) => void }) {
  const base = useRef<HTMLDivElement>(null);
  const knob = useRef<HTMLDivElement>(null);
  const idRef = useRef<number | null>(null);
  const R = 48;

  const update = (e: React.PointerEvent) => {
    const rect = base.current!.getBoundingClientRect();
    let dx = e.clientX - (rect.left + rect.width / 2);
    let dy = e.clientY - (rect.top + rect.height / 2);
    const l = Math.hypot(dx, dy);
    if (l > R) {
      dx *= R / l;
      dy *= R / l;
    }
    knob.current!.style.transform = `translate(${dx}px, ${dy}px)`;
    const nx = dx / R, ny = -dy / R;
    const dead = 0.08;
    onChange(Math.abs(nx) < dead ? 0 : nx, Math.abs(ny) < dead ? 0 : ny);
  };
  const end = (e: React.PointerEvent) => {
    if (idRef.current !== e.pointerId) return;
    idRef.current = null;
    knob.current!.style.transform = "translate(0px, 0px)";
    onChange(0, 0);
  };

  return (
    <div
      ref={base}
      onPointerDown={(e) => {
        if (idRef.current !== null) return;
        idRef.current = e.pointerId;
        e.currentTarget.setPointerCapture(e.pointerId);
        update(e);
      }}
      onPointerMove={(e) => idRef.current === e.pointerId && update(e)}
      onPointerUp={end}
      onPointerCancel={end}
      style={{
        position: "absolute",
        left: 24,
        bottom: 28,
        width: 128,
        height: 128,
        borderRadius: "50%",
        background: "rgba(255,255,255,0.22)",
        border: "2px solid rgba(255,255,255,0.65)",
        backdropFilter: "blur(4px)",
        touchAction: "none",
        userSelect: "none",
        zIndex: 3,
      }}
    >
      <div
        ref={knob}
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: 56,
          height: 56,
          marginLeft: -28,
          marginTop: -28,
          borderRadius: "50%",
          background: "rgba(255,255,255,0.85)",
          boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
          willChange: "transform",
          pointerEvents: "none",
        }}
      />
    </div>
  );
}

const roundBtn: React.CSSProperties = {
  position: "absolute",
  width: 42,
  height: 42,
  borderRadius: "50%",
  border: "none",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "rgba(20,24,28,0.72)",
  color: "#fff",
  cursor: "pointer",
  boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
  zIndex: 4,
};

function Scene({
  walking,
  scrollSafe,
  input,
}: {
  walking: boolean;
  scrollSafe: boolean;
  input: React.MutableRefObject<WalkInput>;
}) {
  return (
    <Canvas shadows flat dpr={[1, 1.75]} camera={{ position: [0, 1.7, 1.2], fov: 70, near: 0.1, far: 60 }}>
      <color attach="background" args={["#cfd3d8"]} />
      <Env />
      <hemisphereLight args={["#ffffff", "#e4ddd0", 1.3 * LIGHT]} />
      <ambientLight intensity={0.9 * LIGHT} />
      <directionalLight
        position={[2, H - 0.3, 1]}
        intensity={0.3 * LIGHT}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-6}
        shadow-camera-right={6}
        shadow-camera-top={6}
        shadow-camera-bottom={-6}
        shadow-camera-near={0.5}
        shadow-camera-far={14}
        shadow-bias={-0.0004}
      />
      <Room />
      {/* posisi awal: di dalam ruangan (tetap sama seperti sebelumnya) */}
      {walking ? (
        <Walker input={input} />
      ) : (
        <OrbitControls
          target={[0, 1.3, 0]}
          minDistance={0.5}
          maxDistance={16}
          maxPolarAngle={Math.PI * 0.95}
          enableZoom={!scrollSafe}
        />
      )}
    </Canvas>
  );
}

export default function Ruang805SFD({
  scrollSafe = false,
  className = "",
  style,
}: {
  scrollSafe?: boolean;
  className?: string;
  style?: React.CSSProperties;
} = {}) {
  const [full, setFull] = useState(false);
  const input = useRef<WalkInput>({ mx: 0, my: 0, lookDX: 0, lookDY: 0, keys: new Set() });
  const lookId = useRef<number | null>(null);
  const lookLast = useRef({ x: 0, y: 0 });

  // keyboard + kunci scroll halaman saat mode perbesar
  useEffect(() => {
    if (!full) return;
    const inp = input.current;
    inp.mx = inp.my = inp.lookDX = inp.lookDY = 0;
    inp.keys.clear();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const down = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === "escape") return setFull(false);
      if (["w", "a", "s", "d", "shift", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(k)) {
        inp.keys.add(k);
        if (k.startsWith("arrow")) e.preventDefault();
      }
    };
    const up = (e: KeyboardEvent) => inp.keys.delete(e.key.toLowerCase());
    const blur = () => inp.keys.clear();
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
      inp.keys.clear();
    };
  }, [full]);

  const overlayControls = (
    <>
      {/* area geser untuk menoleh (HP: sentuh & geser, laptop: klik & geser) */}
      <div
        onPointerDown={(e) => {
          if (lookId.current !== null) return;
          lookId.current = e.pointerId;
          lookLast.current = { x: e.clientX, y: e.clientY };
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (lookId.current !== e.pointerId) return;
          input.current.lookDX += e.clientX - lookLast.current.x;
          input.current.lookDY += e.clientY - lookLast.current.y;
          lookLast.current = { x: e.clientX, y: e.clientY };
        }}
        onPointerUp={(e) => {
          if (lookId.current === e.pointerId) lookId.current = null;
        }}
        onPointerCancel={(e) => {
          if (lookId.current === e.pointerId) lookId.current = null;
        }}
        style={{ position: "absolute", inset: 0, touchAction: "none", zIndex: 2, cursor: "grab" }}
      />
      <Joystick
        onChange={(x, y) => {
          input.current.mx = x;
          input.current.my = y;
        }}
      />
      <button type="button" aria-label="Keluar dari perbesar" title="Keluar (Esc)" onClick={() => setFull(false)} style={{ ...roundBtn, right: 14, top: 14 }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
      <div
        style={{
          position: "absolute",
          left: 14,
          top: 14,
          zIndex: 3,
          padding: "6px 10px",
          borderRadius: 10,
          fontSize: 12,
          lineHeight: 1.4,
          color: "#fff",
          background: "rgba(20,24,28,0.6)",
          pointerEvents: "none",
          maxWidth: 260,
        }}
      >
        Joystick / WASD = jalan · geser layar / panah = menoleh · Shift = lari · Esc = keluar
      </div>
    </>
  );

  return (
    <div className={`relative h-full w-full ${className}`} style={{ minHeight: 300, background: "#cfd3d8", ...style }}>
      {/* tampilan biasa (dimatikan saat popup terbuka supaya GPU tidak kerja dobel) */}
      {!full && (
        <>
          <Scene walking={false} scrollSafe={scrollSafe} input={input} />
          <button type="button" aria-label="Perbesar" title="Perbesar" onClick={() => setFull(true)} style={{ ...roundBtn, right: 14, bottom: 14 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
            </svg>
          </button>
        </>
      )}
      {/* popup 1 layar: di-portal ke <body> supaya benar-benar full walau parent punya transform/overflow */}
      {full &&
        typeof document !== "undefined" &&
        createPortal(
          <div style={{ position: "fixed", inset: 0, width: "100vw", height: "100dvh", zIndex: 99999, background: "#cfd3d8" }}>
            <Scene walking scrollSafe={false} input={input} />
            {overlayControls}
          </div>,
          document.body
        )}
    </div>
  );
}

export { Ruang805SFD as Ruang305LE };
