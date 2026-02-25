import {
  AbsoluteFill,
  Img,
  interpolate,
  Sequence,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  Easing,
} from "remotion";
import React, { useMemo } from "react";

// ============================================
// 桜井イズムに基づく1分間PV
// 「山と谷」の感情曲線を設計
// ============================================

// Dog character data
const dogs = [
  { name: "shiba", label: "しばいぬ", color: "#FFB347" },
  { name: "pug", label: "パグ", color: "#DEB887" },
  { name: "toypoodle", label: "トイプードル", color: "#D4A574" },
  { name: "husky", label: "ハスキー", color: "#87CEEB" },
  { name: "golden", label: "ゴールデン", color: "#FFD700" },
  { name: "corgi", label: "コーギー", color: "#FFA07A" },
  { name: "dalmatian", label: "ダルメシアン", color: "#E8E8E8" },
  { name: "chihuahua", label: "チワワ", color: "#FFE4B5" },
  { name: "schnauzer", label: "シュナウザー", color: "#A9A9A9" },
  { name: "samoyed", label: "サモエド", color: "#FFFAF0" },
  { name: "cavalier", label: "キャバリア", color: "#CD853F" },
  { name: "bernese", label: "バーニーズ", color: "#2F4F4F" },
];

type Expression = "normal" | "happy" | "sad" | "excited";

// ============================================
// 共通ユーティリティ：画面振動エフェクト
// 桜井スキル1.3「手応えを伝えるエフェクトと画面振動」
// ============================================
const useScreenShake = (
  frame: number,
  startFrame: number,
  intensity: number = 8,
  duration: number = 15
) => {
  const progress = frame - startFrame;
  if (progress < 0 || progress > duration) return { x: 0, y: 0 };
  
  const decay = 1 - progress / duration;
  const shakeX = Math.sin(progress * 1.5) * intensity * decay;
  const shakeY = Math.cos(progress * 2) * intensity * decay;
  
  return { x: shakeX, y: shakeY };
};

// ============================================
// 共通コンポーネント：きらきらパーティクル
// 桜井スキル1.2「褒める演出」
// ============================================
const Sparkles: React.FC<{ count?: number; intensity?: number }> = ({ 
  count = 20, 
  intensity = 1 
}) => {
  const frame = useCurrentFrame();
  
  const sparkles = useMemo(() => 
    Array.from({ length: count }, (_, i) => ({
      x: (i * 137 + 50) % 1080,
      y: (i * 89 + 100) % 1920,
      size: 15 + (i % 4) * 10,
      delay: i * 3,
      speed: 0.1 + (i % 5) * 0.02,
    })),
    [count]
  );

  return (
    <>
      {sparkles.map((s, i) => {
        const pulse = Math.sin((frame + s.delay) * s.speed) * 0.5 + 0.5;
        const opacity = pulse * intensity;
        
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: s.x,
              top: s.y + Math.sin((frame + i * 20) * 0.05) * 30,
              fontSize: s.size,
              opacity,
              transform: `rotate(${frame * 2 + i * 45}deg)`,
              filter: "drop-shadow(0 0 10px rgba(255, 215, 0, 0.8))",
            }}
          >
            ✦
          </div>
        );
      })}
    </>
  );
};

