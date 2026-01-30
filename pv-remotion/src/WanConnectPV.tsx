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
// Scene 1: Title Scene with Logo (0-150 frames = 5 seconds)
// ============================================
const TitleScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Logo entrance animation
  const logoScale = spring({
    frame,
    fps,
    config: { damping: 12, stiffness: 80 },
  });

  const logoOpacity = interpolate(frame, [0, 15], [0, 1], {
    extrapolateRight: "clamp",
  });

  // Floating paw prints
  const pawPositions = [
    { x: 150, y: 400, delay: 10 },
    { x: 800, y: 350, delay: 20 },
    { x: 250, y: 1200, delay: 15 },
    { x: 750, y: 1400, delay: 25 },
    { x: 500, y: 600, delay: 30 },
  ];

  // Cute dogs peeking in
  const peekDogs = [
    { dog: dogs[0], from: "left", y: 1100, delay: 40 },
    { dog: dogs[1], from: "right", y: 1300, delay: 50 },
    { dog: dogs[4], from: "bottom", x: 540, delay: 60 },
  ];

  // Tagline words animation
  const taglineWords = ["つなげる。", "うめる。", "かわいい！"];

  return (
    <AbsoluteFill>
      {/* Background */}
      <Img
        src={staticFile("titlehaikei.png")}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
        }}
      />

      {/* Floating paw prints */}
      {pawPositions.map((paw, i) => {
        const pawOpacity = interpolate(
          frame - paw.delay,
          [0, 20],
          [0, 0.3],
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
              fontSize: 60,
              opacity: pawOpacity,
              transform: `rotate(${-20 + i * 10}deg)`,
            }}
          >
            🐾
          </div>
        );
      })}

      {/* Logo */}
      <div
        style={{
          position: "absolute",
          top: 250,
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
            filter: "drop-shadow(0 20px 40px rgba(0,0,0,0.3))",
          }}
        />
      </div>

      {/* Tagline - "つなげる。うめる。かわいい！" */}
      <div
        style={{
          position: "absolute",
          top: 750,
          width: "100%",
          textAlign: "center",
          display: "flex",
          justifyContent: "center",
          gap: 10,
        }}
      >
        {taglineWords.map((word, i) => {
          const wordDelay = 30 + i * 12;
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
                fontSize: 55,
                fontWeight: "bold",
                color: i === 2 ? "#FF6B6B" : "#5D4037",
                textShadow: "3px 3px 0 white, -3px -3px 0 white, 3px -3px 0 white, -3px 3px 0 white",
                fontFamily: "sans-serif",
                opacity: wordOpacity,
                transform: `scale(${Math.min(wordScale, 1.1)})`,
              }}
            >
              {word}
            </div>
          );
        })}
      </div>

      {/* Peeking dogs */}
      {peekDogs.map((item) => {
        const peekProgress = spring({
          frame: frame - item.delay,
          fps,
          config: { damping: 15, stiffness: 60 },
        });

        let transform = "";
        let position: React.CSSProperties = {};

        if (item.from === "left") {
          transform = `translateX(${interpolate(peekProgress, [0, 1], [-400, -120])}px)`;
          position = { left: 0, top: item.y };
        } else if (item.from === "right") {
          transform = `translateX(${interpolate(peekProgress, [0, 1], [400, 120])}px) scaleX(-1)`;
          position = { right: 0, top: item.y };
        } else {
          transform = `translateY(${interpolate(peekProgress, [0, 1], [400, 80])}px)`;
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
// Scene 2: Gameplay Demo - Connecting dogs with paw trail (150-450 frames = 10 seconds)
// ============================================
const GameplayDemo: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Phase 1: Show grid (0-60 frames)
  // Phase 2: Draw connection with paw trail (60-180 frames)
  // Phase 3: Success animation (180-300 frames)

  // Dogs on grid positions
  const gridDogs = [
    { dog: dogs[0], gridX: 0, gridY: 0, connected: true }, // shiba 1
    { dog: dogs[1], gridX: 1, gridY: 0, connected: false }, // pug
    { dog: dogs[0], gridX: 2, gridY: 0, connected: true }, // shiba 2
    { dog: dogs[2], gridX: 0, gridY: 1, connected: false }, // toypoodle
    { dog: dogs[0], gridX: 1, gridY: 1, connected: true }, // shiba 3
    { dog: dogs[3], gridX: 2, gridY: 1, connected: false }, // husky
    { dog: dogs[1], gridX: 0, gridY: 2, connected: false }, // pug
    { dog: dogs[0], gridX: 1, gridY: 2, connected: true }, // shiba 4
    { dog: dogs[2], gridX: 2, gridY: 2, connected: false }, // toypoodle
  ];

  const gridStartX = 190;
  const gridStartY = 450;
  const cellSize = 240;

  const getGridPosition = (gx: number, gy: number) => ({
    x: gridStartX + gx * cellSize + cellSize / 2,
    y: gridStartY + gy * cellSize + cellSize / 2,
  });

  // Connection path (connecting 4 shibas in a path)
  const connectionPath = [
    getGridPosition(0, 0), // shiba 1
    getGridPosition(1, 0), // through pug cell
    getGridPosition(2, 0), // shiba 2
    getGridPosition(2, 1), // through husky cell
    getGridPosition(1, 1), // shiba 3
    getGridPosition(1, 2), // shiba 4
  ];

  // Connection line animation progress
  const connectionProgress = interpolate(frame, [60, 180], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  // Calculate current position along the path
  const totalSegments = connectionPath.length - 1;
  const currentSegment = Math.min(
    Math.floor(connectionProgress * totalSegments),
    totalSegments - 1
  );
  const segmentProgress = (connectionProgress * totalSegments) % 1;

  // Finger position
  let fingerX = connectionPath[0].x;
  let fingerY = connectionPath[0].y;

  if (connectionProgress > 0 && currentSegment < totalSegments) {
    const start = connectionPath[currentSegment];
    const end = connectionPath[currentSegment + 1];
    fingerX = interpolate(segmentProgress, [0, 1], [start.x, end.x]);
    fingerY = interpolate(segmentProgress, [0, 1], [start.y, end.y]);
  }

  // Paw trail positions
  const pawTrailCount = 20;
  const pawTrails = [];
  for (let i = 0; i < pawTrailCount; i++) {
    const trailProgress = Math.max(
      0,
      connectionProgress - (i * 0.03)
    );
    if (trailProgress > 0) {
      const trailSegment = Math.min(
        Math.floor(trailProgress * totalSegments),
        totalSegments - 1
      );
      const trailSegmentProgress = (trailProgress * totalSegments) % 1;

      if (trailSegment < totalSegments) {
        const start = connectionPath[trailSegment];
        const end = connectionPath[trailSegment + 1];
        const x = interpolate(trailSegmentProgress, [0, 1], [start.x, end.x]);
        const y = interpolate(trailSegmentProgress, [0, 1], [start.y, end.y]);
        pawTrails.push({ x, y, opacity: 1 - (i / pawTrailCount) * 0.7 });
      }
    }
  }

  const showSuccess = frame > 200;
  const successScale = spring({
    frame: frame - 200,
    fps,
    config: { damping: 10, stiffness: 100 },
  });

  // Star spin animation
  const starRotation = frame * 3;

  return (
    <AbsoluteFill
      style={{
        background: "linear-gradient(180deg, #E8F5E9 0%, #C8E6C9 100%)",
      }}
    >
      {/* Title */}
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
            fontSize: 55,
            fontWeight: "bold",
            color: "#2E7D32",
            fontFamily: "sans-serif",
            opacity: interpolate(frame, [0, 20], [0, 1]),
          }}
        >
          同じワンコをつなげよう！
        </div>
      </div>

      {/* Grid background */}
      <div
        style={{
          position: "absolute",
          left: gridStartX - 20,
          top: gridStartY - 20,
          width: cellSize * 3 + 40,
          height: cellSize * 3 + 40,
          background: "rgba(255,255,255,0.9)",
          borderRadius: 30,
          boxShadow: "0 10px 40px rgba(0,0,0,0.1)",
        }}
      />

      {/* Paw trail */}
      {pawTrails.map((paw, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: paw.x - 25,
            top: paw.y - 25,
            width: 50,
            height: 50,
            opacity: paw.opacity * 0.8,
            fontSize: 40,
            transform: `rotate(${(i * 20) - 10}deg)`,
          }}
        >
          🐾
        </div>
      ))}

      {/* Connection line */}
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
          <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#FFB347" />
            <stop offset="100%" stopColor="#FF6B6B" />
          </linearGradient>
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
            stroke="url(#lineGradient)"
            strokeWidth="16"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            opacity={0.7}
          />
        )}
      </svg>

      {/* Dogs on grid */}
      {gridDogs.map((item, i) => {
        const pos = getGridPosition(item.gridX, item.gridY);
        const isConnected = item.connected && frame > 190;
        const wobble = isConnected ? Math.sin((frame + i * 10) * 0.3) * 5 : 0;
        const expression: Expression = isConnected ? "excited" : "normal";
        const glowOpacity = isConnected ? 0.6 : 0;

        const enterScale = spring({
          frame: frame - i * 3,
          fps,
          config: { damping: 12, stiffness: 100 },
        });

        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: pos.x - 90,
              top: pos.y - 90,
              transform: `scale(${Math.min(enterScale, 1)})`,
            }}
          >
            {/* Glow effect for connected dogs */}
            <div
              style={{
                position: "absolute",
                width: 180,
                height: 180,
                borderRadius: "50%",
                background: item.dog.color,
                filter: "blur(25px)",
                opacity: glowOpacity,
              }}
            />
            <Img
              src={staticFile(`${item.dog.name}_${expression}.png`)}
              style={{
                width: 180,
                height: 180,
                objectFit: "contain",
                transform: `rotate(${wobble}deg)`,
                filter: "drop-shadow(0 5px 15px rgba(0,0,0,0.2))",
              }}
            />
          </div>
        );
      })}

      {/* Finger */}
      {frame >= 60 && frame <= 185 && (
        <div
          style={{
            position: "absolute",
            left: fingerX - 30,
            top: fingerY + 60,
            transform: "rotate(-30deg)",
          }}
        >
          <div
            style={{
              width: 55,
              height: 90,
              background: "linear-gradient(180deg, #FFCCBC 0%, #FFAB91 100%)",
              borderRadius: "28px 28px 32px 32px",
              boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
            }}
          />
        </div>
      )}

      {/* Success message with spinning stars */}
      {showSuccess && (
        <div
          style={{
            position: "absolute",
            bottom: 180,
            width: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          {/* Spinning stars */}
          <div style={{ display: "flex", gap: 20, marginBottom: 20 }}>
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                style={{
                  fontSize: 50,
                  transform: `rotate(${starRotation + i * 120}deg) scale(${successScale})`,
                  color: "#FFD700",
                  textShadow: "0 0 20px rgba(255, 215, 0, 0.8)",
                }}
              >
                ★
              </div>
            ))}
          </div>
          <div
            style={{
              display: "inline-block",
              background: "linear-gradient(135deg, #FFD700 0%, #FFA500 100%)",
              padding: "25px 60px",
              borderRadius: 50,
              boxShadow: "0 15px 40px rgba(255, 165, 0, 0.4)",
              transform: `scale(${successScale})`,
            }}
          >
            <span
              style={{
                fontSize: 55,
                fontWeight: "bold",
                color: "white",
                textShadow: "2px 2px 4px rgba(0,0,0,0.2)",
                fontFamily: "sans-serif",
              }}
            >
              つながった！
            </span>
          </div>
        </div>
      )}

      {/* Floating hearts when success */}
      {showSuccess &&
        [...Array(10)].map((_, i) => {
          const heartFrame = frame - 200;
          const floatY = -heartFrame * 5 - i * 25;
          const floatX = Math.sin(heartFrame * 0.08 + i * 2) * 50;
          const heartOpacity = interpolate(heartFrame, [0, 60], [1, 0], {
            extrapolateRight: "clamp",
          });

          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: 440 + i * 25 + floatX,
                top: 800 + floatY,
                fontSize: 40,
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
// Scene 3: Character Showcase - Slideshow of dogs (450-660 frames = 7 seconds)
// ============================================
const CharacterShowcase: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Popular dogs to showcase
  const showcaseDogs = [
    dogs[0], // shiba
    dogs[1], // pug
    dogs[5], // corgi
    dogs[9], // samoyed
    dogs[4], // golden
    dogs[3], // husky
  ];

  // Slide timing (each dog shows for ~35 frames)
  const slideIndex = Math.floor(frame / 35) % showcaseDogs.length;
  const slideProgress = (frame % 35) / 35;

  return (
    <AbsoluteFill
      style={{
        background: "linear-gradient(180deg, #FFF8DC 0%, #FFEFD5 100%)",
      }}
    >
      {/* Title */}
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
          32種類のワンコを集めよう！
        </div>
      </div>

      {/* Main showcase area */}
      <div
        style={{
          position: "absolute",
          top: 280,
          width: "100%",
          display: "flex",
          justifyContent: "center",
        }}
      >
        {/* Current dog card */}
        {showcaseDogs.map((dog, i) => {
          const isActive = i === slideIndex;
          const enterScale = spring({
            frame: isActive ? frame % 35 : -10,
            fps,
            config: { damping: 12, stiffness: 100 },
          });

          const bounce = isActive ? Math.sin(frame * 0.15) * 10 : 0;

          if (!isActive) return null;

          return (
            <div
              key={dog.name}
              style={{
                background: "white",
                borderRadius: 50,
                padding: 40,
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
                  width: 450,
                  height: 450,
                  objectFit: "contain",
                }}
              />
              <div
                style={{
                  fontSize: 55,
                  fontWeight: "bold",
                  color: "#5D4037",
                  marginTop: 20,
                  fontFamily: "sans-serif",
                }}
              >
                {dog.label}
              </div>
            </div>
          );
        })}
      </div>

      {/* Dog thumbnails at bottom */}
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
                width: 120,
                height: 120,
                borderRadius: 30,
                background: isActive ? dog.color : "white",
                padding: 10,
                boxShadow: isActive
                  ? `0 5px 20px ${dog.color}80`
                  : "0 3px 10px rgba(0,0,0,0.1)",
                transform: isActive ? "scale(1.1)" : "scale(1)",
                transition: "all 0.2s",
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

      {/* Progress dots */}
      <div
        style={{
          position: "absolute",
          bottom: 80,
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
              width: i === slideIndex ? 40 : 15,
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
// Scene 4: Mode Introduction (660-810 frames = 5 seconds)
// ============================================
const ModeIntroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const modes = [
    {
      name: "ストーリーモード",
      description: "100ステージ",
      icon: "📖",
      color: "#4CAF50",
      delay: 0,
    },
    {
      name: "チャレンジモード",
      description: "エンドレス",
      icon: "🏆",
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
      {/* Title */}
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

      {/* Mode cards */}
      <div
        style={{
          position: "absolute",
          top: 350,
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

          const bounce = Math.sin((frame + i * 20) * 0.1) * 5;

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
                borderLeft: `8px solid ${mode.color}`,
              }}
            >
              <div style={{ fontSize: 80 }}>{mode.icon}</div>
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
                    fontSize: 40,
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

      {/* Decorative dogs */}
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
          const dogBounce = Math.sin((frame + i * 15) * 0.2) * 10;
          const enterScale = spring({
            frame: frame - 60 - i * 10,
            fps,
            config: { damping: 12, stiffness: 100 },
          });

          return (
            <div
              key={dog.name}
              style={{
                transform: `scale(${Math.min(enterScale, 1)}) translateY(${dogBounce}px)`,
              }}
            >
              <Img
                src={staticFile(`${dog.name}_excited.png`)}
                style={{
                  width: 150,
                  height: 150,
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
// Scene 5: Grand Finale - CTA (810-900 frames = 3 seconds)
// ============================================
const GrandFinale: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Confetti
  const confetti = [...Array(30)].map((_, i) => ({
    x: (i * 137) % 1080,
    color: ["#FFD700", "#FF69B4", "#87CEEB", "#98FB98", "#DDA0DD", "#FF6B6B"][i % 6],
    speed: 2 + (i % 4),
    offset: i * 70,
  }));

  const titleScale = spring({
    frame,
    fps,
    config: { damping: 10, stiffness: 80 },
  });

  const ctaScale = spring({
    frame: frame - 30,
    fps,
    config: { damping: 10, stiffness: 100 },
  });

  return (
    <AbsoluteFill
      style={{
        background: "linear-gradient(180deg, #FFF59D 0%, #FFB74D 50%, #FF8A65 100%)",
        overflow: "hidden",
      }}
    >
      {/* Confetti */}
      {confetti.map((item, i) => {
        const y = ((frame * item.speed + item.offset) % 2200) - 200;
        const rotation = frame * 4 + i * 45;

        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: item.x,
              top: y,
              width: 12,
              height: 20,
              background: item.color,
              transform: `rotate(${rotation}deg)`,
              borderRadius: 3,
            }}
          />
        );
      })}

      {/* Logo */}
      <div
        style={{
          position: "absolute",
          top: 200,
          width: "100%",
          display: "flex",
          justifyContent: "center",
          transform: `scale(${titleScale})`,
        }}
      >
        <Img
          src={staticFile("titlelogo.png")}
          style={{
            width: 800,
            height: "auto",
            filter: "drop-shadow(0 15px 40px rgba(0,0,0,0.3))",
          }}
        />
      </div>

      {/* Dogs bouncing */}
      <div
        style={{
          position: "absolute",
          top: 750,
          width: "100%",
          display: "flex",
          justifyContent: "center",
          gap: 20,
        }}
      >
        {dogs.slice(0, 6).map((dog, i) => {
          const bounce = Math.sin((frame + i * 12) * 0.25) * 15;
          const wiggle = Math.sin((frame + i * 8) * 0.15) * 8;
          const enterScale = spring({
            frame: frame - i * 5,
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
                  width: 140,
                  height: 140,
                  objectFit: "contain",
                  filter: "drop-shadow(0 8px 15px rgba(0,0,0,0.2))",
                }}
              />
            </div>
          );
        })}
      </div>

      {/* Coming Soon badge */}
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
            transform: `scale(${1 + Math.sin(frame * 0.15) * 0.03})`,
          }}
        >
          <span
            style={{
              fontSize: 55,
              fontWeight: "bold",
              color: "white",
              fontFamily: "sans-serif",
              letterSpacing: 5,
            }}
          >
            Coming Soon
          </span>
        </div>
      </div>

      {/* Platform icons placeholder */}
      <div
        style={{
          position: "absolute",
          bottom: 150,
          width: "100%",
          display: "flex",
          justifyContent: "center",
          gap: 40,
          opacity: interpolate(frame, [40, 60], [0, 1]),
        }}
      >
        <div
          style={{
            background: "#333",
            color: "white",
            padding: "15px 40px",
            borderRadius: 15,
            fontSize: 28,
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
            padding: "15px 40px",
            borderRadius: 15,
            fontSize: 28,
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
// Main Composition - 30 seconds (900 frames at 30fps)
// ============================================
export const WanConnectPV: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "white" }}>
      {/* Scene 1: Title - 0-150 frames (5 seconds) */}
      <Sequence from={0} durationInFrames={150}>
        <TitleScene />
      </Sequence>

      {/* Scene 2: Gameplay Demo - 150-450 frames (10 seconds) */}
      <Sequence from={150} durationInFrames={300}>
        <GameplayDemo />
      </Sequence>

      {/* Scene 3: Character Showcase - 450-660 frames (7 seconds) */}
      <Sequence from={450} durationInFrames={210}>
        <CharacterShowcase />
      </Sequence>

      {/* Scene 4: Mode Introduction - 660-810 frames (5 seconds) */}
      <Sequence from={660} durationInFrames={150}>
        <ModeIntroScene />
      </Sequence>

      {/* Scene 5: Grand Finale - 810-900 frames (3 seconds) */}
      <Sequence from={810} durationInFrames={90}>
        <GrandFinale />
      </Sequence>
    </AbsoluteFill>
  );
};
