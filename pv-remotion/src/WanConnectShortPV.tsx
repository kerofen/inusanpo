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
import "./fonts.css";

// ============================================
// ワンこねくと 1分ショートPV
// 視聴維持率最大化のための構成
// ============================================

// 犬キャラクターデータ
const dogs = [
  { id: "shiba", label: "しばいぬ", color: "#FFB347" },
  { id: "pug", label: "パグ", color: "#DEB887" },
  { id: "toypoodle", label: "トイプードル", color: "#D4A574" },
  { id: "husky", label: "ハスキー", color: "#6B8FAD" },
  { id: "golden", label: "ゴールデン", color: "#E8C97A" },
  { id: "corgi", label: "コーギー", color: "#FFA07A" },
  { id: "dalmatian", label: "ダルメシアン", color: "#E8E8E8" },
  { id: "samoyed", label: "サモエド", color: "#FFFAF0" },
];

type Expression = "neutral" | "happy" | "sad" | "excited";

// ============================================
// 共通ユーティリティ
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

// テキストスタイル（KeiFont使用）
const textStyle = (size: number, color: string = "#5D4037"): React.CSSProperties => ({
  fontFamily: "'KeiFont', sans-serif",
  fontSize: size,
  fontWeight: "bold",
  color,
  textShadow: `
    3px 3px 0 white, 
    -3px -3px 0 white, 
    3px -3px 0 white, 
    -3px 3px 0 white,
    0 6px 15px rgba(0,0,0,0.2)
  `,
});