// ============================================
// Scene 1: Impact Play Scene (0-90 frames = 3秒)
// 桜井スキル2.1「まずゲームを始めさせる」
// 冒頭でいきなりパズルプレイから開始
// ============================================
const ImpactPlayScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // 高速で犬をつなぐ演出
  const gridStartX = 190;
  const gridStartY = 500;
  const cellSize = 220;

  const getGridPosition = (gx: number, gy: number) => ({
    x: gridStartX + gx * cellSize + cellSize / 2,
    y: gridStartY + gy * cellSize + cellSize / 2,
  });

  // 素早い接続パス
  const connectionPath = [
    getGridPosition(0, 0),
    getGridPosition(1, 0),
    getGridPosition(2, 0),
    getGridPosition(2, 1),
    getGridPosition(1, 1),
  ];

  // 超高速接続アニメーション
  const connectionProgress = interpolate(frame, [10, 50], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  const totalSegments = connectionPath.length - 1;
  const currentSegment = Math.min(
    Math.floor(connectionProgress * totalSegments),
    totalSegments - 1
  );
  const segmentProgress = (connectionProgress * totalSegments) % 1;

  // 画面振動（クリア時）
  const shake = useScreenShake(frame, 55, 12, 20);

  // クリア演出
  const showSuccess = frame > 55;
  const successScale = spring({
    frame: frame - 55,
    fps,
    config: { damping: 8, stiffness: 150 },
  });

  const gridDogs = [
    { dog: dogs[0], gridX: 0, gridY: 0 },
    { dog: dogs[1], gridX: 1, gridY: 0 },
    { dog: dogs[0], gridX: 2, gridY: 0 },
    { dog: dogs[2], gridX: 0, gridY: 1 },
    { dog: dogs[0], gridX: 1, gridY: 1 },
    { dog: dogs[3], gridX: 2, gridY: 1 },
  ];

  return (
    <AbsoluteFill
      style={{
        background: "linear-gradient(180deg, #87CEEB 0%, #98FB98 100%)",
        transform: `translate(${shake.x}px, ${shake.y}px)`,
      }}
    >
      {/* グリッド背景 */}
      <div
        style={{
          position: "absolute",
          left: gridStartX - 20,
          top: gridStartY - 20,
          width: cellSize * 3 + 40,
          height: cellSize * 2 + 40,
          background: "rgba(255,255,255,0.95)",
          borderRadius: 30,
          boxShadow: "0 10px 50px rgba(0,0,0,0.2)",
        }}
      />

      {/* 接続ライン - パリッとしたエフェクト */}
      <svg
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
        }}
      >
        <defs>
          <linearGradient id="impactGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#FFB347" />
            <stop offset="50%" stopColor="#FF6B6B" />
            <stop offset="100%" stopColor="#FFD700" />
          </linearGradient>
          {/* 輪郭をハッキリさせるためのフィルター */}
          <filter id="crisp">
            <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#FFD700" floodOpacity="0.8"/>
          </filter>
        </defs>
        {connectionProgress > 0 && (
          <path
            d={connectionPath
              .slice(0, currentSegment + 2)
              .map((p, i) => {
                if (i === 0) return `M ${p.x} ${p.y}`;
                if (i === currentSegment + 1) {
                  const prev = connectionPath[i - 1];
                  const x = interpolate(segmentProgress, [0, 1], [prev.x, p.x]);
                  const y = interpolate(segmentProgress, [0, 1], [prev.y, p.y]);
                  return `L ${x} ${y}`;
                }
                return `L ${p.x} ${p.y}`;
              })
              .join(" ")}
            stroke="url(#impactGradient)"
            strokeWidth="20"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            filter="url(#crisp)"
          />
        )}
      </svg>

      {/* 犬たち */}
      {gridDogs.map((item, i) => {
        const pos = getGridPosition(item.gridX, item.gridY);
        const isConnected = item.dog.name === "shiba" && frame > 55;
        const expression: Expression = isConnected ? "excited" : "happy";
        const wobble = isConnected ? Math.sin((frame + i * 10) * 0.4) * 8 : 0;

        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: pos.x - 80,
              top: pos.y - 80,
            }}
          >
            {isConnected && (
              <div
                style={{
                  position: "absolute",
                  width: 160,
                  height: 160,
                  borderRadius: "50%",
                  background: item.dog.color,
                  filter: "blur(30px)",
                  opacity: 0.7,
                }}
              />
            )}
            <Img
              src={staticFile(`${item.dog.name}_${expression}.png`)}
              style={{
                width: 160,
                height: 160,
                objectFit: "contain",
                transform: `rotate(${wobble}deg) scale(${isConnected ? 1.1 : 1})`,
                filter: "drop-shadow(0 5px 15px rgba(0,0,0,0.3))",
              }}
            />
          </div>
        );
      })}

      {/* クリア演出 */}
      {showSuccess && (
        <>
          <Sparkles count={30} intensity={successScale} />
          <div
            style={{
              position: "absolute",
              top: 200,
              width: "100%",
              textAlign: "center",
              transform: `scale(${successScale})`,
            }}
          >
            <span
              style={{
                fontSize: 80,
                fontWeight: "bold",
                color: "#FF6B6B",
                textShadow: "4px 4px 0 white, -4px -4px 0 white, 4px -4px 0 white, -4px 4px 0 white, 0 8px 20px rgba(0,0,0,0.3)",
                fontFamily: "sans-serif",
              }}
            >
              つながった！
            </span>
          </div>
        </>
      )}
    </AbsoluteFill>
  );
};

