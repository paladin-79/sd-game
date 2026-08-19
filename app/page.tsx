"use client";

import {
  type CSSProperties,
  type DragEvent,
  type PointerEvent as ReactPointerEvent,
  useMemo,
  useRef,
  useState,
} from "react";

type ComponentType =
  | "client"
  | "loadBalancer"
  | "api"
  | "cache"
  | "database"
  | "queue";

type GameNode = {
  id: string;
  type: ComponentType;
  x: number;
  y: number;
};

type Edge = { from: string; to: string };

type SimulationResult = {
  throughput: number;
  latency: number;
  availability: number;
  cost: number;
  score: number;
  title: string;
  detail: string;
  tone: "danger" | "warning" | "success";
};

const COMPONENTS: Record<
  ComponentType,
  { label: string; short: string; description: string; cost: number; color: string }
> = {
  client: {
    label: "Web Client",
    short: "WEB",
    description: "Điểm bắt đầu của request",
    cost: 0,
    color: "#a8ff60",
  },
  loadBalancer: {
    label: "Load Balancer",
    short: "LB",
    description: "Phân phối tải qua nhiều API",
    cost: 35,
    color: "#63e6ff",
  },
  api: {
    label: "API Server",
    short: "API",
    description: "Xử lý 4.000 req/s",
    cost: 120,
    color: "#a58cff",
  },
  cache: {
    label: "Redis Cache",
    short: "RDS",
    description: "Giảm 90% lượt đọc database",
    cost: 55,
    color: "#ff9f5b",
  },
  database: {
    label: "Postgres DB",
    short: "DB",
    description: "Lưu URL và metadata",
    cost: 260,
    color: "#62d6a8",
  },
  queue: {
    label: "Event Queue",
    short: "MQ",
    description: "Xử lý công việc bất đồng bộ",
    cost: 45,
    color: "#ffd35c",
  },
};

const PALETTE: ComponentType[] = [
  "loadBalancer",
  "api",
  "cache",
  "database",
  "queue",
];

const INITIAL_NODES: GameNode[] = [
  { id: "client-1", type: "client", x: 56, y: 215 },
  { id: "api-1", type: "api", x: 340, y: 215 },
  { id: "database-1", type: "database", x: 630, y: 215 },
];

const INITIAL_EDGES: Edge[] = [
  { from: "client-1", to: "api-1" },
  { from: "api-1", to: "database-1" },
];

function hasPath(nodes: GameNode[], edges: Edge[], fromType: ComponentType, toType: ComponentType) {
  const starts = nodes.filter((node) => node.type === fromType).map((node) => node.id);
  const targets = new Set(nodes.filter((node) => node.type === toType).map((node) => node.id));
  const visited = new Set<string>();
  const queue = [...starts];

  while (queue.length) {
    const current = queue.shift()!;
    if (targets.has(current) && !starts.includes(current)) return true;
    if (visited.has(current)) continue;
    visited.add(current);
    edges.filter((edge) => edge.from === current).forEach((edge) => queue.push(edge.to));
  }
  return false;
}