// きらきらパーティクル
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
// Scene 1: Hook Scene (0-90 frames = 3秒)
// 視聴者を引き込むフック
// ============================================
const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // テキストアニメーション
  const titleScale = spring({
    frame,
    fps,
    config: { damping: 10, stiffness: 100 },
  });

  // 犬たちが飛び出すアニメーション
  const flyingDogs = [
    { dog: dogs[0], startX: -200, startY: 800, endX: 200, endY: 700, delay: 10 },
    { dog: dogs[1], startX: 1280, startY: 900, endX: 880, endY: 750, delay: 20 },
    { dog: dogs[2], startX: -200, startY: 1100, endX: 300, endY: 1000, delay: 30 },
    { dog: dogs[3], startX: 1280, startY: 1200, endX: 780, endY: 1050, delay: 40 },
  ];

  return (
    <AbsoluteFill
      style={{
        background: "linear-gradient(180deg, #87CEEB 0%, #98FB98 100%)",
      }}
    >
      {/* 背景の肉球パターン */}
      {[...Array(12)].map((_, i) => {
        const floatY = Math.sin((frame + i * 30) * 0.03) * 20;
        return (
          <Img
            key={i}
            src={staticFile("paw_brown_bone.png")}
            style={{
              position: "absolute",
              left: (i % 4) * 300 + 50,
              top: Math.floor(i / 4) * 500 + 200 + floatY,
              width: 80,
              height: 80,
              opacity: 0.15,
              transform: `rotate(${i * 30}deg)`,
            }}
          />
        );
      })}

      {/* メインキャッチコピー */}
      <div
        style={{
          position: "absolute",
          top: 200,
          width: "100%",
          textAlign: "center",
          transform: `scale(${titleScale})`,
        }}
      >
        <div style={textStyle(90, "#FF6B6B")}>
          同じワンコを
        </div>
        <div style={{
          ...textStyle(110, "#FF6B6B"),
          marginTop: 20,
        }}>
          つなげよう！
        </div>
      </div>

      {/* 飛び出す犬たち */}
      {flyingDogs.map((item, i) => {
        const progress = spring({
          frame: frame - item.delay,
          fps,
          config: { damping: 12, stiffness: 80 },
        });

        const x = interpolate(progress, [0, 1], [item.startX, item.endX]);
        const y = interpolate(progress, [0, 1], [item.startY, item.endY]);
        const bounce = Math.sin((frame - item.delay) * 0.2) * 15;

        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x - 100,
              top: y + bounce - 100,
              opacity: progress,
            }}
          >
            <Img
              src={staticFile(`dog_${item.dog.id}_excited.png`)}
              style={{
                width: 200,
                height: 200,
                objectFit: "contain",
                filter: "drop-shadow(0 8px 20px rgba(0,0,0,0.3))",
              }}
            />
          </div>
        );
      })}

      {/* 下部のサブテキスト */}
      <div
        style={{
          position: "absolute",
          bottom: 200,
          width: "100%",
          textAlign: "center",
          opacity: interpolate(frame, [50, 70], [0, 1], { extrapolateRight: "clamp" }),
        }}
      >
        <div style={textStyle(50, "#5D4037")}>
          かんたんパズルゲーム
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ============================================
// Scene 2: Rule Explanation (90-360 frames = 9秒)
// ゲームの核心ルールを説明
// ============================================
const RuleExplanationScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // フェーズ: グリッド紹介(0-90) → 犬配置(90-150) → つなげる説明(150-210) → 全マス(210-270)
  const phase = frame < 90 ? 1 : frame < 150 ? 2 : frame < 210 ? 3 : 4;

  // 6×6グリッド設定
  const gridStartX = 90;
  const gridStartY = 500;
  const cellSize = 150;

  const getGridPosition = (gx: number, gy: number) => ({
    x: gridStartX + gx * cellSize + cellSize / 2,
    y: gridStartY + gy * cellSize + cellSize / 2,
  });

  // 4ペアの犬の配置（各犬種2匹ずつ = 8匹）
  const dogPlacements = useMemo(() => [
    // ペア1: 柴犬
    { dog: dogs[0], gridX: 0, gridY: 0, pair: "A" },
    { dog: dogs[0], gridX: 5, gridY: 5, pair: "A" },
    // ペア2: パグ
    { dog: dogs[1], gridX: 5, gridY: 0, pair: "B" },
    { dog: dogs[1], gridX: 0, gridY: 5, pair: "B" },
    // ペア3: トイプードル
    { dog: dogs[2], gridX: 2, gridY: 1, pair: "C" },
    { dog: dogs[2], gridX: 3, gridY: 4, pair: "C" },
    // ペア4: ハスキー
    { dog: dogs[3], gridX: 1, gridY: 3, pair: "D" },
    { dog: dogs[3], gridX: 4, gridY: 2, pair: "D" },
  ], []);

  // つなげるアニメーション用のパス（柴犬ペア）
  const connectionPath = useMemo(() => [
    getGridPosition(0, 0),
    getGridPosition(0, 1),
    getGridPosition(0, 2),
    getGridPosition(1, 2),
    getGridPosition(2, 2),
    getGridPosition(2, 3),
    getGridPosition(2, 4),
    getGridPosition(2, 5),
    getGridPosition(3, 5),
    getGridPosition(4, 5),
    getGridPosition(5, 5),
  ], []);

  // 接続アニメーション
  const connectionProgress = phase >= 3 ? interpolate(
    frame - 150,
    [0, 50],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) }
  ) : 0;

  const totalSegments = connectionPath.length - 1;
  const currentSegment = Math.min(
    Math.floor(connectionProgress * totalSegments),
    totalSegments - 1
  );
  const segmentProgress = connectionProgress > 0 ? (connectionProgress * totalSegments) % 1 : 0;

  // 現在のパスの終点
  const getCurrentPathEnd = () => {
    if (connectionProgress <= 0) return connectionPath[0];
    if (currentSegment >= totalSegments - 1 && segmentProgress >= 1) {
      return connectionPath[connectionPath.length - 1];
    }
    const prev = connectionPath[currentSegment];
    const next = connectionPath[currentSegment + 1];
    return {
      x: interpolate(segmentProgress, [0, 1], [prev.x, next.x]),
      y: interpolate(segmentProgress, [0, 1], [prev.y, next.y]),
    };
  };

  const pathEnd = getCurrentPathEnd();

  return (
    <AbsoluteFill
      style={{
        background: "linear-gradient(180deg, #FFF9C4 0%, #FFECB3 100%)",
      }}
    >
      {/* ルール説明テキスト */}
      <div
        style={{
          position: "absolute",
          top: 80,
          width: "100%",
          textAlign: "center",
        }}
      >
        {phase === 1 && (
          <div style={textStyle(65, "#FF8C00")}>
            6×6のマスがあるよ
          </div>
        )}
        {phase === 2 && (
          <div style={textStyle(55, "#FF8C00")}>
            同じ犬種が2匹ずつ<br />
            4ペアいるよ！
          </div>
        )}
        {phase === 3 && (
          <div style={textStyle(55, "#4CAF50")}>
            同じ犬種同士を<br />
            なぞってつなげる！
          </div>
        )}
        {phase === 4 && (
          <div style={textStyle(55, "#E91E63")}>
            全部のマスを<br />
            埋めたらクリア！
          </div>
        )}
      </div>

      {/* 6×6グリッド（masu.png使用） */}
      <div
        style={{
          position: "absolute",
          left: gridStartX - 10,
          top: gridStartY - 10,
          opacity: interpolate(frame, [0, 30], [0, 1], { extrapolateRight: "clamp" }),
        }}
      >
        <Img
          src={staticFile("masu.png")}
          style={{
            width: cellSize * 6 + 20,
            height: cellSize * 6 + 20,
          }}
        />
      </div>

      {/* グリッドカウント表示 */}
      {phase === 1 && frame > 30 && (
        <div
          style={{
            position: "absolute",
            top: gridStartY + cellSize * 3 - 50,
            width: "100%",
            textAlign: "center",
          }}
        >
          <div
            style={{
              ...textStyle(100, "#FFB347"),
              opacity: interpolate(frame - 30, [0, 20], [0, 1], { extrapolateRight: "clamp" }),
            }}
          >
            36マス
          </div>
        </div>
      )}

      {/* 接続ライン（肉球トレイル） */}
      {phase >= 3 && connectionProgress > 0 && (
        <>
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
              <linearGradient id="shibaGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={dogs[0].color} />
                <stop offset="100%" stopColor="#FF8C00" />
              </linearGradient>
            </defs>
            <path
              d={connectionPath
                .slice(0, currentSegment + 2)
                .map((p, i) => {
                  if (i === 0) return `M ${p.x} ${p.y}`;
                  if (i === currentSegment + 1 && segmentProgress < 1) {
                    const prev = connectionPath[i - 1];
                    const x = interpolate(segmentProgress, [0, 1], [prev.x, p.x]);
                    const y = interpolate(segmentProgress, [0, 1], [prev.y, p.y]);
                    return `L ${x} ${y}`;
                  }
                  return `L ${p.x} ${p.y}`;
                })
                .join(" ")}
              stroke="url(#shibaGradient)"
              strokeWidth="35"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              opacity={0.7}
            />
          </svg>

          {/* 肉球トレイル（パス上に配置） */}
          {connectionPath.slice(0, currentSegment + 1).map((pos, i) => (
            <Img
              key={i}
              src={staticFile("paw_brown_bone.png")}
              style={{
                position: "absolute",
                left: pos.x - 30,
                top: pos.y - 30,
                width: 60,
                height: 60,
                transform: `rotate(${i * 15}deg)`,
                opacity: 0.9,
              }}
            />
          ))}

          {/* 指 */}
          <div
            style={{
              position: "absolute",
              left: pathEnd.x - 25,
              top: pathEnd.y + 30,
              transform: "rotate(-30deg)",
            }}
          >
            <div
              style={{
                width: 45,
                height: 75,
                background: "linear-gradient(180deg, #FFCCBC 0%, #FFAB91 100%)",
                borderRadius: "22px 22px 28px 28px",
                boxShadow: "0 8px 25px rgba(0,0,0,0.3)",
              }}
            />
          </div>
        </>
      )}

      {/* 犬たち */}
      {phase >= 2 && dogPlacements.map((item, i) => {
        const pos = getGridPosition(item.gridX, item.gridY);
        const enterScale = spring({
          frame: frame - 90 - i * 5,
          fps,
          config: { damping: 10, stiffness: 120 },
        });
        const isShiba = item.dog.id === "shiba";
        const isConnected = isShiba && phase >= 3 && connectionProgress > 0.9;
        const expression: Expression = isConnected ? "happy" : "neutral";
        const wobble = isConnected ? Math.sin((frame + i * 10) * 0.3) * 8 : 0;

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
                  filter: "blur(15px)",
                  opacity: 0.5,
                }}
              />
            )}
            <Img
              src={staticFile(`dog_${item.dog.id}_${expression}.png`)}
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

      {/* ペア数の表示 */}
      {phase === 2 && frame > 110 && (
        <div
          style={{
            position: "absolute",
            bottom: 150,
            width: "100%",
            textAlign: "center",
            opacity: interpolate(frame - 110, [0, 20], [0, 1], { extrapolateRight: "clamp" }),
          }}
        >
          <div style={textStyle(80, "#5D4037")}>
            4ペア = 8匹
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
};

// ============================================
// Scene 3: Full Demo Play (360-750 frames = 13秒)
// 完全なゲームプレイデモ
// ============================================
const FullDemoScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const gridStartX = 90;
  const gridStartY = 450;
  const cellSize = 150;

  const getGridPosition = (gx: number, gy: number) => ({
    x: gridStartX + gx * cellSize + cellSize / 2,
    y: gridStartY + gy * cellSize + cellSize / 2,
  });

  // 4ペアの犬の配置
  const dogPlacements = useMemo(() => [
    { dog: dogs[0], gridX: 0, gridY: 0, pair: "A" },
    { dog: dogs[0], gridX: 5, gridY: 5, pair: "A" },
    { dog: dogs[1], gridX: 5, gridY: 0, pair: "B" },
    { dog: dogs[1], gridX: 0, gridY: 5, pair: "B" },
    { dog: dogs[2], gridX: 2, gridY: 1, pair: "C" },
    { dog: dogs[2], gridX: 3, gridY: 4, pair: "C" },
    { dog: dogs[3], gridX: 1, gridY: 3, pair: "D" },
    { dog: dogs[3], gridX: 4, gridY: 2, pair: "D" },
  ], []);

  // 4つのパス（各ペアを接続）
  const paths = useMemo(() => ({
    A: [
      getGridPosition(0, 0), getGridPosition(0, 1), getGridPosition(0, 2),
      getGridPosition(1, 2), getGridPosition(2, 2), getGridPosition(2, 3),
      getGridPosition(2, 4), getGridPosition(2, 5), getGridPosition(3, 5),
      getGridPosition(4, 5), getGridPosition(5, 5)
    ],
    B: [
      getGridPosition(5, 0), getGridPosition(5, 1), getGridPosition(5, 2),
      getGridPosition(5, 3), getGridPosition(5, 4), getGridPosition(4, 4),
      getGridPosition(3, 4), getGridPosition(3, 3), getGridPosition(3, 2),
      getGridPosition(3, 1), getGridPosition(3, 0), getGridPosition(2, 0),
      getGridPosition(1, 0), getGridPosition(1, 1), getGridPosition(1, 2),
      getGridPosition(1, 3), getGridPosition(1, 4), getGridPosition(1, 5),
      getGridPosition(0, 5)
    ],
    C: [
      getGridPosition(2, 1), getGridPosition(2, 0), getGridPosition(3, 0),
      getGridPosition(4, 0), getGridPosition(4, 1), getGridPosition(4, 2),
      getGridPosition(4, 3), getGridPosition(4, 4), getGridPosition(3, 4)
    ],
    D: [
      getGridPosition(1, 3), getGridPosition(0, 3), getGridPosition(0, 4),
      getGridPosition(0, 5), getGridPosition(1, 5), getGridPosition(1, 4),
      getGridPosition(2, 4), getGridPosition(2, 3), getGridPosition(3, 3),
      getGridPosition(4, 3), getGridPosition(4, 2)
    ],
  }), []);

  // パスアニメーション（順番に描画: A → B → C → D）
  const pathTimings = [
    { key: "A", start: 0, end: 80, color: dogs[0].color },
    { key: "B", start: 80, end: 180, color: dogs[1].color },
    { key: "C", start: 180, end: 250, color: dogs[2].color },
    { key: "D", start: 250, end: 320, color: dogs[3].color },
  ];

  // 完了判定
  const allComplete = frame > 330;
  const shake = useScreenShake(frame, 330, 12, 20);

  // 進捗表示（肉球）
  const progress = interpolate(frame, [0, 320], [0, 10], { extrapolateRight: "clamp" });
  const pawCount = Math.floor(progress);

  return (
    <AbsoluteFill
      style={{
        background: "linear-gradient(180deg, #E8F5E9 0%, #C8E6C9 100%)",
        transform: allComplete ? `translate(${shake.x}px, ${shake.y}px)` : undefined,
      }}
    >
      {/* 進捗バー（肉球） */}
      <div
        style={{
          position: "absolute",
          top: 80,
          width: "100%",
          display: "flex",
          justifyContent: "center",
          gap: 10,
        }}
      >
        {[...Array(10)].map((_, i) => (
          <Img
            key={i}
            src={staticFile("paw_brown_bone.png")}
            style={{
              width: 70,
              height: 70,
              opacity: i < pawCount ? 1 : 0.3,
              filter: i < pawCount ? "none" : "grayscale(1)",
              transform: i < pawCount ? `scale(${1 + Math.sin((frame + i * 10) * 0.1) * 0.1})` : "scale(1)",
            }}
          />
        ))}
      </div>

      {/* ヘッダーテキスト */}
      <div
        style={{
          position: "absolute",
          top: 180,
          width: "100%",
          textAlign: "center",
        }}
      >
        <div style={textStyle(50, "#5D4037")}>
          {allComplete ? "クリア！" : "全マスを埋めよう"}
        </div>
      </div>

      {/* グリッド */}
      <div
        style={{
          position: "absolute",
          left: gridStartX - 10,
          top: gridStartY - 10,
        }}
      >
        <Img
          src={staticFile("masu.png")}
          style={{
            width: cellSize * 6 + 20,
            height: cellSize * 6 + 20,
          }}
        />
      </div>

      {/* パス描画 */}
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
        {pathTimings.map((timing) => {
          const path = paths[timing.key as keyof typeof paths];
          const pathProgress = interpolate(
            frame,
            [timing.start, timing.end],
            [0, 1],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) }
          );

          if (pathProgress <= 0) return null;

          const totalSegs = path.length - 1;
          const currentSeg = Math.min(Math.floor(pathProgress * totalSegs), totalSegs - 1);
          const segProg = (pathProgress * totalSegs) % 1;

          return (
            <path
              key={timing.key}
              d={path
                .slice(0, currentSeg + 2)
                .map((p, i) => {
                  if (i === 0) return `M ${p.x} ${p.y}`;
                  if (i === currentSeg + 1 && segProg < 1) {
                    const prev = path[i - 1];
                    const x = interpolate(segProg, [0, 1], [prev.x, p.x]);
                    const y = interpolate(segProg, [0, 1], [prev.y, p.y]);
                    return `L ${x} ${y}`;
                  }
                  return `L ${p.x} ${p.y}`;
                })
                .join(" ")}
              stroke={timing.color}
              strokeWidth="30"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              opacity={0.7}
            />
          );
        })}
      </svg>

      {/* 犬たち */}
      {dogPlacements.map((item, i) => {
        const pos = getGridPosition(item.gridX, item.gridY);
        const pairTiming = pathTimings.find(t => t.key === item.pair);
        const isConnected = pairTiming && frame > pairTiming.end;
        const expression: Expression = allComplete ? "excited" : isConnected ? "happy" : "neutral";
        const wobble = allComplete ? Math.sin((frame + i * 10) * 0.4) * 10 : 0;

        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: pos.x - 55,
              top: pos.y - 55,
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
                  filter: "blur(15px)",
                  opacity: 0.5,
                }}
              />
            )}
            <Img
              src={staticFile(`dog_${item.dog.id}_${expression}.png`)}
              style={{
                width: 110,
                height: 110,
                objectFit: "contain",
                transform: `rotate(${wobble}deg) scale(${allComplete ? 1.1 : 1})`,
                filter: "drop-shadow(0 4px 10px rgba(0,0,0,0.2))",
              }}
            />
          </div>
        );
      })}

      {/* クリア演出 */}
      {allComplete && (
        <>
          <Sparkles count={50} intensity={1.5} />
          <div
            style={{
              position: "absolute",
              bottom: 150,
              width: "100%",
              textAlign: "center",
            }}
          >
            <div
              style={{
                ...textStyle(90, "#4CAF50"),
                transform: `scale(${1 + Math.sin(frame * 0.2) * 0.05})`,
              }}
            >
              ✨ CLEAR! ✨
            </div>
          </div>
        </>
      )}
    </AbsoluteFill>
  );
};

