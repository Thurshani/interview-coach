import {
  Settings,
  MessageSquare,
  ChartNoAxesCombined,
  Menu,
  X,
  ArrowLeft,
} from "lucide-react";
import { Brand } from "./Icons";
export default function Sidebar({ page, onNavigate, open, setOpen, busy }) {
  const nav = [
    ["setup", "Interview setup", Settings],
    ["interview", "Mock interview", MessageSquare],
    ["report", "Performance report", ChartNoAxesCombined],
  ];
  return (
    <>
      <div className="mobilebar">
        <button
          type="button"
          aria-label="Open navigation"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          <Menu size={19} />
        </button>
        <span>Interview Coach</span>
      </div>
      {open && (
        <button
          className="shade open"
          aria-label="Close navigation"
          onClick={() => setOpen(false)}
        />
      )}
      <aside className={open ? "open" : ""}>
        <Brand />
        <button
          className="closemenu"
          aria-label="Close menu"
          onClick={() => setOpen(false)}
        >
          <X size={20} />
        </button>
        <div className="navlabel">WORKSPACE</div>
        <nav>
          {nav.map(([id, label, Icon]) => (
            <button
              className={"nav " + (page === id ? "active" : "")}
              key={id}
              onClick={() => onNavigate(id)}
            >
              <Icon size={18} />
              {label}
              {id === "interview" && <span>05</span>}
            </button>
          ))}
        </nav>
        <div className="asidebottom">
          <div className="help">
            <strong>Interview practice</strong>Prepare for your next interview.
          </div>
          <button
            className="quiet homebutton"
            disabled={busy}
            onClick={() => onNavigate("home")}
          >
            <ArrowLeft size={14} /> Home
          </button>
        </div>
      </aside>
    </>
  );
}
