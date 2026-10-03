export const runtime = "edge";

export async function GET() {
  const svg = `
  <svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="bg" cx="25%" cy="0%" r="100%">
        <stop offset="0%" stop-color="#16202c"/>
        <stop offset="45%" stop-color="#0b0e13"/>
        <stop offset="100%" stop-color="#020304"/>
      </radialGradient>
      <radialGradient id="bubble" cx="36%" cy="28%" r="72%">
        <stop offset="0%" stop-color="#263648" stop-opacity="0.55"/>
        <stop offset="55%" stop-color="#0f1720" stop-opacity="0.92"/>
        <stop offset="100%" stop-color="#05080c"/>
      </radialGradient>
      <linearGradient id="rim" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#e7f2ff" stop-opacity="0.75"/>
        <stop offset="34%" stop-color="#8fa7c0" stop-opacity="0.55"/>
        <stop offset="68%" stop-color="#526272" stop-opacity="0.18"/>
        <stop offset="100%" stop-color="#c8d8e8" stop-opacity="0.48"/>
      </linearGradient>
      <filter id="shadow" x="-40%" y="-40%" width="180%" height="180%">
        <feGaussianBlur stdDeviation="18"/>
      </filter>
    </defs>

    <rect width="1200" height="630" fill="url(#bg)"/>
    <ellipse cx="596" cy="538" rx="246" ry="26" fill="#000" opacity="0.7" filter="url(#shadow)"/>

    <circle cx="600" cy="310" r="192" fill="url(#bubble)"/>
    <circle cx="600" cy="310" r="192" fill="none" stroke="url(#rim)" stroke-width="9"/>
    <ellipse cx="533" cy="201" rx="89" ry="41" fill="#d9e8f7" opacity="0.12" transform="rotate(-28 533 201)"/>
    <ellipse cx="697" cy="417" rx="91" ry="22" fill="#d8e5f2" opacity="0.16" transform="rotate(-38 697 417)"/>

    <text x="600" y="333" fill="#ffffff" font-family="Arial, Helvetica, sans-serif" font-size="50" font-weight="700" text-anchor="middle" letter-spacing="1">YNOTWORLD</text>
  </svg>`;

  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=86400, s-maxage=86400",
    },
  });
}
