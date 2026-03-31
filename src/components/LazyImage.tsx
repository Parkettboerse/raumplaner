"use client";

import { useRef, useState, useEffect } from "react";

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
}

export default function LazyImage({ src, alt, className }: LazyImageProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "100px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={className}>
      {visible ? (
        <img src={src} alt={alt} className="h-full w-full object-cover" />
      ) : (
        <div
          className="h-full w-full animate-pulse"
          style={{ backgroundColor: "var(--oak-pale)" }}
        />
      )}
    </div>
  );
}
