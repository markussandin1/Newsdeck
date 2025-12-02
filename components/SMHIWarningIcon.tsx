'use client';

export type SMHISeverity = 'Moderate' | 'Severe' | 'Extreme';

interface SMHIWarningIconProps {
  severity: SMHISeverity;
  size?: number;
  className?: string;
}

// SMHI warning icon colors
const severityColors = {
  Moderate: '#facc15',  // yellow-400
  Severe: '#f97316',    // orange-500
  Extreme: '#ef4444',   // red-500
};

export function SMHIWarningIcon({ severity, size = 24, className = '' }: SMHIWarningIconProps) {
  const color = severityColors[severity];

  // Common SVG properties
  const svgProps = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    className,
  };

  if (severity === 'Moderate') {
    // Gul varning - Circle with exclamation
    return (
      <svg {...svgProps}>
        <circle
          cx="12"
          cy="12"
          r="10"
          fill={color}
          opacity="0.9"
          stroke={color}
          strokeWidth="2"
        />
        <text
          x="12"
          y="17"
          fontSize="14"
          fontWeight="bold"
          textAnchor="middle"
          fill="#000"
        >
          !
        </text>
      </svg>
    );
  }

  if (severity === 'Severe') {
    // Orange varning - Diamond with exclamation
    return (
      <svg {...svgProps}>
        <path
          d="M12 2 L22 12 L12 22 L2 12 Z"
          fill={color}
          opacity="0.9"
          stroke={color}
          strokeWidth="2"
        />
        <text
          x="12"
          y="16"
          fontSize="12"
          fontWeight="bold"
          textAnchor="middle"
          fill="#000"
        >
          !
        </text>
      </svg>
    );
  }

  // Extreme - Röd varning - Triangle with exclamation
  return (
    <svg {...svgProps}>
      <path
        d="M12 2 L22 20 L2 20 Z"
        fill={color}
        opacity="0.9"
        stroke={color}
        strokeWidth="2"
      />
      <text
        x="12"
        y="16"
        fontSize="12"
        fontWeight="bold"
        textAnchor="middle"
        fill="#000"
      >
        !
      </text>
    </svg>
  );
}