// ============================================
// Scene 2: Title Scene (90-240 frames = 5秒)
// ロゴ登場演出
// ============================================
const TitleScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoScale = spring({
    frame,
    fps,
    config: { damping: 12, stiffness: 80 },
  });

  const logoOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateRight: "clamp",
  });

  // タグライン
  const taglineWords = ["つなげる。", "うめる。", "かわいい！"];

  // 覗き込む犬たち
  const peekDogs = [
    { dog: dogs[0], from: "left", y: 1100, delay: 50 },
    { dog: dogs[1], from: "right", y: 1250, delay: 60 },
    { dog: dogs[4], from: "bottom", x: 540, delay: 70 },
  ];

  return (
    <AbsoluteFill>
      <Img
        src={staticFile("titlehaikei.png")}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
        }}
      />

      {/* 肉球パーティクル */}
      {[
        { x: 150, y: 400, delay: 10 },
        { x: 850, y: 350, delay: 20 },
        { x: 250, y: 1200, delay: 15 },
        { x: 800, y: 1400, delay: 25 },
      ].map((paw, i) => {
        const pawOpacity = interpolate(
          frame - paw.delay,
          [0, 20],
          [0, 0.4],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
        );
        const floatY = Math.sin((frame + i * 20) * 0.05) * 15;

        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: paw.x,
              top: paw.y + floatY,
              fontSize: 70,
              opacity: pawOpacity,
              transform: `rotate(${-20 + i * 10}deg)`,
            }}
          >
            🐾
          </div>
        );
      })}

      {/* ロゴ */}
      <div
        style={{
          position: "absolute",
          top: 300,
          width: "100%",
          display: "flex",
          justifyContent: "center",
          opacity: logoOpacity,
          transform: `scale(${logoScale})`,
        }}
      >
        <Img
          src={staticFile("titlelogo.png")}
          style={{
            width: 900,
            height: "auto",
            filter: "drop-shadow(0 20px 50px rgba(0,0,0,0.4))",
          }}
        />
      </div>

      {/* タグライン */}
      <div
        style={{
          position: "absolute",
          top: 800,
          width: "100%",
          textAlign: "center",
          display: "flex",
          justifyContent: "center",
          gap: 15,
        }}
      >
        {taglineWords.map((word, i) => {
          const wordDelay = 30 + i * 15;
          const wordScale = spring({
            frame: frame - wordDelay,
            fps,
            config: { damping: 10, stiffness: 120 },
          });
          const wordOpacity = interpolate(
            frame - wordDelay,
            [0, 10],
            [0, 1],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
          );

          return (
            <div
              key={word}
              style={{
                fontSize: 60,
                fontWeight: "bold",
                color: i === 2 ? "#FF6B6B" : "#5D4037",
                textShadow: "3px 3px 0 white, -3px -3px 0 white, 3px -3px 0 white, -3px 3px 0 white",
                fontFamily: "sans-serif",
                opacity: wordOpacity,
                transform: `scale(${Math.min(wordScale, 1.15)})`,
              }}
            >
              {word}
            </div>
          );
        })}
      </div>

      {/* 覗き込む犬たち */}
      {peekDogs.map((item) => {
        const peekProgress = spring({
          frame: frame - item.delay,
          fps,
          config: { damping: 15, stiffness: 60 },
        });

        let transform = "";
        let position: React.CSSProperties = {};

        if (item.from === "left") {
          transform = `translateX(${interpolate(peekProgress, [0, 1], [-400, -100])}px)`;
          position = { left: 0, top: item.y };
        } else if (item.from === "right") {
          transform = `translateX(${interpolate(peekProgress, [0, 1], [400, 100])}px) scaleX(-1)`;
          position = { right: 0, top: item.y };
        } else {
          transform = `translateY(${interpolate(peekProgress, [0, 1], [400, 50])}px)`;
          position = { bottom: 0, left: (item.x ?? 540) - 200 };
        }

        return (
          <div
            key={item.dog.name}
            style={{
              position: "absolute",
              ...position,
            }}
          >
            <Img
              src={staticFile(`${item.dog.name}_happy.png`)}
              style={{
                width: 400,
                height: 400,
                objectFit: "contain",
                transform,
              }}
            />
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

// ============================================
// Scene 3: Risk & Reward Scene (240-540 frames = 10秒)
// 桜井スキル1.1「リスクとリターンで見せる気持ちよさ」
// 複雑なパズル → 見事にクリア
// ============================================
const RiskRewardScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // フェーズ: 困難なパズル提示(0-60) → 解決開始(60-180) → クリア演出(180-300)
  const gridStartX = 120;
  const gridStartY = 400;
  const cellSize = 140;

  const getGridPosition = (gx: number, gy: number) => ({
    x: gridStartX + gx * cellSize + cellSize / 2,
    y: gridStartY + gy * cellSize + cellSize / 2,
  });

  // 6x6グリッド - より複雑なパズル
  const gridDogs = useMemo(() => [
    // Row 0
    { dog: dogs[0], gridX: 0, gridY: 0, pair: "A" },
    { dog: dogs[1], gridX: 1, gridY: 0, pair: "B" },
    { dog: dogs[2], gridX: 2, gridY: 0, pair: "C" },
    { dog: dogs[3], gridX: 3, gridY: 0, pair: "D" },
    { dog: dogs[2], gridX: 4, gridY: 0, pair: "C" },
    { dog: dogs[0], gridX: 5, gridY: 0, pair: "A" },
    // Row 1
    { dog: dogs[1], gridX: 0, gridY: 1, pair: "B" },
    { dog: dogs[4], gridX: 1, gridY: 1, pair: "E" },
    { dog: dogs[5], gridX: 2, gridY: 1, pair: "F" },
    { dog: dogs[5], gridX: 3, gridY: 1, pair: "F" },
    { dog: dogs[4], gridX: 4, gridY: 1, pair: "E" },
    { dog: dogs[3], gridX: 5, gridY: 1, pair: "D" },
  ], []);

  // 複数の接続パス（同時に表示）
  const paths = useMemo(() => ({
    A: [getGridPosition(0, 0), getGridPosition(0, 1), getGridPosition(1, 1), getGridPosition(2, 1), getGridPosition(3, 1), getGridPosition(4, 1), getGridPosition(5, 1), getGridPosition(5, 0)],
    B: [getGridPosition(1, 0), getGridPosition(0, 0)], // 実際はAを通る
  }), []);

  // メインパス（柴犬）のアニメーション
  const mainPath = paths.A;
  const connectionProgress = interpolate(frame, [80, 200], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic),
  });

  const totalSegments = mainPath.length - 1;
  const currentSegment = Math.min(
    Math.floor(connectionProgress * totalSegments),
    totalSegments - 1
  );
  const segmentProgress = (connectionProgress * totalSegments) % 1;

  // 画面振動
  const shake = useScreenShake(frame, 210, 15, 25);

  // クリア判定
  const showSuccess = frame > 210;
  const successScale = spring({
    frame: frame - 210,
    fps,
    config: { damping: 8, stiffness: 120 },
  });

  return (
    <AbsoluteFill
      style={{
        background: "linear-gradient(180deg, #E8F5E9 0%, #C8E6C9 100%)",
        transform: `translate(${shake.x}px, ${shake.y}px)`,
      }}
    >
      {/* 「むずかしそう...」テキスト */}
      {frame < 80 && (
        <div
          style={{
            position: "absolute",
            top: 100,
            width: "100%",
            textAlign: "center",
            opacity: interpolate(frame, [0, 20], [0, 1]),
          }}
        >
          <span
            style={{
              fontSize: 55,
              fontWeight: "bold",
              color: "#666",
              fontFamily: "sans-serif",
            }}
          >
            むずかしそう...？
          </span>
        </div>
      )}

      {/* 「解けた！」テキスト */}
      {showSuccess && (
        <div
          style={{
            position: "absolute",
            top: 100,
            width: "100%",
            textAlign: "center",
            transform: `scale(${successScale})`,
          }}
        >
          <span
            style={{
              fontSize: 70,
              fontWeight: "bold",
              color: "#4CAF50",
              textShadow: "3px 3px 0 white, -3px -3px 0 white",
              fontFamily: "sans-serif",
            }}
          >
            ✨ 解けた！ ✨
          </span>
        </div>
      )}

      {/* グリッド背景 */}
      <div
        style={{
          position: "absolute",
          left: gridStartX - 15,
          top: gridStartY - 15,
          width: cellSize * 6 + 30,
          height: cellSize * 2 + 30,
          background: "rgba(255,255,255,0.95)",
          borderRadius: 25,
          boxShadow: "0 10px 40px rgba(0,0,0,0.15)",
        }}
      />

      {/* 接続ライン */}
      <svg
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
        }}
      >
        <defs>
          <linearGradient id="shibaGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#FFB347" />
            <stop offset="100%" stopColor="#FF8C00" />
          </linearGradient>
        </defs>
        {connectionProgress > 0 && (
          <path
            d={mainPath
              .slice(0, currentSegment + 2)
              .map((p, i) => {
                if (i === 0) return `M ${p.x} ${p.y}`;
                if (i === currentSegment + 1) {
                  const prev = mainPath[i - 1];
                  const x = interpolate(segmentProgress, [0, 1], [prev.x, p.x]);
                  const y = interpolate(segmentProgress, [0, 1], [prev.y, p.y]);
                  return `L ${x} ${y}`;
                }
                return `L ${p.x} ${p.y}`;
              })
              .join(" ")}
            stroke="url(#shibaGradient)"
            strokeWidth="14"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            opacity={0.8}
          />
        )}
      </svg>

      {/* 犬たち */}
      {gridDogs.map((item, i) => {
        const pos = getGridPosition(item.gridX, item.gridY);
        const isShiba = item.dog.name === "shiba";
        const isConnected = isShiba && frame > 210;
        const expression: Expression = isConnected ? "excited" : frame > 80 && isShiba ? "happy" : "normal";
        const wobble = isConnected ? Math.sin((frame + i * 10) * 0.4) * 10 : 0;

        const enterScale = spring({
          frame: frame - i * 2,
          fps,
          config: { damping: 12, stiffness: 100 },
        });

        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: pos.x - 55,
              top: pos.y - 55,
              transform: `scale(${Math.min(enterScale, 1)})`,
            }}
          >
            {isConnected && (
              <div
                style={{
                  position: "absolute",
                  width: 110,
                  height: 110,
                  borderRadius: "50%",
                  background: item.dog.color,
                  filter: "blur(20px)",
                  opacity: 0.6,
                }}
              />
            )}
            <Img
              src={staticFile(`${item.dog.name}_${expression}.png`)}
              style={{
                width: 110,
                height: 110,
                objectFit: "contain",
                transform: `rotate(${wobble}deg)`,
                filter: "drop-shadow(0 4px 10px rgba(0,0,0,0.2))",
              }}
            />
          </div>
        );
      })}

      {/* 指 */}
      {frame >= 80 && frame <= 205 && (
        <div
          style={{
            position: "absolute",
            left: interpolate(
              connectionProgress,
              [0, 1],
              [mainPath[0].x - 30, mainPath[mainPath.length - 1].x - 30]
            ),
            top: interpolate(
              connectionProgress,
              [0, 0.15, 0.85, 1],
              [mainPath[0].y + 50, mainPath[1].y + 50, mainPath[mainPath.length - 2].y + 50, mainPath[mainPath.length - 1].y + 50]
            ),
            transform: "rotate(-30deg)",
          }}
        >
          <div
            style={{
              width: 50,
              height: 85,
              background: "linear-gradient(180deg, #FFCCBC 0%, #FFAB91 100%)",
              borderRadius: "25px 25px 30px 30px",
              boxShadow: "0 8px 25px rgba(0,0,0,0.3)",
            }}
          />
        </div>
      )}

      {/* クリア時のきらきら */}
      {showSuccess && <Sparkles count={40} intensity={successScale} />}

      {/* 浮かぶハート */}
      {showSuccess &&
        [...Array(12)].map((_, i) => {
          const heartFrame = frame - 210;
          const floatY = -heartFrame * 4 - i * 30;
          const floatX = Math.sin(heartFrame * 0.1 + i * 2) * 60;
          const heartOpacity = interpolate(heartFrame, [0, 80], [1, 0], {
            extrapolateRight: "clamp",
          });

          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: 300 + i * 50 + floatX,
                top: 700 + floatY,
                fontSize: 45,
                opacity: heartOpacity,
                color: "#FF6B6B",
              }}
            >
              ♥
            </div>
          );
        })}
    </AbsoluteFill>
  );
};

