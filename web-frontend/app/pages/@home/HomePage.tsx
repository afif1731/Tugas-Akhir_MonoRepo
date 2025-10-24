import { cn } from "~/lib/utils";

export function HomePage() {
  return (
    <main className={cn("block h-screen w-full")}>
      <div className={cn("flex flex-col w-full h-full py-6")}>
        <div className={cn("flex flex-col w-full items-center")}>
          <h1 className={cn("text-cyan-500 font-black text-5xl")}>CCTV DASHBOARD</h1>
        </div>

        <div className={cn("flex w-full h-full items-center justify-center")}>
          <img
            src="http://localhost:5001/processed_feed"
            alt="Processed video feed"
            className={cn("w-[720px] h-auto aspect-video rounded-xl shadow-lg border border-gray-600")}
          />
        </div>
      </div>
    </main>
  );
}
