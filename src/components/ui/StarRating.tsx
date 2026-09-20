"use client";

/**
 * StarRating：通关星级展示（需求 #28）。
 * 获得 ★ 金色，未获得 ☆ 灰色轮廓。
 */

interface StarRatingProps {
  stars: 1 | 2 | 3;
  size?: number;
}

export function StarRating({ stars, size = 40 }: StarRatingProps) {
  return (
    <div className="flex items-center gap-1" aria-label={`获得 ${stars} 颗星`}>
      {[1, 2, 3].map((i) => (
        <span
          key={i}
          style={{ fontSize: size, lineHeight: 1 }}
          className={i <= stars ? "text-amber-400" : "text-neutral-300"}
          aria-hidden
        >
          {i <= stars ? "★" : "☆"}
        </span>
      ))}
    </div>
  );
}