// ============================================
// Scene 4: Praise Scene (540-780 frames = 8秒)
// 桜井スキル1.2「褒める演出」
// 犬たちが喜ぶ演出
// ============================================
const PraiseScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const celebrationDogs = [dogs[0], dogs[1], dogs[4], dogs[5], dogs[9]];

  // 画面振動（最初）
  const shake = useScreenShake(frame, 0, 10, 20);

  return (
    <AbsoluteFill
      style={{
        background: "linear-gradient(180deg, #FFF9C4 0%, #FFECB3 100%)",
        transform: `translate(${shake.x}px, ${shake.y}px)`,
      }}
    >
      <Sparkles count={50} intensity={1.2} />

      {/* 「すごい！」テキスト */}
      <div
        style={{
          position: "absolute",
          top: 150,
          width: "100%",
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: 90,
            fontWeight: "bold",
            color: "#FF6B6B",
            textShadow: "4px 4px 0 white, -4px -4px 0 white, 4px -4px 0 white, -4px 4px 0 white, 0 10px 30px rgba(255,107,107,0.3)",
            fontFamily: "sans-serif",
            transform: `scale(${1 + Math.sin(frame * 0.15) * 0.05})`,
          }}
        >
          🎉 すごい！ 🎉
        </div>
      </div>

      {/* 喜ぶ犬たち - 円形配置 */}
      <div
        style={{
          position: "absolute",
          top: 450,
          width: "100%",
          display: "flex",
          justifyContent: "center",
        }}
      >
        {celebrationDogs.map((dog, i) => {
          const angle = (i / celebrationDogs.length) * Math.PI * 2 - Math.PI / 2;
          const radius = 280;
          const x = Math.cos(angle + frame * 0.02) * radius;
          const y = Math.sin(angle + frame * 0.02) * radius * 0.6;

          const bounce = Math.sin((frame + i * 15) * 0.2) * 20;
          const wiggle = Math.sin((frame + i * 10) * 0.15) * 10;

          const enterScale = spring({
            frame: frame - i * 8,
            fps,
            config: { damping: 10, stiffness: 100 },
          });

          return (
            <div
              key={dog.name}
              style={{
                position: "absolute",
                left: 540 + x - 100,
                top: 300 + y + bounce - 100,
                transform: `scale(${Math.min(enterScale, 1)}) rotate(${wiggle}deg)`,
              }}
            >
              {/* グロー */}
              <div
                style={{
                  position: "absolute",
                  width: 200,
                  height: 200,
                  borderRadius: "50%",
                  background: dog.color,
                  filter: "blur(30px)",
                  opacity: 0.5,
                }}
              />
              <Img
                src={staticFile(`${dog.name}_excited.png`)}
                style={{
                  width: 200,
                  height: 200,
                  objectFit: "contain",
                  filter: "drop-shadow(0 8px 20px rgba(0,0,0,0.25))",
                }}
              />
            </div>
          );
        })}
      </div>

      {/* 紙吹雪 */}
      {[...Array(40)].map((_, i) => {
        const confettiY = ((frame * 3 + i * 50) % 2000) - 100;
        const confettiX = (i * 97) % 1080;
        const rotation = frame * 5 + i * 30;
        const colors = ["#FFD700", "#FF69B4", "#87CEEB", "#98FB98", "#DDA0DD", "#FF6B6B"];

        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: confettiX,
              top: confettiY,
              width: 15,
              height: 25,
              background: colors[i % colors.length],
              borderRadius: 4,
              transform: `rotate(${rotation}deg)`,
            }}
          />
        );
      })}

      {/* 「またあそぼう！」テキスト */}
      <div
        style={{
          position: "absolute",
          bottom: 200,
          width: "100%",
          textAlign: "center",
          opacity: interpolate(frame, [120, 150], [0, 1]),
        }}
      >
        <span
          style={{
            fontSize: 55,
            fontWeight: "bold",
            color: "#5D4037",
            textShadow: "2px 2px 0 white",
            fontFamily: "sans-serif",
          }}
        >
          またあそぼう！
        </span>
      </div>
    </AbsoluteFill>
  );
};

