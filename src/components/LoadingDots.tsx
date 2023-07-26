export default function LoadingDots() {
  return (
    <div className="flex flex-shrink">
      <div
        className="-translate-y-1/4 transform animate-bounce"
        style={{
          animationDelay: "250ms",
        }}
      >
        .
      </div>
      <div
        className="-translate-y-1/4 transform animate-bounce"
        style={{
          animationDelay: "500ms",
        }}
      >
        .
      </div>
      <div
        className="-translate-y-1/4 transform animate-bounce"
        style={{
          animationDelay: "750ms",
        }}
      >
        .
      </div>
    </div>
  );
}
