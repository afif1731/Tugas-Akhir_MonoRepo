import { cn } from "~/lib/utils";
import ReactPlayer from 'react-player';

export function HomePage() {
  const isDummy = true;
  
  const dummyVids = ['/videos/ahh.mp4', '/videos/mono-no-aware.mp4', '/videos/rickroll.mp4']
  const videoAmount = 8;

  function createFootage(index: number) {
    if(isDummy) return (
      <img
        src="http://localhost:5001/processed_feed"
        alt="Processed video feed"
        className={cn("w-[720px] h-auto aspect-video shadow-lg border border-gray-600")}
      />
    );
    else return (
      <ReactPlayer
        className={cn('w-3xl bg-black shadow-lg border border-gray-600')}
        src={dummyVids[index % 3]}
        loop
        muted
        playing={true}
        style={{width: '100%', height: 'auto', aspectRatio: '16/9'}}
      />
    )
  }

  let videoList = [];

  for(let i = 0; i < videoAmount; i++) {
    videoList.push(createFootage(i));
  }
  
  return (
    <main className={cn("block min-h-screen w-full")}>
      <div className={cn("flex flex-col w-full h-full pt-6 px-3")}>
        <div className={cn("flex flex-col w-full items-center")}>
          <h1 className={cn("text-cyan-500 font-black text-5xl pb-6")}>CCTV DASHBOARD</h1>
        </div>

        <div>
          <div className={cn("grid grid-cols-4 gap-auto w-full h-fit items-center justify-items-center")}>
            {
              videoList.map((video, index) => (
                <div
                  className={cn('w-full h-fit')}
                  key={`video-${index}`}
                >
                  {video}
                </div>
              ))
            }
          </div>
        </div>
      </div>
    </main>
  );
}