// ============================================
// Scene 5: Reward Scene (780-1020 frames = 8秒)
// 桜井スキル2.2「ご褒美を核にした魅力」
// NEW犬アンロック演出
// ============================================
const RewardScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // 新しく解放される犬
  const newDog = dogs[9]; // サモエド

  // 画面振動
  const shake = useScreenShake(frame, 60, 12, 20);

  // カード登場
  const cardScale = spring({
    frame: frame - 30,
    fps,
    config: { damping: 10, stiffness: 80 },
  });

  // NEW!バッジ
  const newBadgeScale = spring({
    frame: frame - 70,
    fps,
    config: { damping: 8, stiffness: 150 },
  });

  return (
    <AbsoluteFill
      style={{
        background: "linear-gradient(180deg, #E1BEE7 0%, #CE93D8 100%)",
        transform: `translate(${shake.x}px, ${shake.y}px)`,
      }}
    >
      <Sparkles count={60} intensity={1.5} />

      {/* 「新しいワンコ！」テキスト */}
      <div
        style={{
          position: "absolute",
          top: 120,
          width: "100%",
          textAlign: "center",
          opacity: interpolate(frame, [0, 20], [0, 1]),
        }}
      >
        <span
          style={{
            fontSize: 65,
            fontWeight: "bold",
            color: "#7B1FA2",
            textShadow: "3px 3px 0 white, -3px -3px 0 white",
            fontFamily: "sans-serif",
          }}
        >
          新しいワンコ！
        </span>
      </div>

      {/* キャラクターカード */}
      <div
        style={{
          position: "absolute",
          top: 350,
          width: "100%",
          display: "flex",
          justifyContent: "center",
          transform: `scale(${cardScale})`,
        }}
      >
        <div
          style={{
            background: "linear-gradient(135deg, #FFFFFF 0%, #F3E5F5 100%)",
            borderRadius: 50,
            padding: 50,
            boxShadow: "0 20px 60px rgba(123, 31, 162, 0.3), 0 0 100px rgba(255, 215, 0, 0.3)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            border: "5px solid #FFD700",
          }}
        >
          {/* グロー効果 */}
          <div
            style={{
              position: "absolute",
              width: 400,
              height: 400,
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(255,215,0,0.4) 0%, transparent 70%)",
              filter: "blur(20px)",
            }}
          />
          
          <Img
            src={staticFile(`${newDog.name}_excited.png`)}
            style={{
              width: 350,
              height: 350,
              objectFit: "contain",
              filter: "drop-shadow(0 10px 30px rgba(0,0,0,0.2))",
              transform: `scale(${1 + Math.sin(frame * 0.1) * 0.05})`,
            }}
          />
          
          <div
            style={{
              fontSize: 60,
              fontWeight: "bold",
              color: "#5D4037",
              marginTop: 20,
              fontFamily: "sans-serif",
            }}
          >
            {newDog.label}
          </div>
        </div>
      </div>

      {/* NEW!バッジ */}
      <div
        style={{
          position: "absolute",
          top: 300,
          right: 200,
          transform: `scale(${newBadgeScale}) rotate(-15deg)`,
        }}
      >
        <div
          style={{
            background: "linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%)",
            padding: "20px 50px",
            borderRadius: 30,
            boxShadow: "0 10px 30px rgba(255, 107, 107, 0.5)",
          }}
        >
          <span
            style={{
              fontSize: 50,
              fontWeight: "bold",
              color: "white",
              fontFamily: "sans-serif",
              letterSpacing: 5,
            }}
          >
            NEW!
          </span>
        </div>
      </div>

      {/* 回転する星 */}
      {[...Array(8)].map((_, i) => {
        const angle = (i / 8) * Math.PI * 2 + frame * 0.03;
        const radius = 400;
        const x = Math.cos(angle) * radius + 540;
        const y = Math.sin(angle) * radius + 750;

        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x,
              top: y,
              fontSize: 50,
              color: "#FFD700",
              transform: `rotate(${frame * 3 + i * 45}deg)`,
              textShadow: "0 0 20px rgba(255, 215, 0, 0.8)",
            }}
          >
            ★
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

// ============================================
// Scene 6: Character Showcase (1020-1320 frames = 10秒)
// 桜井スキル5.1「キャラ立ち」
// 個性的な犬たちの紹介
// ============================================
const CharacterShowcase: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const showcaseDogs = [
    { ...dogs[0], personality: "元気いっぱい！" },
    { ...dogs[1], personality: "のんびり屋さん" },
    { ...dogs[5], personality: "おしりふりふり" },
    { ...dogs[9], personality: "もふもふ天使" },
    { ...dogs[4], personality: "みんなの人気者" },
    { ...dogs[3], personality: "クールだけど優しい" },
  ];

  const slideIndex = Math.floor(frame / 50) % showcaseDogs.length;

  return (
    <AbsoluteFill
      style={{
        background: "linear-gradient(180deg, #FFF8DC 0%, #FFEFD5 100%)",
      }}
    >
      {/* タイトル */}
      <div
        style={{
          position: "absolute",
          top: 80,
          width: "100%",
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: 60,
            fontWeight: "bold",
            color: "#8B4513",
            fontFamily: "sans-serif",
          }}
        >
          個性豊かなワンコたち
        </div>
      </div>

      {/* メイン表示エリア */}
      <div
        style={{
          position: "absolute",
          top: 280,
          width: "100%",
          display: "flex",
          justifyContent: "center",
        }}
      >
        {showcaseDogs.map((dog, i) => {
          const isActive = i === slideIndex;
          if (!isActive) return null;

          const enterScale = spring({
            frame: frame % 50,
            fps,
            config: { damping: 12, stiffness: 100 },
          });

          const bounce = Math.sin(frame * 0.15) * 12;

          // 犬種ごとの特徴的な動き
          let specialMove = 0;
          if (dog.name === "corgi") {
            // コーギーはお尻を振る
            specialMove = Math.sin(frame * 0.3) * 15;
          } else if (dog.name === "chihuahua") {
            // チワワは小刻みに震える
            specialMove = Math.sin(frame * 0.8) * 3;
          }

          return (
            <div
              key={dog.name}
              style={{
                background: "white",
                borderRadius: 50,
                padding: 50,
                boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
                transform: `scale(${Math.min(enterScale, 1)}) translateY(${bounce}px)`,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <Img
                src={staticFile(`${dog.name}_happy.png`)}
                style={{
                  width: 400,
                  height: 400,
                  objectFit: "contain",
                  transform: `rotate(${specialMove}deg)`,
                }}
              />
              <div
                style={{
                  fontSize: 55,
                  fontWeight: "bold",
                  color: "#5D4037",
                  marginTop: 15,
                  fontFamily: "sans-serif",
                }}
              >
                {dog.label}
              </div>
              <div
                style={{
                  fontSize: 35,
                  color: "#888",
                  marginTop: 10,
                  fontFamily: "sans-serif",
                }}
              >
                {dog.personality}
              </div>
            </div>
          );
        })}
      </div>

      {/* サムネイル */}
      <div
        style={{
          position: "absolute",
          bottom: 150,
          width: "100%",
          display: "flex",
          justifyContent: "center",
          gap: 20,
        }}
      >
        {showcaseDogs.map((dog, i) => {
          const isActive = i === slideIndex;
          return (
            <div
              key={dog.name}
              style={{
                width: 110,
                height: 110,
                borderRadius: 30,
                background: isActive ? dog.color : "white",
                padding: 10,
                boxShadow: isActive
                  ? `0 8px 25px ${dog.color}80`
                  : "0 3px 10px rgba(0,0,0,0.1)",
                transform: isActive ? "scale(1.15)" : "scale(1)",
              }}
            >
              <Img
                src={staticFile(`${dog.name}_normal.png`)}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                }}
              />
            </div>
          );
        })}
      </div>

      {/* プログレスドット */}
      <div
        style={{
          position: "absolute",
          bottom: 70,
          width: "100%",
          display: "flex",
          justifyContent: "center",
          gap: 15,
        }}
      >
        {showcaseDogs.map((_, i) => (
          <div
            key={i}
            style={{
              width: i === slideIndex ? 45 : 15,
              height: 15,
              borderRadius: 10,
              background: i === slideIndex ? "#FF8C00" : "#DDD",
            }}
          />
        ))}
      </div>
    </AbsoluteFill>
  );
};

