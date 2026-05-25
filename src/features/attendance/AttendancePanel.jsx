import { useState } from "react";
import { AnimatePresence, motion as Motion } from "framer-motion";
import { useAttendance } from "./hooks/useAttendance";
import { useAdminAuth } from "./hooks/useAdminAuth";
import AttendanceEntry from "./components/AttendanceEntry";
import AttendanceStaffMode from "./components/AttendanceStaffMode";
import AttendanceAdminAuth from "./components/AttendanceAdminAuth";
import AttendanceAdminList from "./components/AttendanceAdminList";
import AttendanceStaffDetail from "./components/AttendanceStaffDetail";
import AttendanceEdit from "./components/AttendanceEdit";

// 근태관리 진입점 — 관리 탭에 마운트되어 6개 화면을 내부에서 전환한다.
// onExit: 진입 화면에서 뒤로 → 관리 메뉴로 복귀
export default function AttendancePanel({ storeId, onExit }) {
  const attendance = useAttendance(storeId);
  const { authed } = useAdminAuth();

  const [screen, setScreen] = useState("entry");
  const [adminUnlocked, setAdminUnlocked] = useState(authed);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [editTarget, setEditTarget] = useState(null); // { workDate, record }

  const goAdmin = () => setScreen(adminUnlocked ? "list" : "auth");

  if (!storeId) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "rgba(255,255,255,0.4)", fontSize: 13 }}>
        매장 정보를 불러오는 중이에요…
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      <Motion.div
        key={screen}
        initial={{ opacity: 0, x: 12 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -12 }}
        transition={{ duration: 0.2 }}
      >
        {screen === "entry" && (
          <AttendanceEntry
            onStaff={() => setScreen("staff")}
            onAdmin={goAdmin}
            onBack={onExit}
          />
        )}

        {screen === "staff" && (
          <AttendanceStaffMode
            staff={attendance.staff}
            openByStaff={attendance.openByStaff}
            todayByStaff={attendance.todayByStaff}
            busy={attendance.busy}
            onPunchIn={attendance.punchIn}
            onPunchOut={attendance.punchOut}
            onBack={() => setScreen("entry")}
          />
        )}

        {screen === "auth" && (
          <AttendanceAdminAuth
            onBack={() => setScreen("entry")}
            onSuccess={() => {
              setAdminUnlocked(true);
              setScreen("list");
            }}
          />
        )}

        {screen === "list" && (
          <AttendanceAdminList
            storeId={storeId}
            staff={attendance.staff}
            openByStaff={attendance.openByStaff}
            workingCount={attendance.workingCount}
            busy={attendance.busy}
            onAddStaff={(name) => attendance.addStaff({ name })}
            onSelectStaff={(s) => {
              setSelectedStaff(s);
              setScreen("detail");
            }}
            onBack={() => setScreen("entry")}
          />
        )}

        {screen === "detail" && selectedStaff && (
          <AttendanceStaffDetail
            storeId={storeId}
            staff={selectedStaff}
            openByStaff={attendance.openByStaff}
            busy={attendance.busy}
            onRemoveStaff={attendance.removeStaff}
            onBack={() => setScreen("list")}
            onEdit={(target) => {
              setEditTarget(target);
              setScreen("edit");
            }}
          />
        )}

        {screen === "edit" && selectedStaff && editTarget && (
          <AttendanceEdit
            staff={selectedStaff}
            workDate={editTarget.workDate}
            record={editTarget.record}
            busy={attendance.busy}
            onSave={attendance.saveRecord}
            onDelete={attendance.deleteRecord}
            onBack={() => setScreen("detail")}
          />
        )}
      </Motion.div>
    </AnimatePresence>
  );
}
