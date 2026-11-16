import { useEffect } from "react";

const pieces = ["🎉", "🍽️", "✨", "🥳", "⭐", "🎊", "✨", "🍴", "🎉", "⭐"];

interface CelebrationProps {
  onDone: () => void;
}

export function Celebration({ onDone }: CelebrationProps) {
  useEffect(() => {
    const timeout = window.setTimeout(onDone, 1300);
    return () => window.clearTimeout(timeout);
  }, [onDone]);
  return (
    <div className="celebration" aria-hidden="true">
      {pieces.map((piece, index) => {
        const angle = (index / pieces.length) * 2 * Math.PI - Math.PI / 2;
        const distance = 110 + (index % 3) * 30;
        return (
          <span
            key={index}
            style={
              {
                "--burst-x": `${Math.round(Math.cos(angle) * distance)}px`,
                "--burst-y": `${Math.round(Math.sin(angle) * distance - 40)}px`,
                "--burst-rotation": `${(index % 2 ? 1 : -1) * (90 + index * 20)}deg`,
                animationDelay: `${(index % 4) * 40}ms`,
              } as React.CSSProperties
            }
          >
            {piece}
          </span>
        );
      })}
    </div>
  );
}
