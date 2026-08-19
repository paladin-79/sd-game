"use client";

import {
  type CSSProperties,
  type DragEvent,
  type PointerEvent as ReactPointerEvent,
  useEffect,
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
  | "queue"
  | "websocket"
  | "pubsub"
  | "payment"
  | "idempotency"
  | "ledger"
  | "provider";

type GameNode = { id: string; type: ComponentType; x: number; y: number };
type Edge = { from: string; to: string };
type Incident = { id: string; label: string; description: string; icon: string };

type Mission = {
  id: "url" | "chat" | "payment";
  number: string;
  title: string;
  shortTitle: string;
  category: string;
  difficulty: string;
  story: string;
  objective: string;
  accent: string;
  target: { throughput: number; throughputDisplay: string; unit: string; latency: number; reliability: number; reliabilityLabel: string; budget: number };
  palette: ComponentType[];
  initialNodes: GameNode[];
  initialEdges: Edge[];
  events: Incident[];
  hints: string[];
};

type SimulationResult = {
  throughput: number;
  latency: number;
  reliability: number;
  cost: number;
  score: number;
  title: string;
  detail: string;
  tone: "danger" | "warning" | "success";
  incident: Incident;
};

type Progress = { bestScores: Record<string, number>; completed: string[]; xp: number };

const COMPONENTS: Record<ComponentType, { label: string; short: string; description: string; cost: number; color: string }> = {
  client: { label: "User Client", short: "APP", description: "Điểm bắt đầu request", cost: 0, color: "#a8ff60" },
  loadBalancer: { label: "Load Balancer", short: "LB", description: "Phân phối traffic", cost: 35, color: "#63e6ff" },
  api: { label: "Application Server", short: "API", description: "Xử lý business logic", cost: 120, color: "#a58cff" },
  cache: { label: "Redis Cache", short: "RDS", description: "Đọc dữ liệu tốc độ cao", cost: 55, color: "#ff9f5b" },
  database: { label: "Data Store", short: "DB", description: "Lưu dữ liệu bền vững", cost: 260, color: "#62d6a8" },
  queue: { label: "Message Queue", short: "MQ", description: "Buffer và retry event", cost: 75, color: "#ffd35c" },
  websocket: { label: "WebSocket Gateway", short: "WS", description: "Kết nối realtime", cost: 165, color: "#45d6ff" },
  pubsub: { label: "Pub/Sub Broker", short: "PUB", description: "Fan-out tin nhắn", cost: 210, color: "#ff79c6" },
  payment: { label: "Payment Service", short: "PAY", description: "Điều phối giao dịch", cost: 260, color: "#b18cff" },
  idempotency: { label: "Idempotency Store", short: "KEY", description: "Chặn giao dịch trùng", cost: 95, color: "#ff9f5b" },
  ledger: { label: "Ledger Database", short: "LED", description: "Sổ cái bất biến", cost: 480, color: "#62d6a8" },
  provider: { label: "Payment Provider", short: "PSP", description: "Cổng thanh toán ngoài", cost: 320, color: "#ff6b61" },
};

const MISSIONS: Mission[] = [
  {
    id: "url",
    number: "01",
    title: "Scale a URL Shortener",
    shortTitle: "URL Shortener",
    category: "WEB SCALE",
    difficulty: "FOUNDATION",
    story: "Một chiến dịch vừa viral. Hệ thống redirect đang nhận lượng truy cập gấp 10 lần bình thường.",
    objective: "Thiết kế luồng redirect chịu được traffic giờ cao điểm mà vẫn trong ngân sách.",
    accent: "#a8ff60",
    target: { throughput: 12000, throughputDisplay: "12K", unit: "REQ/S", latency: 200, reliability: 99.9, reliabilityLabel: "UPTIME", budget: 900 },
    palette: ["loadBalancer", "api", "cache", "database", "queue"],
    initialNodes: [
      { id: "client-1", type: "client", x: 55, y: 218 },
      { id: "api-1", type: "api", x: 355, y: 218 },
      { id: "database-1", type: "database", x: 665, y: 218 },
    ],
    initialEdges: [{ from: "client-1", to: "api-1" }, { from: "api-1", to: "database-1" }],
    events: [
      { id: "traffic_spike", label: "TRAFFIC SPIKE ×10", description: "Một link nổi tiếng vừa lên trang chủ. Traffic tăng đột ngột.", icon: "↑" },
      { id: "instance_down", label: "API INSTANCE DOWN", description: "Một API instance ngừng phản hồi trong lúc peak traffic.", icon: "×" },
      { id: "cache_flush", label: "CACHE FLUSH", description: "Cache bị làm trống và database nhận một làn sóng cache miss.", icon: "↻" },
    ],
    hints: ["Đặt Load Balancer ngay sau Client.", "Dùng ít nhất 3 API Server và nối chúng từ Load Balancer.", "Đặt Redis Cache trên đường đi từ API tới Database."],
  },
  {
    id: "chat",
    number: "02",
    title: "Build Realtime Chat",
    shortTitle: "Realtime Chat",
    category: "MOBILE / REALTIME",
    difficulty: "INTERMEDIATE",
    story: "Một trận chung kết đang diễn ra. Hàng trăm nghìn người dùng gửi tin nhắn cùng lúc.",
    objective: "Giữ kết nối realtime, fan-out tin nhắn và không làm mất dữ liệu khi một gateway gặp lỗi.",
    accent: "#63e6ff",
    target: { throughput: 50000, throughputDisplay: "50K", unit: "MSG/S", latency: 120, reliability: 99.99, reliabilityLabel: "DELIVERY", budget: 1600 },
    palette: ["loadBalancer", "websocket", "pubsub", "api", "queue", "database"],
    initialNodes: [
      { id: "client-1", type: "client", x: 55, y: 218 },
      { id: "websocket-1", type: "websocket", x: 355, y: 218 },
      { id: "database-1", type: "database", x: 665, y: 218 },
    ],
    initialEdges: [{ from: "client-1", to: "websocket-1" }, { from: "websocket-1", to: "database-1" }],
    events: [
      { id: "gateway_down", label: "GATEWAY DISCONNECTED", description: "Một WebSocket Gateway mất kết nối giữa lúc đang fan-out.", icon: "⌁" },
      { id: "message_burst", label: "MESSAGE BURST ×6", description: "Một khoảnh khắc quan trọng tạo ra làn sóng tin nhắn đồng thời.", icon: "↑" },
      { id: "slow_consumer", label: "SLOW CONSUMER", description: "Message Store ghi chậm và hàng đợi bắt đầu tích tụ.", icon: "…" },
    ],
    hints: ["Đặt Load Balancer trước cụm WebSocket Gateway.", "Dùng Pub/Sub để fan-out và ít nhất 2 Application Server.", "Message Queue phải nằm trước Data Store để hấp thụ burst."],
  },
  {
    id: "payment",
    number: "03",
    title: "Protect a Payment Flow",
    shortTitle: "Payment Flow",
    category: "FINTECH / CONSISTENCY",
    difficulty: "ADVANCED",
    story: "Payment Provider đang chập chờn. Client tự động retry và có nguy cơ trừ tiền khách hàng hai lần.",
    objective: "Xử lý payment an toàn khi timeout, retry và worker crash; mọi giao dịch phải truy vết được.",
    accent: "#ff9f5b",
    target: { throughput: 2000, throughputDisplay: "2K", unit: "TX/S", latency: 350, reliability: 100, reliabilityLabel: "CORRECTNESS", budget: 2200 },
    palette: ["loadBalancer", "payment", "idempotency", "queue", "ledger", "provider"],
    initialNodes: [
      { id: "client-1", type: "client", x: 55, y: 218 },
      { id: "payment-1", type: "payment", x: 355, y: 218 },
      { id: "provider-1", type: "provider", x: 665, y: 218 },
    ],
    initialEdges: [{ from: "client-1", to: "payment-1" }, { from: "payment-1", to: "provider-1" }],
    events: [
      { id: "duplicate", label: "DUPLICATE REQUEST", description: "Client retry cùng một payment sau khi không nhận được response.", icon: "×2" },
      { id: "provider_timeout", label: "PROVIDER TIMEOUT", description: "PSP xử lý thành công nhưng response bị timeout trên đường về.", icon: "◷" },
      { id: "worker_crash", label: "WORKER CRASH", description: "Worker chết ngay sau khi PSP xác nhận giao dịch.", icon: "!" },
    ],
    hints: ["Idempotency Store phải xuất hiện trước bước xử lý payment.", "Queue giúp retry Payment Provider mà không mất yêu cầu.", "Ghi mọi thay đổi vào Ledger Database để đạt 100% correctness."],
  },
];

const EMPTY_PROGRESS: Progress = { bestScores: {}, completed: [], xp: 0 };

function hasNodePath(edges: Edge[], starts: string[], target: string) {
  const queue = [...starts];
  const visited = new Set<string>();
  while (queue.length) {
    const current = queue.shift()!;
    if (current === target) return true;
    if (visited.has(current)) continue;
    visited.add(current);
    edges.filter((edge) => edge.from === current).forEach((edge) => queue.push(edge.to));
  }
  return false;
}

function hasPath(nodes: GameNode[], edges: Edge[], fromType: ComponentType, toType: ComponentType) {
  const starts = nodes.filter((node) => node.type === fromType).map((node) => node.id);
  return nodes.some((node) => node.type === toType && hasNodePath(edges, starts, node.id));
}

function activeCount(nodes: GameNode[], edges: Edge[], type: ComponentType, sourceType: ComponentType) {
  const starts = nodes.filter((node) => node.type === sourceType).map((node) => node.id);
  return nodes.filter((node) => node.type === type && hasNodePath(edges, starts, node.id)).length;
}

function count(nodes: GameNode[], type: ComponentType) {
  return nodes.filter((node) => node.type === type).length;
}

function getGoals(mission: Mission, nodes: GameNode[], edges: Edge[]) {
  if (mission.id === "url") {
    const lb = hasPath(nodes, edges, "client", "loadBalancer");
    return [
      { label: "Traffic đi qua Load Balancer", done: lb },
      { label: "3 API Server hoạt động", done: activeCount(nodes, edges, "api", lb ? "loadBalancer" : "client") >= 3 },
      { label: "Redis bảo vệ Database", done: hasPath(nodes, edges, "client", "cache") && hasPath(nodes, edges, "cache", "database") },
    ];
  }
  if (mission.id === "chat") {
    const lb = hasPath(nodes, edges, "client", "loadBalancer");
    return [
      { label: "2 WebSocket Gateway hoạt động", done: activeCount(nodes, edges, "websocket", lb ? "loadBalancer" : "client") >= 2 },
      { label: "Pub/Sub fan-out tới 2 App Server", done: hasPath(nodes, edges, "websocket", "pubsub") && activeCount(nodes, edges, "api", "pubsub") >= 2 },
      { label: "Queue bảo vệ Message Store", done: hasPath(nodes, edges, "pubsub", "queue") && hasPath(nodes, edges, "queue", "database") },
    ];
  }
  const lb = hasPath(nodes, edges, "client", "loadBalancer");
  return [
    { label: "3 Payment Service hoạt động", done: activeCount(nodes, edges, "payment", lb ? "loadBalancer" : "client") >= 3 },
    { label: "Idempotency chặn request trùng", done: hasPath(nodes, edges, "client", "idempotency") },
    { label: "Queue → Ledger → Provider hoàn chỉnh", done: hasPath(nodes, edges, "idempotency", "queue") && hasPath(nodes, edges, "queue", "ledger") && hasPath(nodes, edges, "ledger", "provider") },
  ];
}

function evaluate(mission: Mission, nodes: GameNode[], edges: Edge[], incident: Incident): SimulationResult {
  const cost = nodes.reduce((sum, node) => sum + COMPONENTS[node.type].cost, 0);
  let throughput = 0;
  let latency = 999;
  let reliability = 0;
  let title = "Luồng dữ liệu đang bị ngắt";
  let detail = "Tạo một đường đi hoàn chỉnh từ Client tới nơi lưu trữ cuối cùng.";

  if (mission.id === "url") {
    const connected = hasPath(nodes, edges, "client", "database");
    const lb = hasPath(nodes, edges, "client", "loadBalancer");
    const apis = activeCount(nodes, edges, "api", lb ? "loadBalancer" : "client");
    const cache = hasPath(nodes, edges, "client", "cache") && hasPath(nodes, edges, "cache", "database");
    const cacheCopies = count(nodes, "cache");
    if (connected) {
      const apiCapacity = Math.max(1, apis - (incident.id === "instance_down" ? 1 : 0)) * 4000;
      throughput = Math.min(12000, lb ? 20000 : 5000, apiCapacity, cache ? 30000 : 2500);
      latency = 48 + (cache ? 34 : 186) + (lb ? 9 : 0) + (incident.id === "cache_flush" && cacheCopies < 2 ? 72 : 0);
      reliability = Math.min(99.95, 97.8 + (lb && apis >= 2 ? 1.65 : 0) + (cache ? 0.35 : 0));
      if (!cache) { title = "Database đang là bottleneck"; detail = "Mọi lượt đọc đều chạm Data Store. Đặt Redis trên đường đi tới database."; }
      else if (!lb) { title = "Thiếu lớp phân phối tải"; detail = "Cache đã hoạt động, nhưng request vẫn dồn vào một đường duy nhất."; }
      else if (apis < 3) { title = "Application Server đã chạm trần"; detail = `Chỉ có ${apis} server đang được nối từ Load Balancer; cần ít nhất 3.`; }
      else { title = "Kiến trúc chịu được traffic spike"; detail = "Load được phân phối, read path đi qua cache và chi phí vẫn trong ngân sách."; }
    }
  }

  if (mission.id === "chat") {
    const connected = hasPath(nodes, edges, "client", "database");
    const lb = hasPath(nodes, edges, "client", "loadBalancer");
    const gateways = activeCount(nodes, edges, "websocket", lb ? "loadBalancer" : "client");
    const pubsub = hasPath(nodes, edges, "websocket", "pubsub");
    const apps = activeCount(nodes, edges, "api", "pubsub");
    const queue = hasPath(nodes, edges, "pubsub", "queue") && hasPath(nodes, edges, "queue", "database");
    if (connected) {
      const liveGateways = Math.max(1, gateways - (incident.id === "gateway_down" ? 1 : 0));
      throughput = Math.min(50000, liveGateways * 25000, Math.max(1, apps) * 20000, pubsub ? 70000 : 12000, queue ? 60000 : 15000);
      latency = (gateways ? 56 : 240) + (pubsub ? 18 : 80) + (queue ? 24 : 65) + (incident.id === "slow_consumer" && !queue ? 120 : 0);
      reliability = Math.min(99.99, 98.1 + (queue ? 1.15 : 0) + (pubsub ? 0.42 : 0) + (gateways >= 2 ? 0.32 : 0));
      if (gateways < 2) { title = "Gateway là single point of failure"; detail = "Thêm và nối ít nhất 2 WebSocket Gateway sau Load Balancer."; }
      else if (!pubsub || apps < 2) { title = "Fan-out không theo kịp"; detail = "Nối WebSocket qua Pub/Sub tới ít nhất 2 Application Server."; }
      else if (!queue) { title = "Message Store không chịu được burst"; detail = "Đặt Message Queue trước Data Store để buffer và retry."; }
      else { title = "Tin nhắn vẫn được giao khi có sự cố"; detail = "Gateway dự phòng, Pub/Sub và Queue phối hợp để hấp thụ message burst."; }
    }
  }

  if (mission.id === "payment") {
    const provider = hasPath(nodes, edges, "client", "provider");
    const ledger = hasPath(nodes, edges, "client", "ledger");
    const lb = hasPath(nodes, edges, "client", "loadBalancer");
    const payments = activeCount(nodes, edges, "payment", lb ? "loadBalancer" : "client");
    const idem = hasPath(nodes, edges, "client", "idempotency") && hasPath(nodes, edges, "idempotency", "payment");
    const queue = hasPath(nodes, edges, "idempotency", "queue") && hasPath(nodes, edges, "queue", "ledger") && hasPath(nodes, edges, "ledger", "provider");
    if (provider && ledger) {
      throughput = Math.min(2000, Math.max(1, payments) * 800, lb ? 4000 : 900, queue ? 5000 : 1000);
      latency = 165 + (queue ? 54 : 120) + (incident.id === "provider_timeout" ? (queue ? 65 : 220) : 0);
      reliability = idem && queue ? 100 : idem || queue ? 99.4 : incident.id === "duplicate" ? 96.8 : 98.2;
      if (!idem) { title = "Có nguy cơ charge hai lần"; detail = "Request retry chưa được bảo vệ. Đặt Idempotency Store trước Payment Service."; }
      else if (!queue) { title = "Timeout có thể làm mất trạng thái"; detail = "Nối Idempotency Store qua Queue, Ledger rồi mới tới Payment Provider."; }
      else if (payments < 3 || !lb) { title = "Payment Service chưa đủ capacity"; detail = "Dùng Load Balancer và nối ít nhất 3 Payment Service đang hoạt động."; }
      else { title = "Payment flow an toàn trước retry"; detail = "Idempotency, durable queue và ledger giữ correctness ngay cả khi PSP timeout."; }
    }
  }

  const t = mission.target;
  const throughputPoints = Math.min(35, (throughput / t.throughput) * 35);
  const latencyPoints = latency <= t.latency ? 20 : Math.max(0, 20 - (latency - t.latency) / 12);
  const reliabilityPoints = Math.min(30, (reliability / t.reliability) * 30);
  const costPoints = cost <= t.budget ? 15 : Math.max(0, 15 - (cost - t.budget) / 45);
  const score = Math.max(0, Math.round(throughputPoints + latencyPoints + reliabilityPoints + costPoints));
  const goals = getGoals(mission, nodes, edges);
  const passed = score >= 80 && goals.every((goal) => goal.done);
  const tone: SimulationResult["tone"] = passed ? "success" : score >= 58 ? "warning" : "danger";
  if (passed && !title.includes("an toàn") && !title.includes("chịu được") && !title.includes("vẫn được")) {
    title = "Mission hoàn thành";
    detail = "Kiến trúc đạt mọi SLO và vượt qua chaos test.";
  }
  return { throughput, latency, reliability, cost, score: passed ? Math.max(score, 80) : score, title, detail, tone, incident };
}

export default function Home() {
  const [missionIndex, setMissionIndex] = useState(0);
  const mission = MISSIONS[missionIndex];
  const [nodes, setNodes] = useState<GameNode[]>(mission.initialNodes);
  const [edges, setEdges] = useState<Edge[]>(mission.initialEdges);
  const [connectFrom, setConnectFrom] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [notice, setNotice] = useState("Kiến trúc starter đã sẵn sàng. Chạy chaos test để bắt đầu.");
  const [logs, setLogs] = useState<string[]>([]);
  const [hintIndex, setHintIndex] = useState(-1);
  const [briefingOpen, setBriefingOpen] = useState(true);
  const [victoryOpen, setVictoryOpen] = useState(false);
  const [lastReward, setLastReward] = useState(0);
  const [progress, setProgress] = useState<Progress>(EMPTY_PROGRESS);
  const canvasRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef({ id: "", offsetX: 0, offsetY: 0, moved: false });
  const runIdRef = useRef(0);

  useEffect(() => {
    const stored = window.localStorage.getItem("archlab-progress-v2");
    if (stored) {
      try { setProgress(JSON.parse(stored) as Progress); } catch { /* use clean progress */ }
    }
  }, []);

  const goals = useMemo(() => getGoals(mission, nodes, edges), [mission, nodes, edges]);

  const renderedEdges = useMemo(() => edges.flatMap((edge) => {
    const from = nodes.find((node) => node.id === edge.from);
    const to = nodes.find((node) => node.id === edge.to);
    if (!from || !to) return [];
    const x1 = from.x + 72; const y1 = from.y + 46; const x2 = to.x + 72; const y2 = to.y + 46;
    return [{ ...edge, x1, y1, length: Math.hypot(x2 - x1, y2 - y1), angle: Math.atan2(y2 - y1, x2 - x1) * (180 / Math.PI) }];
  }), [edges, nodes]);

  function loadMission(index: number) {
    runIdRef.current += 1;
    const next = MISSIONS[index];
    setMissionIndex(index); setNodes(next.initialNodes); setEdges(next.initialEdges);
    setResult(null); setLogs([]); setConnectFrom(null); setRunning(false); setHintIndex(-1);
    setNotice("Mission mới đã tải. Xem briefing trước khi bắt đầu.");
    setBriefingOpen(true); setVictoryOpen(false);
  }

  function addComponent(type: ComponentType, x?: number, y?: number) {
    const same = nodes.filter((node) => node.type === type).length;
    const node: GameNode = {
      id: `${type}-${Date.now()}-${same}`,
      type,
      x: Math.max(12, Math.min(745, x ?? 220 + ((nodes.length * 77) % 480))),
      y: Math.max(64, Math.min(400, y ?? 80 + ((nodes.length * 63) % 285))),
    };
    setNodes((current) => [...current, node]); setResult(null);
    setNotice(`Đã triển khai ${COMPONENTS[type].label}. Chọn node nguồn rồi node đích để nối.`);
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    const type = event.dataTransfer.getData("component") as ComponentType;
    if (!COMPONENTS[type] || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    addComponent(type, event.clientX - rect.left - 72, event.clientY - rect.top - 46);
  }

  function selectNode(id: string) {
    if (!connectFrom) { setConnectFrom(id); setNotice("Đã chọn node nguồn. Chọn node đích để tạo data flow."); return; }
    if (connectFrom === id) { setConnectFrom(null); setNotice("Đã hủy chọn."); return; }
    const exists = edges.some((edge) => edge.from === connectFrom && edge.to === id);
    if (!exists) setEdges((current) => [...current, { from: connectFrom, to: id }]);
    setConnectFrom(null); setResult(null); setNotice(exists ? "Kết nối này đã tồn tại." : "Data flow mới đã được tạo.");
  }

  function removeNode(id: string) {
    if (nodes.find((node) => node.id === id)?.type === "client") return;
    setNodes((current) => current.filter((node) => node.id !== id));
    setEdges((current) => current.filter((edge) => edge.from !== id && edge.to !== id));
    setConnectFrom(null); setResult(null); setNotice("Đã gỡ component khỏi kiến trúc.");
  }

  function pointerDown(event: ReactPointerEvent<HTMLDivElement>, node: GameNode) {
    const rect = event.currentTarget.getBoundingClientRect();
    dragRef.current = { id: node.id, offsetX: event.clientX - rect.left, offsetY: event.clientY - rect.top, moved: false };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function pointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!dragRef.current.id || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = Math.max(8, Math.min(764, event.clientX - rect.left - dragRef.current.offsetX));
    const y = Math.max(58, Math.min(408, event.clientY - rect.top - dragRef.current.offsetY));
    dragRef.current.moved = true;
    setNodes((current) => current.map((node) => node.id === dragRef.current.id ? { ...node, x, y } : node));
  }

  function pointerUp(event: ReactPointerEvent<HTMLDivElement>, id: string) {
    event.currentTarget.releasePointerCapture(event.pointerId);
    const moved = dragRef.current.moved; dragRef.current.id = "";
    if (!moved) selectNode(id);
  }

  function saveWin(score: number) {
    const firstClear = !progress.completed.includes(mission.id);
    setLastReward(firstClear ? 500 : 50);
    setProgress((current) => {
      const next = {
        bestScores: { ...current.bestScores, [mission.id]: Math.max(current.bestScores[mission.id] ?? 0, score) },
        completed: firstClear ? [...current.completed, mission.id] : current.completed,
        xp: current.xp + (firstClear ? 500 : 50),
      };
      window.localStorage.setItem("archlab-progress-v2", JSON.stringify(next));
      return next;
    });
  }

  function runSimulation() {
    const runId = ++runIdRef.current;
    const incident = mission.events[Math.floor(Math.random() * mission.events.length)];
    setRunning(true); setResult(null); setLogs(["Traffic generators online"]); setNotice("Đang tăng tải và inject sự cố vào hệ thống…");
    window.setTimeout(() => { if (runId === runIdRef.current) setLogs((items) => [...items, `Đạt ${mission.target.throughputDisplay} ${mission.target.unit}`]); }, 420);
    window.setTimeout(() => { if (runId === runIdRef.current) setLogs((items) => [...items, `Sự cố: ${incident.label}`]); }, 850);
    window.setTimeout(() => { if (runId === runIdRef.current) setLogs((items) => [...items, "Đo latency và data safety"]); }, 1250);
    window.setTimeout(() => {
      if (runId !== runIdRef.current) return;
      const next = evaluate(mission, nodes, edges, incident);
      setResult(next); setRunning(false); setLogs((items) => [...items, `Chaos test hoàn tất — ${next.score}/100`]);
      setNotice("Mô phỏng hoàn tất. Analysis đã xác định điểm yếu quan trọng nhất.");
      if (next.tone === "success") { saveWin(next.score); setVictoryOpen(true); }
    }, 1750);
  }

  function resetMission() {
    runIdRef.current += 1; setNodes(mission.initialNodes); setEdges(mission.initialEdges);
    setResult(null); setLogs([]); setConnectFrom(null); setRunning(false); setHintIndex(-1); setVictoryOpen(false);
    setNotice("Đã khôi phục starter architecture.");
  }

  return (
    <main className="game-shell" style={{ "--mission-accent": mission.accent } as CSSProperties}>
      <header className="topbar">
        <div className="brand"><div className="brand-mark"><span /></div><div><strong>ARCH.LAB</strong><small>SYSTEM DESIGN GAME</small></div></div>
        <nav className="campaign-tabs" aria-label="Danh sách mission">
          {MISSIONS.map((item, index) => (
            <button key={item.id} className={`${index === missionIndex ? "active" : ""} ${progress.completed.includes(item.id) ? "cleared" : ""}`} onClick={() => loadMission(index)}>
              <i>{progress.completed.includes(item.id) ? "✓" : item.number}</i><span>{item.shortTitle}<small>{item.category}</small></span>
            </button>
          ))}
        </nav>
        <div className="player-stats"><span>CAREER XP</span><strong>{progress.xp.toLocaleString("vi-VN")}</strong><i>LV {1 + Math.floor(progress.xp / 1000)}</i></div>
      </header>

      <section className="mission-strip">
        <div className="mission-copy"><span className="eyebrow">MISSION {mission.number} · {mission.difficulty}</span><p>{mission.objective}</p></div>
        <Target label="THROUGHPUT" value={mission.target.throughputDisplay} unit={mission.target.unit} />
        <Target label="LATENCY" value={`<${mission.target.latency}`} unit="MS P95" />
        <Target label={mission.target.reliabilityLabel} value={`${mission.target.reliability}`} unit="%" />
        <Target label="BUDGET" value={`$${mission.target.budget}`} unit="/ MONTH" />
      </section>

      <div className="game-grid">
        <aside className="component-panel">
          <div className="panel-heading"><span className="panel-index">01</span><div><strong>COMPONENTS</strong><small>Kéo hoặc click để deploy</small></div></div>
          <div className="component-list">
            {mission.palette.map((type) => {
              const component = COMPONENTS[type];
              return <button className="component-item" draggable key={type} onDragStart={(event) => event.dataTransfer.setData("component", type)} onClick={() => addComponent(type)}>
                <span className="mini-cube" style={{ "--component-color": component.color } as CSSProperties}>{component.short}</span>
                <span className="component-copy"><strong>{component.label}</strong><small>{component.description}</small><em>${component.cost}/mo</em></span><span className="add-mark">+</span>
              </button>;
            })}
          </div>
          <div className="hint-card"><span>ARCHITECT HINT {Math.max(1, hintIndex + 1)}/3</span><p>{hintIndex >= 0 ? mission.hints[hintIndex] : "Bị kẹt? Mở gợi ý từng bước mà không tự động sửa bài."}</p><button onClick={() => setHintIndex((value) => Math.min(2, value + 1))}>{hintIndex < 0 ? "MỞ GỢI Ý" : hintIndex < 2 ? "GỢI Ý TIẾP" : "ĐÃ XEM HẾT"}</button></div>
          <div className="local-save"><i>●</i><span>Tự lưu tiến độ trên thiết bị</span></div>
        </aside>

        <section className="workspace-wrap">
          <div className="workspace-toolbar"><div className="status-dot" /><span>{notice}</span><div className="toolbar-spacer" /><button onClick={() => setBriefingOpen(true)}>BRIEFING</button><button onClick={resetMission}>RESET</button></div>
          <div className="canvas-scroll">
            <div className={`architecture-canvas ${running ? "is-running" : ""}`} ref={canvasRef} onDragOver={(event) => event.preventDefault()} onDrop={onDrop}>
              <div className="canvas-label"><span>LIVE WORKSPACE · {mission.category}</span><small>Node nguồn → node đích · Click đường nối để xóa</small></div>
              {renderedEdges.map((edge) => <button className="connection-line" aria-label="Xóa kết nối" title="Click để xóa kết nối" key={`${edge.from}-${edge.to}`} onClick={() => { setEdges((current) => current.filter((item) => item.from !== edge.from || item.to !== edge.to)); setResult(null); }} style={{ left: edge.x1, top: edge.y1, width: edge.length, transform: `rotate(${edge.angle}deg)`, "--line-length": `${edge.length}px` } as CSSProperties}><span className="wire" /><span className="packet" /></button>)}
              {nodes.map((node) => {
                const component = COMPONENTS[node.type];
                return <div className={`system-node ${connectFrom === node.id ? "is-selected" : ""}`} key={node.id} style={{ left: node.x, top: node.y, "--component-color": component.color } as CSSProperties} onPointerDown={(event) => pointerDown(event, node)} onPointerMove={pointerMove} onPointerUp={(event) => pointerUp(event, node.id)} role="button" tabIndex={0} aria-label={`${component.label}. Chọn để nối hoặc kéo để di chuyển.`} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") selectNode(node.id); }}>
                  <div className="node-top"><span className="node-cube">{component.short}</span>{node.type !== "client" && <button className="remove-node" aria-label={`Xóa ${component.label}`} onPointerDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); removeNode(node.id); }}>×</button>}</div>
                  <strong>{component.label}</strong><small>{node.type === "api" ? "20K ops/s" : `$${component.cost}/mo`}</small><i className="port port-in" /><i className="port port-out" />
                </div>;
              })}
              {(running || logs.length > 0) && <div className="simulation-feed"><span className="feed-title">CHAOS CONSOLE</span>{logs.slice(-4).map((log, index) => <p key={`${log}-${index}`} className={index === logs.length - 1 ? "latest" : ""}><i>{index === logs.length - 1 && running ? "›" : "✓"}</i>{log}</p>)}</div>}
            </div>
          </div>
          <div className="run-bar"><div className="run-copy"><span className={running ? "pulse" : ""} /><p><strong>CHAOS TESTER</strong><small>Traffic + 1 failure scenario ngẫu nhiên</small></p></div><button className="run-button" onClick={runSimulation} disabled={running}>{running ? <><span className="spinner" /> ĐANG INJECT SỰ CỐ</> : <>▶ CHẠY CHAOS TEST</>}</button></div>
        </section>

        <aside className="analysis-panel">
          <div className="panel-heading"><span className="panel-index">02</span><div><strong>ANALYSIS</strong><small>Runbook & scoring</small></div></div>
          <div className={`score-card ${result?.tone ?? "idle"}`}><div className="score-ring" style={{ "--score": `${result?.score ?? progress.bestScores[mission.id] ?? 0}%` } as CSSProperties}><div><strong>{result?.score ?? progress.bestScores[mission.id] ?? "—"}</strong><small>/100</small></div></div><div><span>DESIGN SCORE</span><strong>{result ? result.tone === "success" ? "MISSION CLEAR" : "ITERATE" : progress.bestScores[mission.id] ? "PERSONAL BEST" : "NOT TESTED"}</strong><small>Best: {progress.bestScores[mission.id] ?? 0}</small></div></div>
          <div className="metrics">
            <Metric label="Throughput" value={result ? result.throughput.toLocaleString("vi-VN") : "—"} unit={mission.target.unit.toLowerCase()} target={mission.target.throughputDisplay} good={Boolean(result && result.throughput >= mission.target.throughput)} />
            <Metric label="Latency p95" value={result ? `${result.latency}` : "—"} unit="ms" target={`< ${mission.target.latency}`} good={Boolean(result && result.latency <= mission.target.latency)} />
            <Metric label={mission.target.reliabilityLabel} value={result ? result.reliability.toFixed(mission.target.reliability === 100 ? 1 : 2) : "—"} unit="%" target={`${mission.target.reliability}`} good={Boolean(result && result.reliability >= mission.target.reliability)} />
            <Metric label="Monthly cost" value={result ? `$${result.cost}` : "—"} unit="" target={`≤ $${mission.target.budget}`} good={Boolean(result && result.cost <= mission.target.budget)} />
          </div>
          {result && <div className={`incident-card ${result.tone}`}><span>{result.incident.icon}</span><div><small>INJECTED INCIDENT</small><strong>{result.incident.label}</strong><p>{result.incident.description}</p></div></div>}
          <div className={`insight-card ${result?.tone ?? "idle"}`}><span className="insight-icon">{result?.tone === "success" ? "✓" : result ? "!" : "?"}</span><div><strong>{result?.title ?? "Chưa có dữ liệu"}</strong><p>{result?.detail ?? "Chạy chaos test để engine đo capacity, latency và độ an toàn."}</p></div></div>
          <div className="checklist"><span>MISSION GOALS</span>{goals.map((goal) => <Goal key={goal.label} done={goal.done}>{goal.label}</Goal>)}</div>
        </aside>
      </div>

      {briefingOpen && <div className="modal-backdrop"><section className="briefing-modal" role="dialog" aria-modal="true"><button className="modal-close" onClick={() => setBriefingOpen(false)}>×</button><span className="modal-kicker">MISSION {mission.number} · {mission.category}</span><h1>{mission.title}</h1><p className="story">{mission.story}</p><div className="brief-grid"><div><span>SCENARIO</span><strong>{mission.events.length} chaos events</strong><small>Mỗi lần chạy sẽ inject một sự cố khác nhau.</small></div><div><span>WIN CONDITION</span><strong>Score ≥ 80</strong><small>Đồng thời hoàn thành cả 3 mission goals.</small></div><div><span>REWARD</span><strong>+500 XP</strong><small>Tiến độ được lưu ngay trên thiết bị này.</small></div></div><div className="brief-objective"><span>YOUR OBJECTIVE</span><p>{mission.objective}</p></div><button className="primary-modal-button" onClick={() => setBriefingOpen(false)}>BẮT ĐẦU MISSION →</button></section></div>}

      {victoryOpen && result && <div className="modal-backdrop"><section className="victory-modal" role="dialog" aria-modal="true"><div className="victory-mark">✓</div><span>MISSION {mission.number} COMPLETE</span><h2>{result.score}/100</h2><p>{result.title}. Personal best của bạn đã được lưu.</p><div className="reward-row"><strong>+{lastReward} XP</strong><small>{missionIndex < MISSIONS.length - 1 ? `Mission tiếp theo: ${MISSIONS[missionIndex + 1].title}` : "Campaign 01 hoàn tất"}</small></div><div className="victory-actions"><button onClick={() => setVictoryOpen(false)}>XEM KIẾN TRÚC</button>{missionIndex < MISSIONS.length - 1 && <button className="next-mission" onClick={() => loadMission(missionIndex + 1)}>MISSION TIẾP THEO →</button>}</div></section></div>}
    </main>
  );
}

function Target({ label, value, unit }: { label: string; value: string; unit: string }) {
  return <div className="target"><span>{label}</span><strong>{value}</strong><small>{unit}</small></div>;
}

function Metric({ label, value, unit, target, good }: { label: string; value: string; unit: string; target: string; good: boolean }) {
  return <div className="metric-row"><div><span>{label}</span><small>Target {target}</small></div><strong className={good ? "metric-good" : ""}>{value}<small>{unit}</small></strong></div>;
}

function Goal({ done, children }: { done: boolean; children: React.ReactNode }) {
  return <div className={done ? "goal done" : "goal"}><i>{done ? "✓" : ""}</i><p>{children}</p></div>;
}
