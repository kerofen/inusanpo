import { Composition } from "remotion";
import { WanConnectPV } from "./WanConnectPV";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="WanConnectPV"
        component={WanConnectPV}
        durationInFrames={900}
        fps={30}
        width={1080}
        height={1920}
      />
    </>
  );
};
