import { FileText, Download, ExternalLink } from "lucide-react";
import { PageHeader } from "../components/layout/PageHeader";
import { Button } from "../components/ui/Button";

interface Report {
  title: string;
  desc: string;
  time: string;
}

const reports: Report[] = [
  { title: "Daily Threat Report", desc: "Summary of threats detected over the last 24 hours.", time: "Updated 2h ago" },
  { title: "Weekly SOC Summary", desc: "Weekly security operations center activity overview.", time: "Updated 2d ago" },
  { title: "Network Risk Assessment", desc: "Risk posture across all unidirectional traffic flows.", time: "Updated 3d ago" },
  { title: "AI Detection Performance", desc: "Model accuracy, precision, recall and confidence metrics.", time: "Updated weekly" },
  { title: "Incident Summary", desc: "Chronological record of security incidents and resolutions.", time: "Updated daily" },
];

export default function Reports() {
  return (
    <div className="p-6 space-y-6">
      <PageHeader title="Security Reports" subtitle="Generated security intelligence reports for the UniShield AI platform." />

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {reports.map((r) => (
          <div key={r.title} className="group bg-[#0E1324] rounded-xl border border-white/[0.05] card-shadow p-5 hover:bg-[#101731] transition-colors">
            <div className="flex items-start justify-between">
              <div className="w-10 h-10 rounded-lg bg-[#4F46E5]/15 flex items-center justify-center text-[#818CF8]">
                <FileText size={18} strokeWidth={1.75} />
              </div>
              <button className="text-[#64748B] hover:text-[#94A3B8] transition-colors">
                <Download size={16} />
              </button>
            </div>
            <h3 className="text-[14.5px] font-semibold text-white mt-4">{r.title}</h3>
            <p className="text-[12.5px] text-[#94A3B8] mt-1.5 leading-snug">{r.desc}</p>
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/[0.05]">
              <span className="text-[11px] text-[#64748B]">{r.time}</span>
              <Button variant="secondary" size="sm">
                <ExternalLink size={13} /> Generate
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
