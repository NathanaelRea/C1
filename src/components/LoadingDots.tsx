export default function LoadingDots() {
  return (
    <div className="flex flex-shrink">
      <div
        className="animate-bounce -translate-y-1/4 transform"
        style={{
          animationDelay: "250ms",
        }}
      >
        .
      </div>
      <div
        className="animate-bounce -translate-y-1/4 transform"
        style={{
          animationDelay: "500ms",
        }}
      >
        .
      </div>
      <div
        className="animate-bounce -translate-y-1/4 transform"
        style={{
          animationDelay: "750ms",
        }}
      >
        .
      </div>
    </div>
  );
}
