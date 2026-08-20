import React from 'react';

interface GooeyMarqueeProps {
  text: string;
  className?: string;
  speed?: number;
  bgColor?: string;
  textColor?: string;
  fontSize?: string;
  fontWeight?: string | number;
  fontFamily?: string;
  letterSpacing?: string;
  width?: string;
  height?: string;
  style?: React.CSSProperties;
}

export function GooeyMarquee({
  text,
  className = "",
  speed = 8,
  bgColor = "#0A1812",
  textColor = "#FAF8F3",
  fontSize = "1.5rem",
  fontWeight = 700,
  fontFamily = "var(--font-display)",
  letterSpacing = "-0.01em",
  width = "140px",
  height = "36px",
  style
}: GooeyMarqueeProps) {
  return (
    <div 
      className={className} 
      style={{
        position: 'relative',
        width,
        height,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        transition: 'background-color 400ms ease, color 400ms ease',
        ...style
      }}
    >
      {/* Blur layer with gooey effect */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: bgColor,
          backgroundImage: `
            linear-gradient(to right, ${bgColor}, 0.6rem, transparent 50%),
            linear-gradient(to left, ${bgColor}, 0.6rem, transparent 50%)
          `,
          filter: "contrast(15)",
          transition: 'background-color 400ms ease',
        }}
      >
        <p
          className="animate-marquee"
          style={{
            position: 'absolute',
            minWidth: '100%',
            whiteSpace: 'nowrap',
            filter: "blur(0.04em)",
            animation: `marquee ${speed}s infinite linear`,
            margin: 0,
            color: textColor,
            fontSize,
            fontWeight,
            fontFamily,
            letterSpacing,
            textAlign: 'center',
            transition: 'color 400ms ease',
          }}
        >
          {text}
        </p>
      </div>

      {/* Clear text layer on top */}
      <div 
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none'
        }}
      >
        <p
          className="animate-marquee"
          style={{
            position: 'absolute',
            minWidth: '100%',
            whiteSpace: 'nowrap',
            animation: `marquee ${speed}s infinite linear`,
            margin: 0,
            color: textColor,
            fontSize,
            fontWeight,
            fontFamily,
            letterSpacing,
            textAlign: 'center',
            transition: 'color 400ms ease',
          }}
        >
          {text}
        </p>
      </div>

      <style>{`
        @keyframes marquee {
          from { transform: translateX(65%); }
          to { transform: translateX(-65%); }
        }
      `}</style>
    </div>
  );
}
