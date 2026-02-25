import { Composition } from "remotion";
import { WanConnectPV } from "./WanConnectPV";
import { WanConnectShortPV } from "./WanConnectShortPV";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="WanConnectPV"
        component={WanConnectPV}
        durationInFrames={1800}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="WanConnectShortPV"
        component={WanConnectShortPV}
        durationInFrames={1800}
        fps={30}
        width={1080}
        height={1920}
      />
    </>
  );
};
