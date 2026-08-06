import { useEffect, useRef, useState } from "react";
import { Star } from "lucide-react";
import { useTheme } from "../lib/ThemeContext";
import type { ThemeTokens } from "../lib/styles";

interface FavouriteStarProps {
  isFavourite: boolean;
  onToggle: () => void;
  title: string;
  size?: number;
}

/** Shared favourite-star toggle (ResultRow, ResultCard, RecipeCard) — a
 *  Lucide Star icon with a brief scale "pop" on toggle (4.7). */
export default function FavouriteStar({ isFavourite, onToggle, title, size = 18 }: FavouriteStarProps) {
  const { tokens: t } = useTheme();
  const [popping, setPopping] = useState(false);
  const wasFavourite = useRef(isFavourite);

  useEffect(() => {
    if (isFavourite !== wasFavourite.current) {
      wasFavourite.current = isFavourite;
      setPopping(true);
      const id = setTimeout(() => setPopping(false), 200);
      return () => clearTimeout(id);
    }
  }, [isFavourite]);

  return (
    <button
      onClick={(e) => { e.stopPropagation(); onToggle(); }}
      aria-pressed={isFavourite}
      aria-label={title}
      title={title}
      className={popping ? "trf-pop" : undefined}
      style={starBtnStyle(t, isFavourite)}
    >
      <Star size={size} fill={isFavourite ? "currentColor" : "none"} />
    </button>
  );
}

function starBtnStyle(t: ThemeTokens, isFavourite: boolean): React.CSSProperties {
  return {
    background: "none",
    border: "none",
    minWidth: "40px",
    minHeight: "40px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    color: isFavourite ? t.secondaryAccent : t.textFaint,
    cursor: "pointer",
    lineHeight: 1,
    flexShrink: 0,
  };
}