export default function Home() {
  const [nodes, setNodes] = useState<GameNode[]>(INITIAL_NODES);
  const [edges, setEdges] = useState<Edge[]>(INITIAL_EDGES);
  const [connectFrom, setConnectFrom] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [notice, setNotice] = useState("Chạy thử kiến trúc hiện tại để tìm bottleneck đầu tiên.");
  const canvasRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef({ id: "", offsetX: 0, offsetY: 0, moved: false });

  const apiCount = nodes.filter((node) => node.type === "api").length;
  const hasLoadBalancer = nodes.some((node) => node.type === "loadBalancer");
  const hasCache = nodes.some((node) => node.type === "cache");

  const renderedEdges = useMemo(() => {
    return edges.flatMap((edge) => {
      const from = nodes.find((node) => node.id === edge.from);
      const to = nodes.find((node) => node.id === edge.to);
      if (!from || !to) return [];
      const x1 = from.x + 72;
      const y1 = from.y + 46;
      const x2 = to.x + 72;
      const y2 = to.y + 46;
      const length = Math.hypot(x2 - x1, y2 - y1);
      const angle = Math.atan2(y2 - y1, x2 - x1) * (180 / Math.PI);
      return [{ ...edge, x1, y1, length, angle }];
    });
  }, [edges, nodes]);

  function addComponent(type: ComponentType, x?: number, y?: number) {
    const sameType = nodes.filter((node) => node.type === type).length;
    const next: GameNode = {
      id: `${type}-${Date.now()}`,
      type,
      x: Math.max(12, Math.min(725, x ?? 235 + ((nodes.length * 73) % 410))),
      y: Math.max(64, Math.min(382, y ?? 80 + ((nodes.length * 67) % 265))),
    };
    setNodes((current) => [...current, next]);
    setResult(null);
    setNotice(
      type === "api" && sameType > 0
        ? "Đã thêm một API instance. Hãy nối nó vào luồng request."
        : `Đã đặt ${COMPONENTS[type].label}. Chọn hai component để nối chúng.`,
    );
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    const type = event.dataTransfer.getData("component") as ComponentType;
    if (!COMPONENTS[type] || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    addComponent(type, event.clientX - rect.left - 72, event.clientY - rect.top - 46);
  }

  function selectNode(id: string) {
    if (!connectFrom) {
      setConnectFrom(id);
      setNotice("Đã chọn điểm bắt đầu. Chọn component đích để tạo kết nối.");
      return;
    }

    if (connectFrom === id) {
      setConnectFrom(null);
      setNotice("Đã hủy chọn.");
      return;
    }

    const exists = edges.some((edge) => edge.from === connectFrom && edge.to === id);
    if (!exists) setEdges((current) => [...current, { from: connectFrom, to: id }]);
    setConnectFrom(null);
    setResult(null);
    setNotice(exists ? "Kết nối này đã tồn tại." : "Kết nối mới đã sẵn sàng.");
  }

  function removeNode(id: string) {
    const node = nodes.find((item) => item.id === id);
    if (node?.type === "client") return;
    setNodes((current) => current.filter((item) => item.id !== id));
    setEdges((current) => current.filter((edge) => edge.from !== id && edge.to !== id));
    setResult(null);
    setConnectFrom(null);
  }

  function pointerDown(event: ReactPointerEvent<HTMLDivElement>, node: GameNode) {
    const rect = event.currentTarget.getBoundingClientRect();
    dragRef.current = {
      id: node.id,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
      moved: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function pointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!dragRef.current.id || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = Math.max(8, Math.min(744, event.clientX - rect.left - dragRef.current.offsetX));
    const y = Math.max(58, Math.min(390, event.clientY - rect.top - dragRef.current.offsetY));
    dragRef.current.moved = true;
    setNodes((current) =>
      current.map((node) => (node.id === dragRef.current.id ? { ...node, x, y } : node)),
    );
  }

  function pointerUp(event: ReactPointerEvent<HTMLDivElement>, id: string) {
    event.currentTarget.releasePointerCapture(event.pointerId);
    const wasMoved = dragRef.current.moved;
    dragRef.current.id = "";
    if (!wasMoved) selectNode(id);
  }

  function runSimulation() {
    setRunning(true);
    setResult(null);
    setNotice("Đang bơm 12.000 request/giây vào hệ thống…");

    window.setTimeout(() => {
      const connected = hasPath(nodes, edges, "client", "database");
      const lbActive = hasLoadBalancer && hasPath(nodes, edges, "client", "loadBalancer");
      const cacheActive =
        hasCache &&
        hasPath(nodes, edges, "client", "cache") &&
        hasPath(nodes, edges, "cache", "database");
      const apiCapacity = apiCount * 4000;
      const routingCapacity = lbActive ? 20000 : 5000;
      const databaseCapacity = cacheActive ? 30000 : 2500;
      const throughput = connected
        ? Math.min(12000, apiCapacity, routingCapacity, databaseCapacity)
        : 0;
      const latency = connected ? 48 + (cacheActive ? 34 : 186) + (lbActive ? 9 : 0) : 999;
      const availability = connected
        ? Math.min(99.98, 97.8 + (lbActive && apiCount >= 2 ? 1.7 : 0) + (cacheActive ? 0.22 : 0))
        : 0;
      const cost = nodes.reduce((total, node) => total + COMPONENTS[node.type].cost, 0);
      const throughputPoints = Math.min(40, (throughput / 12000) * 40);
      const latencyPoints = latency <= 200 ? 25 : Math.max(0, 25 - (latency - 200) / 12);
      const availabilityPoints = Math.min(25, (availability / 99.9) * 25);
      const costPoints = cost <= 900 ? 10 : Math.max(0, 10 - (cost - 900) / 50);
      const score = Math.round(throughputPoints + latencyPoints + availabilityPoints + costPoints);

      let title = "Database đang là bottleneck";
      let detail = "Mỗi lượt đọc đều chạm Postgres. Thêm Redis Cache vào giữa API và Database.";
      let tone: SimulationResult["tone"] = "danger";

      if (!connected) {
        title = "Luồng request đang bị ngắt";
        detail = "Hãy nối Web Client tới API và tạo một đường đi hoàn chỉnh tới Database.";
      } else if (!cacheActive) {
        title = "Database đang là bottleneck";
        detail = "Postgres chỉ chịu được 2.500 req/s. Thêm Cache và nối nó trước Database.";
      } else if (!lbActive) {
        title = "Thiếu lớp phân phối tải";
        detail = "Cache đã giúp database, nhưng request vẫn dồn vào một đường. Hãy thêm Load Balancer.";
        tone = "warning";
      } else if (apiCount < 3) {
        title = "API Server đã chạm trần";
        detail = `Hiện có ${apiCount} API instance. Cần 3 instance để xử lý đủ 12.000 req/s.`;
        tone = "warning";
      } else if (throughput >= 12000 && latency <= 200) {
        title = "Kiến trúc vượt qua bài test";
        detail = "Traffic được phân phối tốt, lượt đọc đi qua cache và chi phí vẫn trong ngân sách.";
        tone = "success";
      }

      setResult({ throughput, latency, availability, cost, score, title, detail, tone });
      setRunning(false);
      setNotice("Mô phỏng hoàn tất. Xem phân tích ở bảng bên phải.");
    }, 1350);
  }

  function resetGame() {
    setNodes(INITIAL_NODES);
    setEdges(INITIAL_EDGES);
    setConnectFrom(null);
    setResult(null);
    setNotice("Đã đưa kiến trúc về trạng thái ban đầu.");
  }

  return (
    <main className="game-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark"><span /></div>
          <div><strong>ARCH.LAB</strong><small>SYSTEM DESIGN GAME</small></div>
        </div>
        <div className="level-title">
          <span>MISSION 01</span>
          <strong>Scale a URL Shortener</strong>
        </div>
        <div className="top-actions">
          <span className="prototype-badge">LIVE PROTOTYPE</span>
          <button className="icon-button" onClick={resetGame} aria-label="Đặt lại màn chơi">↻</button>
        </div>
      </header>

      <section className="mission-strip">
        <div className="mission-copy">
          <span className="eyebrow">YOUR OBJECTIVE</span>
          <p>Thiết kế hệ thống redirect chịu được traffic giờ cao điểm.</p>
        </div>
        <div className="target"><span>THROUGHPUT</span><strong>12K</strong><small>REQ/S</small></div>
        <div className="target"><span>LATENCY</span><strong>&lt;200</strong><small>MS P95</small></div>
        <div className="target"><span>UPTIME</span><strong>99.9</strong><small>%</small></div>
        <div className="target"><span>BUDGET</span><strong>$900</strong><small>/ MONTH</small></div>
      </section>

      <div className="game-grid">
        <aside className="component-panel">
          <div className="panel-heading">
            <span className="panel-index">01</span>
            <div><strong>COMPONENTS</strong><small>Kéo vào bản thiết kế</small></div>
          </div>
          <div className="component-list">
            {PALETTE.map((type) => {
              const component = COMPONENTS[type];
              return (
                <button
                  className="component-item"
                  draggable
                  key={type}
                  onDragStart={(event) => event.dataTransfer.setData("component", type)}
                  onClick={() => addComponent(type)}
                >
                  <span className="mini-cube" style={{ "--component-color": component.color } as CSSProperties}>
                    {component.short}
                  </span>
                  <span className="component-copy"><strong>{component.label}</strong><small>{component.description}</small></span>
                  <span className="add-mark">+</span>
                </button>
              );
            })}
          </div>
          <div className="tip-card">
            <span>PRO TIP</span>
            <p>Thêm nhiều API Server phía sau Load Balancer để tăng throughput.</p>
          </div>
        </aside>

        <section className="workspace-wrap">
          <div className="workspace-toolbar">
            <div className="status-dot" />
            <span>{notice}</span>
            <div className="toolbar-spacer" />
            <span className="zoom-label">100%</span>
          </div>
          <div className="canvas-scroll">
            <div
              className={`architecture-canvas ${running ? "is-running" : ""}`}
              ref={canvasRef}
              onDragOver={(event) => event.preventDefault()}
              onDrop={onDrop}
            >
              <div className="canvas-label"><span>LIVE WORKSPACE</span><small>Click component A → component B để nối</small></div>
              {renderedEdges.map((edge) => (
                <div
                  className="connection-line"
                  key={`${edge.from}-${edge.to}`}
                  style={{
                    left: edge.x1,
                    top: edge.y1,
                    width: edge.length,
                    transform: `rotate(${edge.angle}deg)`,
                    "--line-length": `${edge.length}px`,
                  } as CSSProperties}
                >
                  <span className="packet" />
                </div>
              ))}

              {nodes.map((node) => {
                const component = COMPONENTS[node.type];
                const selected = connectFrom === node.id;
                return (
                  <div
                    className={`system-node ${selected ? "is-selected" : ""}`}
                    key={node.id}
                    style={{ left: node.x, top: node.y, "--component-color": component.color } as CSSProperties}
                    onPointerDown={(event) => pointerDown(event, node)}
                    onPointerMove={pointerMove}
                    onPointerUp={(event) => pointerUp(event, node.id)}
                    role="button"
                    tabIndex={0}
                    aria-label={`${component.label}. Chọn để nối hoặc kéo để di chuyển.`}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") selectNode(node.id);
                    }}
                  >
                    <div className="node-top">
                      <span className="node-cube">{component.short}</span>
                      {node.type !== "client" && (
                        <button
                          className="remove-node"
                          aria-label={`Xóa ${component.label}`}
                          onPointerDown={(event) => event.stopPropagation()}
                          onClick={(event) => { event.stopPropagation(); removeNode(node.id); }}
                        >×</button>
                      )}
                    </div>
                    <strong>{component.label}</strong>
                    <small>{node.type === "api" ? "4K req/s" : `$${component.cost}/mo`}</small>
                    <i className="port port-in" />
                    <i className="port port-out" />
                  </div>
                );
              })}
            </div>
          </div>
          <div className="run-bar">
            <div className="run-copy"><span className={running ? "pulse" : ""} /> <p><strong>TRAFFIC GENERATOR</strong><small>12.000 requests / second</small></p></div>
            <button className="run-button" onClick={runSimulation} disabled={running}>
              {running ? <><span className="spinner" /> ĐANG MÔ PHỎNG</> : <>▶ CHẠY KIỂM TRA</>}
            </button>
          </div>
        </section>

        <aside className="analysis-panel">
          <div className="panel-heading">
            <span className="panel-index">02</span>
            <div><strong>ANALYSIS</strong><small>Kết quả mô phỏng</small></div>
          </div>

          <div className={`score-card ${result ? result.tone : "idle"}`}>
            <div className="score-ring" style={{ "--score": `${result?.score ?? 0}%` } as CSSProperties}>
              <div><strong>{result?.score ?? "—"}</strong><small>/100</small></div>
            </div>
            <div><span>DESIGN SCORE</span><strong>{result ? (result.score >= 80 ? "READY" : "NEEDS WORK") : "NOT TESTED"}</strong></div>
          </div>

          <div className="metrics">
            <Metric label="Throughput" value={result ? `${result.throughput.toLocaleString("vi-VN")}` : "—"} unit="req/s" target="12.000" good={Boolean(result && result.throughput >= 12000)} />
            <Metric label="Latency p95" value={result ? `${result.latency}` : "—"} unit="ms" target="< 200" good={Boolean(result && result.latency <= 200)} />
            <Metric label="Availability" value={result ? `${result.availability.toFixed(2)}` : "—"} unit="%" target="99.9" good={Boolean(result && result.availability >= 99.9)} />
            <Metric label="Monthly cost" value={result ? `$${result.cost}` : "—"} unit="" target="≤ $900" good={Boolean(result && result.cost <= 900)} />
          </div>

          <div className={`insight-card ${result?.tone ?? "idle"}`}>
            <span className="insight-icon">{result?.tone === "success" ? "✓" : result ? "!" : "?"}</span>
            <div>
              <strong>{result?.title ?? "Chưa có dữ liệu"}</strong>
              <p>{result?.detail ?? "Nhấn “Chạy kiểm tra” để engine phân tích kiến trúc của bạn."}</p>
            </div>
          </div>

          <div className="checklist">
            <span>LEVEL GOALS</span>
            <Goal done={hasLoadBalancer}>Thêm Load Balancer</Goal>
            <Goal done={apiCount >= 3}>Triển khai 3 API Server</Goal>
            <Goal done={hasCache}>Giảm tải bằng Redis Cache</Goal>
          </div>
        </aside>
      </div>
    </main>
  );
}

function Metric({ label, value, unit, target, good }: { label: string; value: string; unit: string; target: string; good: boolean }) {
  return (
    <div className="metric-row">
      <div><span>{label}</span><small>Target {target}</small></div>
      <strong className={good ? "metric-good" : ""}>{value}<small>{unit}</small></strong>
    </div>
  );
}

function Goal({ done, children }: { done: boolean; children: React.ReactNode }) {
  return <div className={done ? "goal done" : "goal"}><i>{done ? "✓" : ""}</i><p>{children}</p></div>;
}