// ============================================
// Scene 4: Praise Scene (750-960 frames = 7秒)
// 褒める演出・キャラ紹介導入
// ============================================
const PraiseScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const celebrationDogs = [dogs[0], dogs[1], dogs[2], dogs[3], dogs[4], dogs[5]];
  const shake = useScreenShake(frame, 0, 10, 20);

  return (
    <AbsoluteFill
      style={{
        background: "linear-gradient(180deg, #FFE0B2 0%, #FFCC80 100%)",
        transform: `translate(${shake.x}px, ${shake.y}px)`,
      }}
    >
      <Sparkles count={60} intensity={1.3} />

      {/* メインテキスト */}
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
            ...textStyle(90, "#FF6B6B"),
            transform: `scale(${1 + Math.sin(frame * 0.15) * 0.05})`,
          }}
        >
          すごい！
        </div>
        <div
          style={{
            ...textStyle(55, "#5D4037"),
            marginTop: 30,
            opacity: interpolate(frame, [30, 50], [0, 1], { extrapolateRight: "clamp" }),
          }}
        >
          いろんなワンコがいるよ！
        </div>
      </div>

      {/* 喜ぶ犬たち */}
      <div
        style={{
          position: "absolute",
          top: 500,
          width: "100%",
          display: "flex",
          justifyContent: "center",
          flexWrap: "wrap",
          gap: 20,
          padding: "0 50px",
        }}
      >
        {celebrationDogs.map((dog, i) => {
          const enterScale = spring({
            frame: frame - i * 10,
            fps,
            config: { damping: 10, stiffness: 100 },
          });
          const bounce = Math.sin((frame + i * 15) * 0.2) * 20;
          const wiggle = Math.sin((frame + i * 10) * 0.15) * 10;

          return (
            <div
              key={dog.id}
              style={{
                transform: `scale(${Math.min(enterScale, 1)}) translateY(${bounce}px) rotate(${wiggle}deg)`,
              }}
            >
              <div
                style={{
                  position: "relative",
                  background: "white",
                  borderRadius: 30,
                  padding: 15,
                  boxShadow: "0 8px 25px rgba(0,0,0,0.15)",
                }}
              >
                <Img
                  src={staticFile(`dog_${dog.id}_excited.png`)}
                  style={{
                    width: 140,
                    height: 140,
                    objectFit: "contain",
                  }}
                />
                <div
                  style={{
                    ...textStyle(24, "#5D4037"),
                    textAlign: "center",
                    marginTop: 5,
                  }}
                >
                  {dog.label}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 40種類以上のテキスト */}
      <div
        style={{
          position: "absolute",
          bottom: 150,
          width: "100%",
          textAlign: "center",
          opacity: interpolate(frame, [120, 150], [0, 1], { extrapolateRight: "clamp" }),
        }}
      >
        <div style={textStyle(70, "#FFD700")}>
          40種類以上！
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ============================================
// Scene 5: Collection Scene (960-1260 frames = 10秒)
// コレクション要素・シルエット
// ============================================
const CollectionScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const collectionDogs = [
    { dog: dogs[0], unlocked: true },
    { dog: dogs[1], unlocked: true },
    { dog: dogs[2], unlocked: true },
    { dog: dogs[3], unlocked: true },
    { dog: dogs[4], unlocked: false },
    { dog: dogs[5], unlocked: false },
    { dog: dogs[6], unlocked: false },
    { dog: dogs[7], unlocked: false },
    { dog: { id: "legend", label: "???" }, unlocked: false },
    { dog: { id: "legend2", label: "???" }, unlocked: false },
    { dog: { id: "legend3", label: "???" }, unlocked: false },
    { dog: { id: "legend4", label: "???" }, unlocked: false },
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
          top: 120,
          width: "100%",
          textAlign: "center",
        }}
      >
        <div
          style={{
            ...textStyle(60, "white"),
            opacity: interpolate(frame, [0, 20], [0, 1]),
          }}
        >
          まだ見ぬワンコが
        </div>
        <div
          style={{
            ...textStyle(80, "#FFD700"),
            marginTop: 20,
            opacity: interpolate(frame, [20, 40], [0, 1]),
          }}
        >
          いっぱい！
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
            gridTemplateColumns: "repeat(4, 150px)",
            gap: 25,
          }}
        >
          {collectionDogs.map((item, i) => {
            const enterScale = spring({
              frame: frame - 30 - i * 4,
              fps,
              config: { damping: 12, stiffness: 100 },
            });
            const wobble = item.unlocked ? Math.sin((frame + i * 10) * 0.1) * 3 : 0;

            return (
              <div
                key={i}
                style={{
                  width: 150,
                  height: 150,
                  borderRadius: 30,
                  background: item.unlocked
                    ? "linear-gradient(135deg, #FFFFFF 0%, #F5F5F5 100%)"
                    : "linear-gradient(135deg, #455A64 0%, #37474F 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: item.unlocked
                    ? "0 5px 15px rgba(255,215,0,0.3)"
                    : "inset 0 2px 10px rgba(0,0,0,0.3)",
                  transform: `scale(${Math.min(enterScale, 1)}) rotate(${wobble}deg)`,
                  border: item.unlocked ? "3px solid #FFD700" : "none",
                }}
              >
                {item.unlocked ? (
                  <Img
                    src={staticFile(`dog_${item.dog.id}_happy.png`)}
                    style={{
                      width: 120,
                      height: 120,
                      objectFit: "contain",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      ...textStyle(70, "#546E7A"),
                      textShadow: "none",
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

      {/* 集めてみよう */}
      <div
        style={{
          position: "absolute",
          bottom: 150,
          width: "100%",
          textAlign: "center",
          opacity: interpolate(frame, [180, 210], [0, 1]),
        }}
      >
        <div style={textStyle(55, "#FFD700")}>
          ✨ 集めてみよう！ ✨
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ============================================
// Scene 6: Mode Introduction (1260-1440 frames = 6秒)
// モード紹介
// ============================================
const ModeIntroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const modes = [
    {
      name: "おさんぽモード",
      description: "100ステージ",
      icon: "icon_osanpo.png",
      color: "#4CAF50",
      delay: 0,
    },
    {
      name: "エンドレスモード",
      description: "どこまでいける？",
      icon: "icon_endless.png",
      color: "#FF9800",
      delay: 40,
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
          top: 150,
          width: "100%",
          textAlign: "center",
        }}
      >
        <div
          style={{
            ...textStyle(65, "#1565C0"),
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
          top: 380,
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 60,
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
                padding: "40px 70px",
                boxShadow: `0 15px 40px ${mode.color}40`,
                transform: `scale(${Math.min(cardScale, 1)}) translateY(${bounce}px)`,
                display: "flex",
                alignItems: "center",
                gap: 40,
                borderLeft: `10px solid ${mode.color}`,
              }}
            >
              <Img
                src={staticFile(mode.icon)}
                style={{
                  width: 120,
                  height: 120,
                  objectFit: "contain",
                }}
              />
              <div>
                <div style={textStyle(50, mode.color)}>
                  {mode.name}
                </div>
                <div
                  style={{
                    ...textStyle(35, "#666"),
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
          gap: 20,
        }}
      >
        {[dogs[0], dogs[1], dogs[2], dogs[3]].map((dog, i) => {
          const bounce = Math.sin((frame + i * 15) * 0.2) * 12;
          const enterScale = spring({
            frame: frame - 80 - i * 10,
            fps,
            config: { damping: 12, stiffness: 100 },
          });

          return (
            <div
              key={dog.id}
              style={{
                transform: `scale(${Math.min(enterScale, 1)}) translateY(${bounce}px)`,
              }}
            >
              <Img
                src={staticFile(`dog_${dog.id}_excited.png`)}
                style={{
                  width: 120,
                  height: 120,
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
// Scene 7: CTA Scene (1440-1800 frames = 12秒)
// ダウンロード訴求
// ============================================
const CTAScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

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
    frame: frame - 60,
    fps,
    config: { damping: 10, stiffness: 100 },
  });

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

      {/* ゲームタイトル */}
      <div
        style={{
          position: "absolute",
          top: 250,
          width: "100%",
          textAlign: "center",
          transform: `scale(${titleScale})`,
        }}
      >
        <div style={textStyle(120, "#FF6B6B")}>
          ワンこねくと
        </div>
        <div
          style={{
            ...textStyle(45, "#5D4037"),
            marginTop: 30,
          }}
        >
          同じワンコをつなげよう！
        </div>
      </div>

      {/* 犬たち */}
      <div
        style={{
          position: "absolute",
          top: 650,
          width: "100%",
          display: "flex",
          justifyContent: "center",
          gap: 15,
        }}
      >
        {dogs.slice(0, 6).map((dog, i) => {
          const bounce = Math.sin((frame + i * 10) * 0.25) * 18;
          const wiggle = Math.sin((frame + i * 8) * 0.18) * 10;
          const enterScale = spring({
            frame: frame - 30 - i * 5,
            fps,
            config: { damping: 12, stiffness: 100 },
          });

          return (
            <div
              key={dog.id}
              style={{
                transform: `scale(${Math.min(enterScale, 1)}) translateY(${bounce}px) rotate(${wiggle}deg)`,
              }}
            >
              <Img
                src={staticFile(`dog_${dog.id}_excited.png`)}
                style={{
                  width: 140,
                  height: 140,
                  objectFit: "contain",
                  filter: "drop-shadow(0 8px 15px rgba(0,0,0,0.25))",
                }}
              />
            </div>
          );
        })}
      </div>

      {/* 肉球 */}
      <div
        style={{
          position: "absolute",
          top: 950,
          width: "100%",
          display: "flex",
          justifyContent: "center",
          gap: 30,
        }}
      >
        {[...Array(5)].map((_, i) => {
          const bounce = Math.sin((frame + i * 20) * 0.15) * 10;
          return (
            <Img
              key={i}
              src={staticFile("paw_brown_bone.png")}
              style={{
                width: 80,
                height: 80,
                transform: `translateY(${bounce}px) rotate(${i * 15 - 30}deg)`,
                opacity: 0.8,
              }}
            />
          );
        })}
      </div>

      {/* ダウンロードバッジ */}
      <div
        style={{
          position: "absolute",
          bottom: 350,
          width: "100%",
          display: "flex",
          justifyContent: "center",
          transform: `scale(${ctaScale})`,
        }}
      >
        <div
          style={{
            background: "linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%)",
            padding: "35px 90px",
            borderRadius: 70,
            boxShadow: "0 15px 50px rgba(255, 107, 107, 0.5)",
            transform: `scale(${1 + Math.sin(frame * 0.15) * 0.04})`,
          }}
        >
          <span style={textStyle(60, "white")}>
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
          opacity: interpolate(frame, [80, 100], [0, 1]),
        }}
      >
        <div
          style={{
            background: "#333",
            color: "white",
            padding: "20px 50px",
            borderRadius: 15,
            ...textStyle(32, "white"),
            textShadow: "none",
          }}
        >
          App Store
        </div>
        <div
          style={{
            background: "#333",
            color: "white",
            padding: "20px 50px",
            borderRadius: 15,
            ...textStyle(32, "white"),
            textShadow: "none",
          }}
        >
          Google Play
        </div>
      </div>

      {/* 無料 */}
      <div
        style={{
          position: "absolute",
          bottom: 60,
          width: "100%",
          textAlign: "center",
          opacity: interpolate(frame, [100, 120], [0, 1]),
        }}
      >
        <div style={textStyle(40, "#4CAF50")}>
          基本プレイ無料！
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ============================================
// Main Composition - 60秒 (1800 frames at 30fps)
// ============================================
export const WanConnectShortPV: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "white" }}>
      {/* Scene 1: Hook - 0-90 frames (3秒) */}
      <Sequence from={0} durationInFrames={90}>
        <HookScene />
      </Sequence>

      {/* Scene 2: Rule Explanation - 90-360 frames (9秒) */}
      <Sequence from={90} durationInFrames={270}>
        <RuleExplanationScene />
      </Sequence>

      {/* Scene 3: Full Demo - 360-750 frames (13秒) */}
      <Sequence from={360} durationInFrames={390}>
        <FullDemoScene />
      </Sequence>

      {/* Scene 4: Praise - 750-960 frames (7秒) */}
      <Sequence from={750} durationInFrames={210}>
        <PraiseScene />
      </Sequence>

      {/* Scene 5: Collection - 960-1260 frames (10秒) */}
      <Sequence from={960} durationInFrames={300}>
        <CollectionScene />
      </Sequence>

      {/* Scene 6: Mode Intro - 1260-1440 frames (6秒) */}
      <Sequence from={1260} durationInFrames={180}>
        <ModeIntroScene />
      </Sequence>

      {/* Scene 7: CTA - 1440-1800 frames (12秒) */}
      <Sequence from={1440} durationInFrames={360}>
        <CTAScene />
      </Sequence>
    </AbsoluteFill>
  );
};
