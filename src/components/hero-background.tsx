export function HeroBackground() {
  return (
    <div className="absolute inset-0 z-0 overflow-hidden">
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 1220 810"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid slice"
        className="opacity-60"
      >
        <g clipPath="url(#clip0_hero)">
          <mask
            id="mask0_hero"
            style={{ maskType: "alpha" }}
            maskUnits="userSpaceOnUse"
            x="10"
            y="-1"
            width="1200"
            height="812"
          >
            <rect x="10" y="-0.84668" width="1200" height="811.693" fill="url(#paint0_linear_hero)" />
          </mask>
          <g mask="url(#mask0_hero)">
            {/* Grid Rectangles */}
            {[...Array(35)].map((_, i) => (
              <>
                {[...Array(20)].map((_, j) => (
                  <rect
                    key={`grid-${i}-${j}`}
                    x={-20.0891 + i * 36}
                    y={9.2 + j * 36}
                    width="35.6"
                    height="35.6"
                    stroke="#131313"
                    strokeOpacity="0.08"
                    strokeWidth="0.4"
                    strokeDasharray="2 2"
                  />
                ))}
              </>
            ))}
          </g>
        </g>
        <defs>
          <linearGradient
            id="paint0_linear_hero"
            x1="610"
            y1="-0.84668"
            x2="610"
            y2="810.846"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#FF3D00" stopOpacity="0.1" />
            <stop offset="1" stopColor="#FF3D00" stopOpacity="0" />
          </linearGradient>
          <clipPath id="clip0_hero">
            <rect width="1220" height="810" fill="white" />
          </clipPath>
        </defs>
      </svg>
      
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5" />
    </div>
  )
}