// ============================================
// Scene 7: Silhouette Collection (1320-1470 frames = 5秒)
// 桜井スキル2.3「見せないことによる期待感」
// ============================================
const SilhouetteScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // 表示する犬（一部だけ解放済み、残りはシルエット）
  const collectionDogs = [
    { dog: dogs[0], unlocked: true },
    { dog: dogs[1], unlocked: true },
    { dog: dogs[2], unlocked: false },
    { dog: dogs[3], unlocked: false },
    { dog: dogs[4], unlocked: true },
    { dog: dogs[5], unlocked: false },
    { dog: dogs[6], unlocked: false },
    { dog: dogs[7], unlocked: false },
    { dog: dogs[8], unlocked: false },
    { dog: dogs[9], unlocked: true },
    { dog: dogs[10], unlocked: false },
    { dog: dogs[11], unlocked: false },
  ];

  return (
    <AbsoluteFill
      style={{
        background: "linear-gradient(180deg, #37474F 0%, #263238 100%)",
      }}
    >
      {/* タイトル */}
      <div
        style={{
          position: "absolute",
          top: 100,
          width: "100%",
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: 55,
            fontWeight: "bold",
            color: "white",
            fontFamily: "sans-serif",
            opacity: interpolate(frame, [0, 20], [0, 1]),
          }}
        >
          まだ見ぬワンコがいっぱい！
        </div>
        <div
          style={{
            fontSize: 80,
            fontWeight: "bold",
            color: "#FFD700",
            fontFamily: "sans-serif",
            marginTop: 20,
            opacity: interpolate(frame, [20, 40], [0, 1]),
          }}
        >
          40種類以上！
        </div>
      </div>

      {/* コレクショングリッド */}
      <div
        style={{
          position: "absolute",
          top: 400,
          width: "100%",
          display: "flex",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(6, 130px)",
            gap: 20,
          }}
        >
          {collectionDogs.map((item, i) => {
            const enterScale = spring({
              frame: frame - i * 3,
              fps,
              config: { damping: 12, stiffness: 100 },
            });

            const wobble = item.unlocked ? Math.sin((frame + i * 10) * 0.1) * 3 : 0;

            return (
              <div
                key={i}
                style={{
                  width: 130,
                  height: 130,
                  borderRadius: 25,
                  background: item.unlocked
                    ? "linear-gradient(135deg, #FFFFFF 0%, #F5F5F5 100%)"
                    : "linear-gradient(135deg, #455A64 0%, #37474F 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: item.unlocked
                    ? "0 5px 15px rgba(0,0,0,0.2)"
                    : "inset 0 2px 10px rgba(0,0,0,0.3)",
                  transform: `scale(${Math.min(enterScale, 1)}) rotate(${wobble}deg)`,
                }}
              >
                {item.unlocked ? (
                  <Img
                    src={staticFile(`${item.dog.name}_happy.png`)}
                    style={{
                      width: 100,
                      height: 100,
                      objectFit: "contain",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      fontSize: 60,
                      color: "#546E7A",
                    }}
                  >
                    ？
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 「集めてみよう！」テキスト */}
      <div
        style={{
          position: "absolute",
          bottom: 150,
          width: "100%",
          textAlign: "center",
          opacity: interpolate(frame, [80, 100], [0, 1]),
        }}
      >
        <span
          style={{
            fontSize: 50,
            fontWeight: "bold",
            color: "#FFD700",
            textShadow: "0 0 20px rgba(255, 215, 0, 0.5)",
            fontFamily: "sans-serif",
          }}
        >
          ✨ 集めてみよう！ ✨
        </span>
      </div>
    </AbsoluteFill>
  );
};

// ============================================
// Scene 8: Mode Introduction (1470-1620 frames = 5秒)
// 桜井スキル4.2「遊びの幅を見せる」
// ============================================
const ModeScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const modes = [
    {
      name: "おさんぽモード",
      description: "100ステージ",
      icon: "🐕",
      color: "#4CAF50",
      delay: 0,
    },
    {
      name: "エンドレスモード",
      description: "どこまでいける？",
      icon: "🏆",
      color: "#FF9800",
      delay: 30,
    },
  ];

  return (
    <AbsoluteFill
      style={{
        background: "linear-gradient(180deg, #E3F2FD 0%, #BBDEFB 100%)",
      }}
    >
      {/* タイトル */}
      <div
        style={{
          position: "absolute",
          top: 100,
          width: "100%",
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: 60,
            fontWeight: "bold",
            color: "#1565C0",
            fontFamily: "sans-serif",
            opacity: interpolate(frame, [0, 20], [0, 1]),
          }}
        >
          2つのモードで遊べる！
        </div>
      </div>

      {/* モードカード */}
      <div
        style={{
          position: "absolute",
          top: 320,
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 50,
        }}
      >
        {modes.map((mode, i) => {
          const cardScale = spring({
            frame: frame - mode.delay,
            fps,
            config: { damping: 12, stiffness: 80 },
          });

          const bounce = Math.sin((frame + i * 20) * 0.12) * 8;

          return (
            <div
              key={mode.name}
              style={{
                background: "white",
                borderRadius: 40,
                padding: "40px 80px",
                boxShadow: `0 15px 40px ${mode.color}40`,
                transform: `scale(${Math.min(cardScale, 1)}) translateY(${bounce}px)`,
                display: "flex",
                alignItems: "center",
                gap: 40,
                borderLeft: `10px solid ${mode.color}`,
              }}
            >
              <div style={{ fontSize: 90 }}>{mode.icon}</div>
              <div>
                <div
                  style={{
                    fontSize: 50,
                    fontWeight: "bold",
                    color: mode.color,
                    fontFamily: "sans-serif",
                  }}
                >
                  {mode.name}
                </div>
                <div
                  style={{
                    fontSize: 38,
                    color: "#666",
                    fontFamily: "sans-serif",
                    marginTop: 10,
                  }}
                >
                  {mode.description}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 装飾犬 */}
      <div
        style={{
          position: "absolute",
          bottom: 100,
          width: "100%",
          display: "flex",
          justifyContent: "center",
          gap: 30,
        }}
      >
        {[dogs[0], dogs[1], dogs[4], dogs[5]].map((dog, i) => {
          const bounce = Math.sin((frame + i * 15) * 0.2) * 12;
          const enterScale = spring({
            frame: frame - 60 - i * 10,
            fps,
            config: { damping: 12, stiffness: 100 },
          });

          return (
            <div
              key={dog.name}
              style={{
                transform: `scale(${Math.min(enterScale, 1)}) translateY(${bounce}px)`,
              }}
            >
              <Img
                src={staticFile(`${dog.name}_excited.png`)}
                style={{
                  width: 140,
                  height: 140,
                  objectFit: "contain",
                }}
              />
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// ============================================
// Scene 9: Climax Scene (1620-1800 frames = 6秒)
// 桜井スキル5.2「山と谷」のクライマックス
// ============================================
const ClimaxScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // 紙吹雪
  const confetti = useMemo(() =>
    [...Array(50)].map((_, i) => ({
      x: (i * 137) % 1080,
      color: ["#FFD700", "#FF69B4", "#87CEEB", "#98FB98", "#DDA0DD", "#FF6B6B"][i % 6],
      speed: 3 + (i % 5),
      offset: i * 50,
    })),
    []
  );

  const titleScale = spring({
    frame,
    fps,
    config: { damping: 10, stiffness: 80 },
  });

  const ctaScale = spring({
    frame: frame - 40,
    fps,
    config: { damping: 10, stiffness: 100 },
  });

  // 画面振動
  const shake = useScreenShake(frame, 0, 8, 15);

  return (
    <AbsoluteFill
      style={{
        background: "linear-gradient(180deg, #FFF59D 0%, #FFB74D 50%, #FF8A65 100%)",
        overflow: "hidden",
        transform: `translate(${shake.x}px, ${shake.y}px)`,
      }}
    >
      {/* 紙吹雪 */}
      {confetti.map((item, i) => {
        const y = ((frame * item.speed + item.offset) % 2200) - 200;
        const rotation = frame * 5 + i * 45;

        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: item.x,
              top: y,
              width: 14,
              height: 22,
              background: item.color,
              transform: `rotate(${rotation}deg)`,
              borderRadius: 3,
            }}
          />
        );
      })}

      <Sparkles count={40} intensity={1.3} />

      {/* ロゴ */}
      <div
        style={{
          position: "absolute",
          top: 220,
          width: "100%",
          display: "flex",
          justifyContent: "center",
          transform: `scale(${titleScale})`,
        }}
      >
        <Img
          src={staticFile("titlelogo.png")}
          style={{
            width: 850,
            height: "auto",
            filter: "drop-shadow(0 20px 50px rgba(0,0,0,0.35))",
          }}
        />
      </div>

      {/* 犬たち */}
      <div
        style={{
          position: "absolute",
          top: 750,
          width: "100%",
          display: "flex",
          justifyContent: "center",
          gap: 15,
        }}
      >
        {dogs.slice(0, 8).map((dog, i) => {
          const bounce = Math.sin((frame + i * 10) * 0.25) * 18;
          const wiggle = Math.sin((frame + i * 8) * 0.18) * 10;
          const enterScale = spring({
            frame: frame - i * 4,
            fps,
            config: { damping: 12, stiffness: 100 },
          });

          return (
            <div
              key={dog.name}
              style={{
                transform: `scale(${Math.min(enterScale, 1)}) translateY(${bounce}px) rotate(${wiggle}deg)`,
              }}
            >
              <Img
                src={staticFile(`${dog.name}_excited.png`)}
                style={{
                  width: 120,
                  height: 120,
                  objectFit: "contain",
                  filter: "drop-shadow(0 8px 15px rgba(0,0,0,0.25))",
                }}
              />
            </div>
          );
        })}
      </div>

      {/* ダウンロードバッジ */}
      <div
        style={{
          position: "absolute",
          bottom: 300,
          width: "100%",
          display: "flex",
          justifyContent: "center",
          transform: `scale(${ctaScale})`,
        }}
      >
        <div
          style={{
            background: "linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%)",
            padding: "30px 80px",
            borderRadius: 60,
            boxShadow: "0 15px 50px rgba(255, 107, 107, 0.5)",
            transform: `scale(${1 + Math.sin(frame * 0.15) * 0.04})`,
          }}
        >
          <span
            style={{
              fontSize: 55,
              fontWeight: "bold",
              color: "white",
              fontFamily: "sans-serif",
              letterSpacing: 3,
            }}
          >
            いますぐダウンロード！
          </span>
        </div>
      </div>

      {/* プラットフォームアイコン */}
      <div
        style={{
          position: "absolute",
          bottom: 150,
          width: "100%",
          display: "flex",
          justifyContent: "center",
          gap: 40,
          opacity: interpolate(frame, [60, 80], [0, 1]),
        }}
      >
        <div
          style={{
            background: "#333",
            color: "white",
            padding: "18px 45px",
            borderRadius: 15,
            fontSize: 30,
            fontFamily: "sans-serif",
            fontWeight: "bold",
          }}
        >
          App Store
        </div>
        <div
          style={{
            background: "#333",
            color: "white",
            padding: "18px 45px",
            borderRadius: 15,
            fontSize: 30,
            fontFamily: "sans-serif",
            fontWeight: "bold",
          }}
        >
          Google Play
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ============================================
// Main Composition - 60秒 (1800 frames at 30fps)
// 桜井イズム「山と谷」の感情曲線設計
// ============================================
export const WanConnectPV: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "white" }}>
      {/* Scene 1: Impact Play - 0-90 frames (3秒) - 山：冒頭インパクト */}
      <Sequence from={0} durationInFrames={90}>
        <ImpactPlayScene />
      </Sequence>

      {/* Scene 2: Title - 90-240 frames (5秒) - 谷：落ち着いたタイトル */}
      <Sequence from={90} durationInFrames={150}>
        <TitleScene />
      </Sequence>

      {/* Scene 3: Risk & Reward - 240-540 frames (10秒) - 山：複雑パズル→クリア */}
      <Sequence from={240} durationInFrames={300}>
        <RiskRewardScene />
      </Sequence>

      {/* Scene 4: Praise - 540-780 frames (8秒) - 山：褒める演出 */}
      <Sequence from={540} durationInFrames={240}>
        <PraiseScene />
      </Sequence>

      {/* Scene 5: Reward - 780-1020 frames (8秒) - 山：ご褒美演出 */}
      <Sequence from={780} durationInFrames={240}>
        <RewardScene />
      </Sequence>

      {/* Scene 6: Character Showcase - 1020-1320 frames (10秒) - 谷：キャラ紹介 */}
      <Sequence from={1020} durationInFrames={300}>
        <CharacterShowcase />
      </Sequence>

      {/* Scene 7: Silhouette Collection - 1320-1470 frames (5秒) - 谷：期待感 */}
      <Sequence from={1320} durationInFrames={150}>
        <SilhouetteScene />
      </Sequence>

      {/* Scene 8: Mode Introduction - 1470-1620 frames (5秒) - 谷：モード紹介 */}
      <Sequence from={1470} durationInFrames={150}>
        <ModeScene />
      </Sequence>

      {/* Scene 9: Climax - 1620-1800 frames (6秒) - 山：クライマックス */}
      <Sequence from={1620} durationInFrames={180}>
        <ClimaxScene />
      </Sequence>
    </AbsoluteFill>
  );
};
