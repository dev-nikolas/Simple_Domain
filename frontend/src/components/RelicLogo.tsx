import React from 'react';

export interface RelicLogoProps {
  variant?: 'mark' | 'full';
  size?: number | string;
  className?: string;
  color?: string;
  withBackground?: boolean;
}

const MARK_PATH =
  'M 31 29 L 269 29 L 275 33 L 278 41 L 277 287 L 273 295 L 265 302 L 256 305 L 221 305 ' +
  'L 164 246 L 154 235 L 149 226 L 149 214 L 154 204 L 202 156 L 202 112 L 196 105 L 192 103 ' +
  'L 68 104 L 64 100 L 64 75 L 67 72 L 216 72 L 226 77 L 234 89 L 234 165 L 226 177 ' +
  'L 187 215 L 186 225 L 234 273 L 239 274 L 243 272 L 246 267 L 246 70 L 244 65 L 237 60 ' +
  'L 61 61 L 53 69 L 53 111 L 56 114 L 151 115 L 163 121 L 171 133 L 172 164 L 169 172 ' +
  'L 124 219 L 126 226 L 167 273 L 169 277 L 169 295 L 166 301 L 160 305 L 32 306 ' +
  'L 23 301 L 21 297 L 21 186 L 23 182 L 30 178 L 43 178 L 52 184 L 53 264 L 59 272 ' +
  'L 126 273 L 127 271 L 101 246 L 97 240 L 93 229 L 93 212 L 102 195 L 140 156 L 140 151 ' +
  'L 136 147 L 29 146 L 23 142 L 21 138 L 21 39 L 23 34 L 30 30 Z';

const LETTER_PATHS = [
  'M 21 333 L 44 333 L 48 337 L 48 348 L 41 354 L 48 361 L 48 370 L 44 370 L 44 363 L 33 353 L 26 353 L 25 354 L 25 368 L 24 370 L 21 370 Z M 28 348 L 26 348 L 26 338 L 29 337 L 43 337 L 43 348 Z',
  'M 79 333 L 105 333 L 104 337 L 103 336 L 102 337 L 84 337 L 82 339 L 82 348 L 84 350 L 100 350 L 100 353 L 97 354 L 83 354 L 82 355 L 82 365 L 83 366 L 104 366 L 105 370 L 79 370 L 78 369 L 78 345 L 79 344 L 78 334 Z',
  'M 136 333 L 140 333 L 140 365 L 141 366 L 162 366 L 162 370 L 136 370 Z',
  'M 194 333 L 220 333 L 220 336 L 210 337 L 209 338 L 209 350 L 208 351 L 209 353 L 208 364 L 210 366 L 219 366 L 220 367 L 219 370 L 194 370 L 194 366 L 203 366 L 205 364 L 205 338 L 204 337 L 194 337 Z',
  'M 255 333 L 273 333 L 278 338 L 278 342 L 274 342 L 273 337 L 256 337 L 255 338 L 255 365 L 256 366 L 272 366 L 274 364 L 275 360 L 278 361 L 277 366 L 273 370 L 255 370 L 251 366 L 251 338 Z'
];

export const RelicLogo: React.FC<RelicLogoProps> = ({
  variant = 'mark',
  size = 32,
  className = '',
  color = '#ff1f3d',
  withBackground = false,
}) => {
  const isFull = variant === 'full';
  const viewBox = isFull ? '0 0 300 395' : '15 20 270 295';
  const height = typeof size === 'number' && isFull ? (size * 395) / 300 : size;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={viewBox}
      width={size}
      height={height}
      className={`inline-block shrink-0 select-none ${className}`}
      aria-label="RELIC Logo"
      role="img"
    >
      {withBackground && (
        <rect
          x={isFull ? 0 : 15}
          y={isFull ? 0 : 20}
          width={isFull ? 300 : 270}
          height={isFull ? 395 : 295}
          fill="#050508"
          rx="6"
        />
      )}
      <path d={MARK_PATH} fill={color} fillRule="evenodd" />
      {isFull &&
        LETTER_PATHS.map((d, i) => (
          <path key={i} d={d} fill={color} fillRule="evenodd" />
        ))}
    </svg>
  );
};

export default RelicLogo;

