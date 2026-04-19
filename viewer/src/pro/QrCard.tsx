/**
 * Hübsche QR-Code-Karte mit GitLaw-Branding.
 *
 * Verwendet in der Intake-Share-Dialog UND als eigenes Vollbild für
 * Termin-Situationen, in denen der Anwalt sein iPad/Laptop vor sich
 * hat und der Mandant mit dem Handy scannt.
 *
 * Visuelle Entscheidungen:
 *   - Goldener gerundeter Rahmen (passend zur Kanzlei-Farbe)
 *   - Subtiles Logo (⚖) zentriert im QR (qrcode.react excavate=true)
 *   - Hover: leichte Vergrößerung + Schatten — wirkt „lebendig"
 *   - Vollbild-Modus: dunkler Hintergrund, gigantischer QR (≥80% Höhe)
 *     für maximale Scan-Distanz aus 2-3 Metern
 *   - Animierter „Zum Scannen" Pfeil für Mandant:innen, die noch nie
 *     einen QR gesehen haben
 */

import { useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Maximize2, X, Smartphone } from 'lucide-react'

// Schwarzer Kreis mit goldenem G — scant zuverlässig, kanzlei-passend.
// Wir nutzen excavate=true im QR, daher wird das Logo auf weißem
// Untergrund platziert. Dunkler Kreis sorgt für klaren Kontrast.
const LOGO_SVG = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'>
  <circle cx='16' cy='16' r='15' fill='%231A1A1A'/>
  <text x='16' y='22.5' text-anchor='middle' font-family='Georgia, serif' font-size='20' fill='%23C08B20' font-weight='bold'>G</text>
</svg>`
const LOGO_DATA_URL = `data:image/svg+xml;utf8,${LOGO_SVG.replace(/\n\s*/g, '')}`

interface Props {
  url: string
  size?: number
  /** Headline next to/below the QR (e.g. "Mandant:innen-Fragebogen") */
  caption?: string
  /** Compact = side card; large = standalone */
  variant?: 'compact' | 'standalone'
}

export default function QrCard({ url, size = 140, caption, variant = 'compact' }: Props) {
  const [fullscreen, setFullscreen] = useState(false)

  return (
    <>
      <div className="group relative inline-flex flex-col items-center gap-2">
        <div
          onClick={() => setFullscreen(true)}
          className="relative cursor-zoom-in transition-all duration-200 group-hover:scale-105 group-hover:shadow-lg"
        >
          {/* Goldener Rahmen */}
          <div className="bg-gradient-to-br from-[var(--color-gold)] to-[#d9a03a] p-1 rounded-2xl shadow-md">
            <div className="bg-white p-3 rounded-xl">
              <QRCodeSVG
                value={url}
                size={size}
                level="H"
                marginSize={2}
                fgColor="#1A1A1A"
                bgColor="#FFFFFF"
                imageSettings={{
                  src: LOGO_DATA_URL,
                  height: Math.round(size * 0.18),
                  width: Math.round(size * 0.18),
                  excavate: true,
                }}
              />
            </div>
          </div>
          {/* Vergrößern-Hint */}
          <div className="absolute top-1 right-1 bg-white/80 backdrop-blur-sm rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Maximize2 className="w-3 h-3 text-[var(--color-ink-soft)]" />
          </div>
        </div>
        {caption && (
          <p className="text-xs text-[var(--color-ink-muted)] text-center max-w-[160px]">
            {caption}
          </p>
        )}
        {variant === 'compact' && (
          <div className="flex items-center gap-1 text-[10px] text-[var(--color-ink-muted)]">
            <Smartphone className="w-3 h-3" />
            <span>klicken für Vollbild</span>
          </div>
        )}
      </div>

      {fullscreen && (
        <div
          className="fixed inset-0 z-[60] bg-[var(--color-ink)] flex flex-col items-center justify-center p-6"
          onClick={() => setFullscreen(false)}
        >
          <button
            onClick={() => setFullscreen(false)}
            className="absolute top-6 right-6 text-white/70 hover:text-white"
            aria-label="Schließen"
          >
            <X className="w-8 h-8" />
          </button>

          <div className="text-center mb-8 max-w-md">
            <h2 className="text-3xl font-semibold text-white mb-2">
              Bitte mit dem Handy scannen
            </h2>
            <p className="text-white/70 text-sm">
              {caption || 'Öffnen Sie die Kamera Ihres Handys und richten Sie sie auf den Code unten.'}
            </p>
          </div>

          <div
            onClick={e => e.stopPropagation()}
            className="bg-gradient-to-br from-[var(--color-gold)] to-[#d9a03a] p-2 rounded-3xl shadow-2xl"
          >
            <div className="bg-white p-6 rounded-2xl">
              <QRCodeSVG
                value={url}
                size={Math.min(window.innerWidth - 100, window.innerHeight - 240, 480)}
                level="H"
                marginSize={2}
                fgColor="#1A1A1A"
                bgColor="#FFFFFF"
                imageSettings={{
                  src: LOGO_DATA_URL,
                  height: 60,
                  width: 60,
                  excavate: true,
                }}
              />
            </div>
          </div>

          <div className="mt-6 flex items-center gap-3 text-white/80">
            <Smartphone className="w-5 h-5" />
            <span className="text-sm">Klicken oder ESC zum Schließen</span>
          </div>
        </div>
      )}
    </>
  )
}
