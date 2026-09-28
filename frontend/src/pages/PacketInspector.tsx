import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { FileSearch, RefreshCw, ChevronRight, Search, ChevronLeft, Inbox, CornerDownLeft } from "lucide-react";
import { PageHeader } from "../components/layout/PageHeader";
import { Card } from "../components/ui/Card";
import { EmptyState } from "../components/alerts/EmptyState";
import { cn } from "../lib/cn";
import {
  api,
  type ActiveCapture,
  type CaptureFile,
  type CapturePacket,
  type CapturePacketsResponse,
} from "../lib/api";

type View = "active" | "incidents";
type ProtoFilter = "all" | "tcp" | "udp" | "icmp";

const ACTIVE_FILE = "active/current.pcap";
const PAGE_SIZES = [100, 200, 500, 1000];

interface DeepLink {
  src?: string;
  dst?: string;
  proto?: string;
  sport?: number;
  dport?: number;
}

function intOrUndef(v: string | null): number | undefined {
  const n = Number(v);
  return v && Number.isFinite(n) ? n : undefined;
}

export default function PacketInspector() {
  const [searchParams] = useSearchParams();
  const initialFile = searchParams.get("file");
  const initialPacket = intOrUndef(searchParams.get("packet"));
  const initialView: View = searchParams.get("view") === "incidents" ? "incidents" : "active";
  const [view, setView] = useState<View>(initialView);
  const [active, setActive] = useState<ActiveCapture | null>(null);
  const [incidents, setIncidents] = useState<CaptureFile[]>([]);
  const [file, setFile] = useState<string>(initialFile ?? ACTIVE_FILE);
  const [limit, setLimit] = useState(200);
  const [page, setPage] = useState(() =>
    initialPacket != null ? Math.max(0, Math.floor((initialPacket - 1) / 200)) : 0
  );
  const [data, setData] = useState<CapturePacketsResponse | null>(null);
  const [selected, setSelected] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState("");
  const [protoFilter, setProtoFilter] = useState<ProtoFilter>("all");
  const [deep, setDeep] = useState<DeepLink | null>(() => {
    const s = searchParams.get("src") || searchParams.get("dst") ||
      searchParams.get("proto") || searchParams.get("sport") || searchParams.get("dport");
    if (!s) return null;
    return {
      src: searchParams.get("src") ?? undefined,
      dst: searchParams.get("dst") ?? undefined,
      proto: searchParams.get("proto") ?? undefined,
      sport: intOrUndef(searchParams.get("sport")),
      dport: intOrUndef(searchParams.get("dport")),
    };
  });
  const [pendingIdx, setPendingIdx] = useState<number | null>(
    initialPacket != null ? initialPacket - 1 : null
  );
  const [pendingDeep, setPendingDeep] = useState<boolean>(deep != null && initialPacket == null);
  const [jump, setJump] = useState("");

  const refreshFiles = useCallback(async () => {
    try {
      const [a, i] = await Promise.all([api.activeCapture(), api.captures()]);
      setActive(a);
      setIncidents(i.files);
    } catch {
      /* backend offline — keep previous state */
    }
  }, []);

  useEffect(() => {
    refreshFiles();
    const t = window.setInterval(refreshFiles, 15000);
    return () => window.clearInterval(t);
  }, [refreshFiles]);

  const loadPackets = useCallback(
    async (target: string, pageNo: number, size: number, keep?: boolean) => {
      setBusy(true);
      setError(null);
      try {
        const res = await api.capturePackets(target, size, pageNo * size, {
          q: q.trim() || undefined,
          src: deep?.src,
          dst: deep?.dst,
          proto: deep?.proto ?? (protoFilter === "all" ? undefined : protoFilter),
          sport: deep?.sport,
          dport: deep?.dport,
        });
        setData(res);
        setSelected((sel) => (keep && res.packets[sel] ? sel : 0));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load packets");
        setData(null);
      } finally {
        setBusy(false);
      }
    },
    [q, protoFilter, deep]
  );

  useEffect(() => {
    loadPackets(file, page, limit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file, page, limit, q, protoFilter, deep]);

  // Live mode: while viewing the live buffer with no search/proto filter
  // active, keep the packet list self-refreshing like a live Wireshark view.
  const busyRef = useRef(false);
  useEffect(() => {
    busyRef.current = busy;
  }, [busy]);
  const autoLive =
    view === "active" && file === ACTIVE_FILE && !q && protoFilter === "all" && !deep;
  useEffect(() => {
    if (!autoLive) return;
    const t = window.setInterval(() => {
      if (!busyRef.current) loadPackets(file, page, limit, true);
    }, 5000);
    return () => window.clearInterval(t);
  }, [autoLive, file, page, limit, loadPackets]);

  // After a page arrives: land on the requested packet (deep-linked flow or
  // jump-to-#). It may live on another page — jump there and re-select.
  useEffect(() => {
    if (!data) return;
    if (pendingIdx != null) {
      const pos = data.packets.findIndex((p) => p.idx === pendingIdx);
      if (pos >= 0) {
        setSelected(pos);
        setPendingIdx(null);
        return;
      }
      const targetPage = Math.max(0, Math.floor(pendingIdx / limit));
      if (targetPage !== page) {
        setPage(targetPage);
      } else {
        setPendingIdx(null);
        setSelected(0);
      }
      return;
    }
    if (pendingDeep && data.offset === 0) {
      const first = data.packets[0];
      setPendingDeep(false);
      if (first && first.idx != null && first.idx >= limit) {
        setPendingIdx(first.idx);
      } else {
        setSelected(0);
      }
    }
  }, [data, pendingIdx, pendingDeep, limit, page]);

  const pickFile = (name: string) => {
    setSelected(0);
    setPage(0);
    setQ("");
    setProtoFilter("all");
    setDeep(null);
    setPendingIdx(null);
    setPendingDeep(false);
    setFile(name);
  };

  const onSearch = (v: string) => {
    setQ(v);
    setDeep(null);
    setPage(0);
    setPendingIdx(null);
  };

  const onProto = (p: ProtoFilter) => {
    setProtoFilter(p);
    setDeep(null);
    setPage(0);
    setPendingIdx(null);
  };

  const goToPacket = () => {
    const n = parseInt(jump, 10);
    if (!Number.isFinite(n) || n < 1) return;
    const idx = n - 1;
    setPendingIdx(idx);
    setPage(Math.max(0, Math.floor(idx / limit)));
    setJump("");
  };

  const totalPages = data ? Math.max(1, Math.ceil(data.total / limit)) : 1;
  const canPrev = page > 0;
  const canNext = data ? page + 1 < totalPages : false;

  const protosInPage = useMemo(() => {
    const s = new Set<string>();
    (data?.packets ?? []).forEach((p) => s.add(p.proto));
    return s;
  }, [data]);

  const packet = data && selected != null ? data.packets[selected] ?? null : null;

  const showOffset = data ? data.offset : 0;

  const loadedInfo =
    view === "active"
      ? `current.pcap${active?.mtime
          ? ` · ${fmtBytes(active.size)} · updated ${new Date(active.mtime * 1000).toLocaleTimeString()}`
          : ""}`
      : (incidents.find((x) => x.path.replace(/^captures\//, "") === file)?.name ??
          file.split("/").pop() ??
          file);

  return (
    <div className="p-5 md:p-6 max-w-[1500px] mx-auto">
      <PageHeader
        title="Packet Inspector"
        subtitle="Wireshark-style evidence viewer — page through a capture, filter, and click any packet to inspect its frame decode"
        actions={
          <button
            type="button"
            onClick={() => loadPackets(file, page, limit)}
            disabled={busy}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12px] font-medium text-[#CBD5E1] bg-white/[0.05] border border-white/[0.08] hover:bg-white/[0.1] disabled:opacity-50 transition-colors"
          >
            <RefreshCw size={13} className={cn(busy && "animate-spin")} />
            Refresh
          </button>
        }
      />

      <div className="grid grid-cols-1 xl:grid-cols-[300px_minmax(0,1fr)] gap-4 items-start">
        {/* Source picker + filters */}
        <Card
          title="Capture source"
          subtitle="Live buffer or archived incident evidence"
          className="xl:sticky xl:top-4"
        >
          <div className="flex flex-col gap-4">
            <div className="flex gap-1 rounded-lg p-0.5 bg-white/[0.04] border border-white/[0.07]">
              {(["active", "incidents"] as View[]).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setView(v)}
                  className={cn(
                    "flex-1 h-8 rounded-md text-[11.5px] font-semibold uppercase tracking-wider transition-colors",
                    view === v
                      ? "accent-gradient glow-violet text-white"
                      : "text-[#64748B] hover:text-[#CBD5E1]"
                  )}
                >
                  {v === "active" ? "Live buffer" : "Incidents"}
                </button>
              ))}
            </div>

            {view === "active" ? (
              <button
                type="button"
                onClick={() => pickFile(ACTIVE_FILE)}
                className={cn(
                  "flex items-center gap-3 rounded-xl border p-3 text-left transition-colors",
                  file === ACTIVE_FILE
                    ? "border-[#A78BFA]/40 bg-[#A78BFA]/[0.06]"
                    : "border-white/[0.07] hover:border-white/[0.14]"
                )}
              >
                <span className="w-2 h-2 rounded-full bg-[#6BCB77] live-source shrink-0" />
                <span className="min-w-0 flex-1">
                  <span className="block text-[12.5px] font-semibold text-[#CBD5E1]">
                    current.pcap
                  </span>
                  <span className="block text-[11px] text-[#64748B] tabular-nums">
                    {active?.exists
                      ? `${fmtBytes(active.size)} · ${new Date((active.mtime ?? 0) * 1000).toLocaleTimeString()}`
                      : "not writing yet"}
                  </span>
                </span>
                <span className="text-[10px] uppercase tracking-wider text-[#6BCB77]">
                  live
                </span>
              </button>
            ) : (
              <div className="flex flex-col gap-1.5 max-h-[300px] overflow-y-auto pr-1">
                {incidents.length === 0 ? (
                  <p className="text-[12px] text-[#64748B] py-3 text-center">
                    No preserved incident captures yet.
                  </p>
                ) : (
                  incidents.map((f) => {
                    const rel = f.path.replace(/^captures\//, "");
                    const isSel = file === rel;
                    return (
                      <button
                        key={f.path}
                        type="button"
                        onClick={() => pickFile(rel)}
                        className={cn(
                          "flex items-center gap-2 rounded-lg border px-2.5 py-2 text-left transition-colors",
                          isSel
                            ? "border-[#A78BFA]/40 bg-[#A78BFA]/[0.06]"
                            : "border-white/[0.06] hover:border-white/[0.12]"
                        )}
                      >
                        <FileSearch size={14} className="shrink-0 text-[#64748B]" />
                        <span className="min-w-0 flex-1">
                          <span className="block text-[11.5px] font-medium text-[#CBD5E1] truncate font-mono">
                            {f.name}
                          </span>
                          <span className="block text-[10.5px] text-[#64748B] tabular-nums">
                            {fmtBytes(f.size)}
                          </span>
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            )}

            {/* Filters — applied across ALL packets before paging */}
            <div className="border-t border-white/[0.06] pt-3 flex flex-col gap-2.5">
              <p className="text-[10px] uppercase tracking-[0.14em] text-[#475569]">
                Search capture
              </p>
              <div className="flex items-center gap-2 h-9 px-3 rounded-lg bg-white/[0.03] border border-white/[0.08] focus-within:border-[#7C5CFC]/50 transition-colors">
                <Search size={13} className="text-[#64748B] shrink-0" strokeWidth={2} />
                <input
                  value={q}
                  onChange={(e) => onSearch(e.target.value)}
                  placeholder="IP, port, flags, info…"
                  className="bg-transparent border-none outline-none text-[12.5px] text-white placeholder:text-[#475569] flex-1 min-w-0"
                  aria-label="Search all packets"
                />
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {(["all", "tcp", "udp", "icmp"] as ProtoFilter[]).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => onProto(p)}
                    className={cn(
                      "px-2.5 h-7 rounded-md text-[11px] font-semibold uppercase tracking-wider transition-colors",
                      protoFilter === p
                        ? "bg-white/[0.1] text-white border border-white/[0.14]"
                        : "text-[#64748B] hover:text-[#CBD5E1] border border-white/[0.06]",
                      p !== "all" && !protosInPage.has(p) && "opacity-40"
                    )}
                  >
                    {p === "all" ? "All" : p}
                  </button>
                ))}
              </div>
              {(q || protoFilter !== "all" || deep) && data && (
                <div className="flex items-center justify-between text-[11px] text-[#64748B]">
                  <span className="truncate">
                    {data.total} {data.total === 1 ? "packet" : "packets"} match
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setQ("");
                      setProtoFilter("all");
                      setDeep(null);
                      setPage(0);
                      setPendingIdx(null);
                    }}
                    className="text-[#A78BFA] hover:text-[#C4B5FD] font-medium shrink-0 ml-2"
                  >
                    Reset
                  </button>
                </div>
              )}
            </div>

            {/* Paging */}
            <div className="flex items-center justify-between pt-1 border-t border-white/[0.06]">
              <label className="text-[11.5px] text-[#64748B] flex items-center gap-1">
                Rows
                <select
                  value={limit}
                  onChange={(e) => {
                    const n = Number(e.target.value);
                    setLimit(n);
                    setPage(0);
                  }}
                  className="ml-1 bg-[#12141F] border border-white/[0.1] rounded-md text-[11.5px] px-1.5 py-0.5 text-[#CBD5E1]"
                >
                  {PAGE_SIZES.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  value={jump}
                  onChange={(e) => setJump(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && goToPacket()}
                  inputMode="numeric"
                  placeholder="Go to #"
                  aria-label="Jump to packet number"
                  className="w-24 h-8 px-2 rounded-lg text-[11.5px] bg-white/[0.03] border border-white/[0.08] text-[#CBD5E1] placeholder:text-[#475569] outline-none focus:border-[#7C5CFC]/50"
                />
                <button
                  type="button"
                  onClick={goToPacket}
                  className="inline-flex items-center gap-1 h-8 px-2 rounded-lg text-[11.5px] font-medium text-[#94A3B8] bg-white/[0.03] border border-white/[0.07] hover:text-white transition-colors"
                  aria-label="Go to packet"
                >
                  <CornerDownLeft size={13} />
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={!canPrev || busy}
                className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg text-[11.5px] font-medium text-[#94A3B8] bg-white/[0.03] border border-white/[0.07] hover:text-white disabled:opacity-40 transition-colors"
              >
                <ChevronLeft size={14} /> Prev
              </button>
              <span className="text-[11px] text-[#64748B] tabular-nums whitespace-nowrap">
                {data ? `page ${page + 1} / ${totalPages}` : "—"}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={!canNext || busy}
                className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg text-[11.5px] font-medium text-[#94A3B8] bg-white/[0.03] border border-white/[0.07] hover:text-white disabled:opacity-40 transition-colors"
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </Card>

        {/* Right column: packet list + frame details */}
        <div className="flex flex-col gap-4 min-w-0">
          <Card
            title="Packets"
            subtitle={
              data
                ? `${loadedInfo} · ${fmtNumber(data.total)} total · rows ${showOffset + 1}–${showOffset + data.packets.length}`
                : "Loading capture — pick a source on the left"
            }
            action={
              autoLive && data ? (
                <span
                  className="inline-flex items-center gap-1.5 text-[10.5px] font-semibold text-[#6BCB77] tracking-wide"
                  title="Auto-refreshing the live buffer every 5s — pause by searching or switching source"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#6BCB77] live-source animate-pulse" />
                  LIVE · 5s
                </span>
              ) : undefined
            }
          >
            {error ? (
              <div className="py-10">
                <EmptyState title="Capture unavailable" hint={error} />
              </div>
            ) : !data ? (
              <div className="py-10">
                <EmptyState
                  title={busy ? "Reading capture…" : "Choose a capture source"}
                  hint="Packet frames appear here as the capture is read off disk."
                />
              </div>
            ) : data.packets.length === 0 ? (
              <div className="py-10">
                {autoLive ? (
                  <EmptyState
                    mode="empty"
                    icon={Inbox}
                    title="Waiting for live capture"
                    hint="No packets recorded in the live buffer yet — frames appear here automatically as the engine captures them."
                  />
                ) : (
                  <EmptyState
                    mode="empty"
                    icon={Inbox}
                    title="No packets match"
                    hint="The capture has no recorded packets for these filters yet."
                  />
                )}
              </div>
            ) : (
              <div className="overflow-x-auto overflow-y-auto max-h-[46vh] -mx-5 -mb-5">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 bg-[#12141F] z-10">
                    <tr className="text-[10px] uppercase tracking-[0.12em] text-[#475569]">
                      <th className="px-4 py-2 font-semibold">#</th>
                      <th className="px-2 py-2 font-semibold">Time</th>
                      <th className="px-2 py-2 font-semibold">Source</th>
                      <th className="px-2 py-2 font-semibold">Destination</th>
                      <th className="px-2 py-2 font-semibold">Proto</th>
                      <th className="px-2 py-2 font-semibold">Len</th>
                      <th className="px-2 py-2 font-semibold">Flags</th>
                      <th className="px-2 py-2 font-semibold">Info</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.packets.map((pkt, idx) => (
                      <tr
                        key={idx}
                        onClick={() => setSelected(idx)}
                        className={cn(
                          "text-[12px] border-t border-white/[0.04] cursor-pointer hover:bg-white/[0.03] transition-colors",
                          selected === idx &&
                            "bg-[#7C5CFC]/[0.16] hover:bg-[#7C5CFC]/[0.2]"
                        )}
                      >
                        <td className="px-4 py-1.5 text-[#475569] tabular-nums">
                          {data.offset + idx + 1}
                        </td>
                        <td className="px-2 py-1.5 text-[#94A3B8] tabular-nums whitespace-nowrap">
                          {fmtPktTime(pkt)}
                        </td>
                        <td className="px-2 py-1.5 font-mono text-[#CBD5E1] whitespace-nowrap">{pkt.src}</td>
                        <td className="px-2 py-1.5 font-mono text-[#CBD5E1] whitespace-nowrap">{pkt.dst}</td>
                        <td className="px-2 py-1.5">
                          <ProtoPill proto={pkt.proto} />
                        </td>
                        <td className="px-2 py-1.5 text-[#94A3B8] tabular-nums">{pkt.len}</td>
                        <td className="px-2 py-1.5 font-mono text-[#64748B]">{pkt.flags || "·"}</td>
                        <td className="px-2 py-1.5 text-[#64748B] truncate max-w-[260px]">
                          {pkt.summary}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card
            title="Frame details"
            subtitle={
              packet
                ? `Packet #${data ? data.offset + selected + 1 : ""} · ${packet.src}:${packet.sport ?? "—"} → ${packet.dst}:${packet.dport ?? "—"}`
                : "Select a packet row above to inspect its protocol decode and raw bytes"
            }
          >
            {packet ? (
              <PacketDecode packet={packet} />
            ) : (
              <div className="py-6 flex flex-col items-center gap-2 text-center">
                <FileSearch size={20} className="text-[#334155]" />
                <p className="text-[12px] text-[#64748B] max-w-[360px]">
                  Click any packet in the list above — the decode tree and hex
                  dump update instantly, Wireshark-style.
                </p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

function ProtoPill({ proto }: { proto: string }) {
  const color =
    proto === "tcp" ? "text-[#38BDF8] bg-[#38BDF8]/10" :
    proto === "udp" ? "text-[#FFD93D] bg-[#FFD93D]/10" :
    proto === "icmp" ? "text-[#6BCB77] bg-[#6BCB77]/10" :
    "text-[#94A3B8] bg-white/[0.06]";
  return (
    <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider", color)}>
      {proto}
    </span>
  );
}

function fmtPktTime(p: CapturePacket): string {
  if (!p.time) return "—";
  const t = new Date(p.time * 1000);
  const ms = Math.floor((p.time % 1) * 1000);
  return `${t.toLocaleTimeString("en-US", { hour12: false })}.${String(ms).padStart(3, "0")}`;
}

function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function fmtNumber(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

function PacketDecode({ packet }: { packet: CapturePacket }) {
  const decode = packet.decode;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-start">
      {/* Decoded tree */}
      <div className="min-w-0 text-[12px] leading-relaxed">
        <TreeLabel label={`Frame ${packet.len} bytes (Ethernet + IP)`} depth={0} open>
          {decode?.ip && (
            <>
              <TreeLabel label={`Internet Protocol Version ${decode.ip.version}, Src: ${decode.ip.src}, Dst: ${decode.ip.dst}`} depth={1} open>
                <TreeKV k="Version" v={String(decode.ip.version)} depth={2} />
                <TreeKV k="Header length" v={`${decode.ip.header_len_bytes} bytes`} depth={2} />
                <TreeKV k="TOS / DSCP" v={String(decode.ip.tos)} depth={2} />
                <TreeKV k="TTL" v={String(decode.ip.ttl)} depth={2} />
                <TreeKV k="Protocol" v={protoName(decode.ip.protocol)} depth={2} />
              </TreeLabel>
            </>
          )}
          {decode?.tcp && (
            <TreeLabel
              label={`Transmission Control Protocol, Src Port: ${decode.tcp.src_port}, Dst Port: ${decode.tcp.dst_port}`}
              depth={1}
              open
            >
              <TreeKV k="Source Port" v={String(decode.tcp.src_port)} depth={2} />
              <TreeKV k="Destination Port" v={String(decode.tcp.dst_port)} depth={2} />
              <TreeKV k="Sequence" v={String(decode.tcp.seq)} depth={2} />
              <TreeKV k="Acknowledgment" v={String(decode.tcp.ack)} depth={2} />
              <TreeKV k="Flags" v={decode.tcp.flags || "—"} depth={2} />
              <TreeKV k="Window" v={String(decode.tcp.window)} depth={2} />
              {decode.tcp.checksum && <TreeKV k="Checksum" v={decode.tcp.checksum} depth={2} />}
            </TreeLabel>
          )}
          {decode?.udp && (
            <TreeLabel
              label={`User Datagram Protocol, Src Port: ${decode.udp.src_port}, Dst Port: ${decode.udp.dst_port}`}
              depth={1}
              open
            >
              <TreeKV k="Source Port" v={String(decode.udp.src_port)} depth={2} />
              <TreeKV k="Destination Port" v={String(decode.udp.dst_port)} depth={2} />
              <TreeKV k="Length" v={`${decode.udp.length} bytes`} depth={2} />
              {decode.udp.checksum && <TreeKV k="Checksum" v={decode.udp.checksum} depth={2} />}
            </TreeLabel>
          )}
          {decode?.icmp && (
            <TreeLabel label={`Internet Control Message Protocol`} depth={1} open>
              <TreeKV k="Type" v={String(decode.icmp.type)} depth={2} />
              <TreeKV k="Code" v={String(decode.icmp.code)} depth={2} />
              {decode.icmp.checksum && <TreeKV k="Checksum" v={decode.icmp.checksum} depth={2} />}
            </TreeLabel>
          )}
          {decode?.payload_len != null && (
            <TreeLabel label={`Payload (${decode.payload_len} bytes)`} depth={1} open>
              {decode.payload_preview && (
                <TreeKV k="ASCII preview" v={JSON.stringify(decode.payload_preview)} depth={2} />
              )}
            </TreeLabel>
          )}
        </TreeLabel>
      </div>

      {/* Hex dump */}
      <HexDump hex={packet.hex ?? ""} len={packet.len} />
    </div>
  );
}

function TreeLabel({
  label,
  depth,
  open,
  children,
}: {
  label: string;
  depth: number;
  open?: boolean;
  children?: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(open ?? false);
  return (
    <div>
      <div
        className="flex items-center gap-1.5 cursor-pointer select-none"
        style={{ paddingLeft: depth * 14 }}
        onClick={() => setIsOpen((v) => !v)}
      >
        <ChevronRight
          size={12}
          className={cn("text-[#475569] transition-transform shrink-0", isOpen && "rotate-90")}
        />
        <span className={cn(depth === 0 ? "text-white font-semibold" : "text-[#CBD5E1]", "break-all")}>
          {label}
        </span>
      </div>
      {isOpen && children}
    </div>
  );
}

function TreeKV({ k, v, depth }: { k: string; v: string; depth: number }) {
  return (
    <div className="flex items-baseline gap-2" style={{ paddingLeft: depth * 14 + 18 }}>
      <span className="text-[#64748B] shrink-0">{k}:</span>
      <span className="text-[#38BDF8] font-mono text-[11.5px] break-all">{v}</span>
    </div>
  );
}

function protoName(n: number): string {
  return ["", "icmp", "", "", "", "", "tcp", "", "", "", "", "", "", "", "", ""][n] ?? String(n);
}

function HexDump({ hex, len }: { hex: string; len: number }) {
  const rows = useMemo(() => {
    const bytes = hex.match(/.{1,2}/g) ?? [];
    const out: { addr: string; hexStr: string; ascii: string }[] = [];
    for (let i = 0; i < bytes.length; i += 16) {
      const chunk = bytes.slice(i, i + 16);
      const ascii = chunk
        .map((b) => {
          const c = parseInt(b, 16);
          return c >= 32 && c < 127 ? String.fromCharCode(c) : ".";
        })
        .join("");
      out.push({
        addr: (i).toString(16).padStart(4, "0"),
        hexStr: chunk.join(" "),
        ascii,
      });
    }
    return out;
  }, [hex]);

  return (
    <div className="min-w-0 overflow-x-auto rounded-lg border border-white/[0.06] bg-[#0B0B17]">
      <div className="flex items-center justify-between px-2.5 py-2 border-b border-white/[0.05]">
        <p className="text-[11px] uppercase tracking-[0.12em] text-[#475569]">
          Raw bytes {hex ? `(${hex.length / 2} B)` : ""}
        </p>
        <span className="text-[10.5px] text-[#64748B] tabular-nums">frame {len} bytes</span>
      </div>
      {rows.length === 0 ? (
        <p className="text-[12px] text-[#64748B] px-3 py-4">No hex payload available.</p>
      ) : (
        <div className="max-h-[380px] overflow-auto">
          <table className="w-full text-left">
            <thead className="sticky top-0 bg-[#0B0B17]">
              <tr className="text-[10px] text-[#475569] uppercase tracking-wider">
                <th className="px-2 py-1.5 font-semibold">Offset</th>
                <th className="px-2 py-1.5 font-semibold">Bytes</th>
                <th className="px-2 py-1.5 font-semibold">ASCII</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.addr} className="font-mono text-[11.5px] border-t border-white/[0.04]">
                  <td className="px-2 py-1 text-[#475569]">{r.addr}</td>
                  <td className="px-2 py-1 text-[#CBD5E1] whitespace-nowrap">{r.hexStr}</td>
                  <td className="px-2 py-1 text-[#64748B] whitespace-nowrap">{r.ascii}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}