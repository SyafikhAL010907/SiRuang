'use client';

import React from 'react';

/* ------------------------------------------------------------------ */
/*  Palette                                                            */
/* ------------------------------------------------------------------ */
export const PALETTE = {
  pageWhite: '#FFFFFF',
  charcoalNoir: '#2B2B2B',
  ironcladGrey: '#565656',
  urbanFog: '#848484',
  moonlitSilver: '#B3B3B3',
  cloudVeil: '#E0E0E0',
  progressFill: '#D8D8D8',
} as const;

/* Ornamen garis progress (taruh kedua file ini di folder public/) */
const BATIK_LEFT = '/batikgariskiri.png';
const BATIK_RIGHT = '/batikgariskanan.png';

/* Background batik (taruh file ini di folder public/) */
const BATIK_BG = '/BatikLoad.png';

/* ------------------------------------------------------------------ */
/*  Fallback logo (ganti dengan logo asli lewat prop `logoSrc`)        */
/* ------------------------------------------------------------------ */
function DefaultMark() {
  const leaf = 'M60 60 C58 36 78 14 108 12 C110 42 90 62 60 60Z';
  const angles = [0, 90, 180, 270];
  return (
    <svg className="pl-mark" viewBox="0 0 120 120" aria-hidden="true">
      {angles.map((a, i) => (
        <g key={`l${a}`} transform={`rotate(${a} 60 60)`}>
          <path
            className="pl-petal"
            d={leaf}
            fill={PALETTE.cloudVeil}
            stroke={PALETTE.charcoalNoir}
            strokeWidth="3"
            strokeLinejoin="round"
            style={{ animationDelay: `${550 + i * 130}ms` }}
          />
        </g>
      ))}
      {angles.map((a, i) => (
        <g key={`d${a}`} transform={`rotate(${a} 60 60)`}>
          <g transform="translate(60 8) rotate(45)">
            <rect
              className="pl-petal"
              x="-5"
              y="-5"
              width="10"
              height="10"
              fill={PALETTE.moonlitSilver}
              style={{ animationDelay: `${1000 + i * 90}ms` }}
            />
          </g>
        </g>
      ))}
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */
type LoadingPageProps = {
  /** 0 – 100 */
  progress: number;
  /** true → konten memudar, lalu tirai membuka ke kiri & kanan */
  exiting?: boolean;
  title?: string;
  /** path logo, mis. "/images/logo.png". Kosong = pakai logo bawaan */
  logoSrc?: string;
};

export default function LoadingPage({
  progress,
  exiting = false,
  title = 'Selamat Datang Di SiRuang',
  logoSrc,
}: LoadingPageProps) {
  const value = Math.min(100, Math.max(0, progress));
  const label = `${Math.round(value)}%`;
  const hidden = 100 - value;

  // Ornamen "terisi" dari ujung luar menuju logo.
  // Bar kiri: ujung luar = kiri. Bar kanan: ujung luar = kanan.
  // Bar kanan di-flip horizontal (scaleX(-1)) lewat CSS, jadi koordinat clip-nya ikut terbalik.
  const fillLeft: React.CSSProperties = {
    clipPath: `inset(-24px ${hidden}% -24px -24px)`,
  };
  const fillRight: React.CSSProperties = {
    clipPath: `inset(-24px ${hidden}% -24px -24px)`,
  };

  let charIndex = 0;
  const words = title.split(' ');

  return (
    <div
      className="pl-root"
      data-exiting={exiting}
      role="progressbar"
      aria-label="Memuat halaman"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(value)}
    >
      <style>{css}</style>

      {/* Dua setengah layar: saat selesai, membuka seperti tirai */}
      <div className="pl-half pl-half--l">
        <div className="pl-bg" />
      </div>
      <div className="pl-half pl-half--r">
        <div className="pl-bg" />
      </div>

      <div className="pl-content">
        <h1 className="pl-title" aria-label={title}>
          {words.map((word, wi) => (
            <React.Fragment key={wi}>
              <span className="pl-word" aria-hidden="true">
                {Array.from(word).map((ch) => {
                  const i = charIndex++;
                  return (
                    <span
                      key={i}
                      className="pl-char"
                      style={{ animationDelay: `${350 + i * 26}ms` }}
                    >
                      {ch}
                    </span>
                  );
                })}
              </span>
              {wi < words.length - 1 ? ' ' : null}
            </React.Fragment>
          ))}
        </h1>

        <div className="pl-row">
          <span className="pl-pct pl-pct--l">{label}</span>

          <div className="pl-bar pl-bar--l" aria-hidden="true">
            <div className="pl-orn-box">
              <div className="pl-orn pl-orn--track" />
              <div className="pl-glow">
                <div className="pl-orn pl-orn--fill" style={fillLeft} />
              </div>
            </div>
          </div>

          <div className="pl-logo">
            {logoSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img className="pl-img" src={logoSrc} alt="" draggable={false} />
            ) : (
              <DefaultMark />
            )}
          </div>

          <div className="pl-bar pl-bar--r" aria-hidden="true">
            <div className="pl-orn-box">
              <div className="pl-orn pl-orn--track" />
              <div className="pl-glow">
                <div className="pl-orn pl-orn--fill" style={fillRight} />
              </div>
            </div>
          </div>

          <span className="pl-pct pl-pct--r">{label}</span>
        </div>

        <p className="pl-status">
          Loading
          <span className="pl-dot" style={{ animationDelay: '0s' }}>.</span>
          <span className="pl-dot" style={{ animationDelay: '0.15s' }}>.</span>
          <span className="pl-dot" style={{ animationDelay: '0.3s' }}>.</span>
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Styles (scoped dengan prefix .pl-, tidak butuh Tailwind)           */
/* ------------------------------------------------------------------ */
const css = `
.pl-root{
  position:fixed;inset:0;z-index:9999;overflow:hidden;
  color:#000000;
  font-family:var(--font-montserrat),'Montserrat',system-ui,-apple-system,'Segoe UI',sans-serif;
}
.pl-root[data-exiting='true']{pointer-events:none}

/* ---------- tirai ---------- */
.pl-half{
  position:absolute;top:0;bottom:0;width:calc(50% + 1px);overflow:hidden;
  background:${PALETTE.pageWhite};
  will-change:transform;
  transition:transform 900ms cubic-bezier(.77,0,.18,1) 380ms;
}
.pl-half--l{left:0}
.pl-half--r{right:0}
.pl-root[data-exiting='true'] .pl-half--l{transform:translateX(-101%)}
.pl-root[data-exiting='true'] .pl-half--r{transform:translateX(101%)}

.pl-bg{
  position:absolute;top:0;bottom:0;width:100vw;
  background-color:${PALETTE.pageWhite};
  background-image:url('${BATIK_BG}');
  background-size:cover;
  background-repeat:no-repeat;
  background-position:center;
  animation:pl-fade 800ms ease both;
}
.pl-half--l .pl-bg{left:0}
.pl-half--r .pl-bg{right:0}

/* ---------- konten ---------- */
.pl-content{
  position:absolute;inset:0;
  display:flex;flex-direction:column;align-items:center;justify-content:center;
  gap:clamp(40px,8vh,96px);
  padding:0 clamp(16px,6vw,120px);
  transition:opacity 420ms ease, transform 420ms ease;
}
.pl-root[data-exiting='true'] .pl-content{opacity:0;transform:scale(.96)}

.pl-title{
  margin:0;padding-left:.22em;text-align:center;
  font-size:clamp(13px,1.7vw,26px);font-weight:700;
  letter-spacing:.22em;line-height:1.6;
  color:#000000;
}
.pl-word{display:inline-block;white-space:nowrap}
.pl-char{display:inline-block;animation:pl-rise 700ms cubic-bezier(.22,1,.36,1) both}

.pl-row{
  display:flex;align-items:center;width:100%;max-width:1520px;
  gap:clamp(8px,1.6vw,28px);
}
.pl-pct{
  flex:none;width:3.4ch;
  font-size:clamp(13px,1.4vw,22px);font-weight:700;
  font-variant-numeric:tabular-nums;color:${PALETTE.ironcladGrey};
  animation:pl-fade 600ms ease 1000ms both;
}
.pl-pct--l{text-align:left}
.pl-pct--r{text-align:right}

/* ---------- garis progress batik ---------- */
.pl-bar{position:relative;flex:1;min-width:0;align-self:center}
.pl-bar--l{
  aspect-ratio:1539/419;
  animation:pl-unfold-l 1100ms cubic-bezier(.22,1,.36,1) 650ms both;
}
.pl-bar--r{
  aspect-ratio:1533/432;
  animation:pl-unfold-r 1100ms cubic-bezier(.22,1,.36,1) 650ms both;
}
.pl-orn-box{position:absolute;inset:0}
.pl-bar--r .pl-orn-box{transform:translateY(-1.4%) scaleX(-1)} /* balik batik kanan: ornamen besar menghadap ke dalam (dekat logo) */ /* samakan tinggi garis tengah dengan sisi kiri */

.pl-orn{
  position:absolute;inset:0;
  -webkit-mask-repeat:no-repeat;mask-repeat:no-repeat;
  -webkit-mask-size:100% 100%;mask-size:100% 100%;
}
.pl-bar--l .pl-orn{
  -webkit-mask-image:url('${BATIK_LEFT}');mask-image:url('${BATIK_LEFT}');
}
.pl-bar--r .pl-orn{
  -webkit-mask-image:url('${BATIK_RIGHT}');mask-image:url('${BATIK_RIGHT}');
}
/* track (kondisi awal) = gambar batik asli dengan warna aslinya, tanpa mask/tint */
.pl-bar--l .pl-orn--track{
  background:url('${BATIK_LEFT}') center / 100% 100% no-repeat;
  -webkit-mask-image:none;mask-image:none;
}
.pl-bar--r .pl-orn--track{
  background:url('${BATIK_RIGHT}') center / 100% 100% no-repeat;
  -webkit-mask-image:none;mask-image:none;
}
.pl-glow{
  position:absolute;inset:0;
  filter:drop-shadow(0 0 6px rgba(216,216,216,.35));
}
.pl-orn--fill{background:${PALETTE.progressFill}}

/* ---------- logo (transparan, tanpa piringan) ---------- */
.pl-logo{
  position:relative;flex:none;
  width:clamp(190px,24vw,360px);aspect-ratio:1;
  top:-2.4vw; /* naikkan logo agar sejajar dengan garis batik */
  background:transparent;
  display:grid;place-items:center;
}
.pl-mark{position:relative;width:100%;height:100%;overflow:visible;object-fit:contain}
.pl-petal{
  transform-origin:60px 60px;
  animation:pl-pop 750ms cubic-bezier(.22,1,.36,1) both;
}
.pl-img{
  position:relative;display:block;width:100%;height:100%;object-fit:contain;
  background:transparent;box-shadow:none;
  user-select:none;
  animation:pl-pop 750ms cubic-bezier(.22,1,.36,1) 550ms both;
}

/* ---------- status ---------- */
.pl-status{
  margin:0;padding-left:.14em;
  font-size:clamp(16px,1.6vw,24px);font-weight:700;letter-spacing:.14em;
  color:#000000;
  animation:pl-fade 700ms ease 1100ms both;
}
.pl-dot{display:inline-block;animation:pl-blink 1.2s ease-in-out infinite both}

/* ---------- keyframes ---------- */
@keyframes pl-fade{from{opacity:0}}
@keyframes pl-rise{from{opacity:0;transform:translateY(14px);filter:blur(6px)}}
@keyframes pl-pop{from{opacity:0;transform:scale(.35) rotate(-24deg)}}
@keyframes pl-breathe{0%,100%{transform:scale(1)}50%{transform:scale(1.05)}}
@keyframes pl-blink{0%,80%,100%{opacity:.15}40%{opacity:1}}
/* ornamen membuka dari logo ke arah luar */
@keyframes pl-unfold-l{
  from{clip-path:inset(-24px -24px -24px 100%)}
  to{clip-path:inset(-24px -24px -24px -24px)}
}
@keyframes pl-unfold-r{
  from{clip-path:inset(-24px 100% -24px -24px)}
  to{clip-path:inset(-24px -24px -24px -24px)}
}

/* ---------- mobile: persen mengapit logo, ornamen menyatu di bawahnya ---------- */
@media (max-width:700px){
  .pl-title{letter-spacing:.16em}
  .pl-row{
    display:grid;grid-template-columns:repeat(6,1fr);
    row-gap:clamp(10px,2.5vh,22px);column-gap:0;
  }
  .pl-pct{width:auto}
  .pl-pct--l{grid-column:1 / 3;grid-row:1}
  .pl-logo{grid-column:3 / 5;grid-row:1;justify-self:center;width:100%;max-width:200px;top:0}
  .pl-pct--r{grid-column:5 / 7;grid-row:1}
  .pl-bar{width:100%}
  .pl-bar--l{grid-column:1 / 4;grid-row:2}
  .pl-bar--r{grid-column:4 / 7;grid-row:2}
}

@media (prefers-reduced-motion:reduce){
  .pl-root *, .pl-root *::before{animation:none !important}
  .pl-half{transition:none !important}
  .pl-content{transition:none !important}
  .pl-root{transition:opacity 300ms ease}
  .pl-root[data-exiting='true']{opacity:0}
  .pl-root[data-exiting='true'] .pl-half--l,
  .pl-root[data-exiting='true'] .pl-half--r{transform:none}
}
`;
