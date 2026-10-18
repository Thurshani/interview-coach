import {
  Laptop,
  Database,
  CalendarDays,
  BriefcaseBusiness,
  PenTool,
  Megaphone,
} from "lucide-react";
export const roles = [
  ["Software Engineer", Laptop],
  ["Data Scientist", Database],
  ["Product Manager", CalendarDays],
  ["MBA / Management", BriefcaseBusiness],
  ["UI/UX Designer", PenTool],
  ["Marketing", Megaphone],
];
export function Brand() {
  return (
    <div className="brand">
      <div
        className="logo"
        aria-hidden="true"
      >
        ✧
      </div>
      <div>Interview Coach</div>
    </div>
  );
}
